"""Read the dedicated secret once, keep it in memory, pipe to the E2E controller.

No credential payload in shell, argv, env, files, outputs, artifacts or errors.
Google's ephemeral external-account configuration is distinct from this payload.
"""
import base64
import json
import os
from pathlib import Path
import resource
import signal
import subprocess
import sys
import tempfile

import cd_release as release
import wif_submission as proof
import candidate_result as result_contract

E2E_SA = f'workout-journal-e2e@{proof.PROJECT}.iam.gserviceaccount.com'
E2E_PROVIDER = proof.PROVIDER + '-e2e'
CHILD_FAILURES = {20: 'E2E_SCENARIO_FAILED', 21: 'E2E_CLEANUP_UNPROVEN',
                  22: 'E2E_EVIDENCE_REJECTED'}
PUBLIC_FAILURES = {*CHILD_FAILURES.values(), 'E2E_CHILD_INTERRUPTED',
                   'E2E_RESULT_UNAVAILABLE', 'E2E_CHILD_RESULT_MISMATCH'}


def crc32c(data):
    crc = 0xffffffff
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (0x82f63b78 if crc & 1 else 0)
    return crc ^ 0xffffffff


def access_secret(ref):
    proof.require(ref['project'] == proof.PROJECT and ref['name'] == release.E2E_SECRET and
                  proof.matches(r'[1-9][0-9]{0,19}', ref['version']), 'E2E_SECRET_REFERENCE_INVALID')
    name = f"projects/{proof.PROJECT}/secrets/{release.E2E_SECRET}/versions/{ref['version']}"
    token = proof.command(['gcloud', 'auth', 'print-access-token', '--quiet'], 'TOKEN_UNAVAILABLE').decode().strip()
    raw = release.http('https://secretmanager.googleapis.com/v1/' + name + ':access',
                       token=token, code='E2E_SECRET_ACCESS_FAILED')
    proof.require(raw.get('name') in {name, name.replace('/' + proof.PROJECT + '/', '/' + proof.PROJECT_NUMBER + '/')},
                  'E2E_SECRET_RESPONSE_MISMATCH')
    data = bytearray(base64.b64decode(raw['payload']['data'], validate=True))
    try:
        proof.require(len(data) <= 512 and str(crc32c(data)) == str(raw['payload']['dataCrc32c']),
                      'E2E_SECRET_CHECKSUM_MISMATCH')
        value = data.decode('utf8')
        proof.require(proof.matches(r'sb_secret_[A-Za-z0-9_-]{10,256}', value), 'E2E_SECRET_FORMAT_INVALID')
        return value
    finally:
        data[:] = b'\0' * len(data)


def child_environment(env, m, filename, result_file):
    authority = release.proof.release_context(env)
    allowed = ['PATH', 'HOME', 'TMPDIR', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_REF',
               'GITHUB_SHA', 'GITHUB_WORKFLOW_SHA', 'GITHUB_WORKFLOW_REF', 'GITHUB_EVENT_NAME',
               'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']
    return {**{k: env[k] for k in allowed if k in env},
            'CD_MODE': authority['mode'], 'CD_SOURCE_SHA': authority['sourceSha'],
            'CD_CI_RUN_ID': authority['ciRunId'], 'CD_CI_RUN_ATTEMPT': authority['ciRunAttempt'],
            'E2E_SECRET_VERSION': authority['e2eSecretVersion'],
            'E2E_TARGET': 'candidate:' + m['candidateId'], 'E2E_TARGET_MANIFEST': str(filename),
            'E2E_RESULT_FILE': str(result_file),
            'E2E_MANIFEST_SHA256': env['CD_MANIFEST_HASH'], 'TZ': 'Asia/Tokyo',
            'PLAYWRIGHT_NO_COPY_PROMPT': '1', 'NEXT_TELEMETRY_DISABLED': '1'}


def controller(env, m, secret):
    # Private metadata file only. Never write the stdin document or its value.
    with tempfile.TemporaryDirectory(prefix='cd-e2e-manifest-', dir=env['RUNNER_TEMP']) as temp:
        filename = Path(temp) / 'manifest.json'
        fd = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(env['CD_MANIFEST'])
        result_file = Path(temp) / 'result.json'
        fd = os.open(result_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        expected_stat = os.fstat(fd)
        os.close(fd)
        # A durable locator exists before the child can create application data.
        # The UUID is reconstructible; it and private receipt fields are never logged.
        print('CD-C3 recovery handle: ' + release.canonical({
            k: result_contract.initial(m, env['CD_MANIFEST_HASH'])[k]
            for k in ('candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'manifestHash', 'recoveryHandle')}), flush=True)
        payload = json.dumps({'secretRef': m['e2eSecret'], 'value': secret}).encode()
        child = subprocess.Popen(['node', 'e2e/candidate-run.mjs'], cwd=release.ROOT,
                                 env=child_environment(env, m, filename, result_file),
                                 stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        interrupted = False

        def stop(signum, frame):
            nonlocal interrupted
            interrupted = True
            child.terminate()

        previous = {s: signal.signal(s, stop) for s in (signal.SIGTERM, signal.SIGINT)}
        try:
            try:
                child.communicate(input=payload, timeout=600)
            except subprocess.TimeoutExpired:
                interrupted = True
                child.terminate()
                try:
                    child.communicate(timeout=120)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.communicate()
            # Read and publish validated sub-results BEFORE interpreting a failed exit.
            try:
                result = result_contract.read(result_file, expected_stat, m, env['CD_MANIFEST_HASH'])
            except proof.GateError as error:
                result = result_contract.initial(m, env['CD_MANIFEST_HASH'])
                result_contract.set_failure(result, str(error))
                result_contract.publish(result, m, env['CD_MANIFEST_HASH'], env)
                raise proof.GateError('E2E_RESULT_UNAVAILABLE') from None
            diagnostic = None
            if interrupted:
                result_contract.set_failure(result, 'CHILD_INTERRUPTED')
                diagnostic = 'E2E_CHILD_INTERRUPTED'
            elif child.returncode != result_contract.exit_code(result):
                result_contract.set_failure(result, 'CHILD_EXIT_MISMATCH')
                diagnostic = 'E2E_CHILD_RESULT_MISMATCH'
            result_contract.publish(result, m, env['CD_MANIFEST_HASH'], env)
            proof.require(diagnostic is None, diagnostic)
            proof.require(child.returncode == 0, CHILD_FAILURES.get(child.returncode, 'E2E_CHILD_RESULT_MISMATCH'))
            return result
        finally:
            for s, handler in previous.items():
                signal.signal(s, handler)
            payload = b''  # Never forward child stdout/stderr, even on success.


def preflight(env):
    """Bind caller/event, manifest, CI pins and current source before OIDC.

    The trusted CD caller already queried the fixed CI attempt. This stage uses
    its bound manifest/outputs and public Git reads only, never cloud credentials.
    """
    m = release.input_manifest(env)
    proof.check_source(release.ROOT, m['sourceSha'])
    return m


def main():
    env = os.environ
    phase = 'e2e-preflight'
    try:
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        proof.require(sys.argv[1:] in ([], ['preflight']), 'E2E_ARGUMENTS_REFUSED')
        m = preflight(env)
        if sys.argv[1:] == ['preflight']:
            print('CD-C4B E2E caller, manifest and source preflight: PASS')
            return 0
        proof.check_credentials(env, provider=E2E_PROVIDER, service_account=E2E_SA)
        phase = 'e2e-credential'
        secret = access_secret(m['e2eSecret'])
        phase = 'candidate-e2e'
        controller(env, m, secret)
        secret = None
        release.emit(env, 'e2e_hash', env['CD_MANIFEST_HASH'])
        print('CD-C1 E2E + exact-user cleanup: PASS; traffic read-back still required')
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, proof.GateError) and str(error) in PUBLIC_FAILURES else 'E2E_CONTROLLER_FAILED'
        if code == 'E2E_CLEANUP_UNPROVEN':
            phase = 'cleanup'
        elif code == 'E2E_EVIDENCE_REJECTED':
            phase = 'e2e-evidence'
        print(f'CD-C1 E2E: FAIL / {phase} / {code} / HUMAN_DECISION_REQUIRED; no retry', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
