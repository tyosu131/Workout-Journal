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

E2E_SA = f'workout-journal-e2e@{proof.PROJECT}.iam.gserviceaccount.com'
E2E_PROVIDER = proof.PROVIDER + '-e2e'
STEPS = ['login', 'tag-create', 'note-create-save-read', 'tag-use',
         'Calendar', 'Analytics', 'tag-delete', 'logout']
CHILD_FAILURES = {20: 'E2E_SCENARIO_FAILED', 21: 'E2E_CLEANUP_UNPROVEN',
                  22: 'E2E_EVIDENCE_REJECTED'}
PUBLIC_FAILURES = {*CHILD_FAILURES.values(), 'E2E_INTERRUPTED_CLEANUP_UNPROVEN',
                   'E2E_CHILD_CLEANUP_UNPROVEN'}


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


def child_environment(env, m, filename):
    allowed = ['PATH', 'HOME', 'TMPDIR', 'GITHUB_ACTIONS', 'GITHUB_REPOSITORY', 'GITHUB_REF',
               'GITHUB_SHA', 'GITHUB_WORKFLOW_SHA', 'GITHUB_WORKFLOW_REF', 'GITHUB_EVENT_NAME',
               'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']
    return {**{k: env[k] for k in allowed if k in env},
            'E2E_TARGET': 'candidate:' + m['candidateId'], 'E2E_TARGET_MANIFEST': str(filename),
            'E2E_MANIFEST_SHA256': env['CD_MANIFEST_HASH'], 'TZ': 'Asia/Tokyo',
            'PLAYWRIGHT_NO_COPY_PROMPT': '1', 'NEXT_TELEMETRY_DISABLED': '1'}


def controller(env, m, secret):
    # Private metadata file only. Never write the stdin document or its value.
    with tempfile.TemporaryDirectory(prefix='cd-e2e-manifest-', dir=env['RUNNER_TEMP']) as temp:
        filename = Path(temp) / 'manifest.json'
        fd = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(env['CD_MANIFEST'])
        payload = json.dumps({'secretRef': m['e2eSecret'], 'value': secret}).encode()
        child = subprocess.Popen(['node', 'e2e/candidate-run.mjs'], cwd=release.ROOT,
                                 env=child_environment(env, m, filename),
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
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
            proof.require(not interrupted, 'E2E_INTERRUPTED_CLEANUP_UNPROVEN')
            proof.require(child.returncode == 0,
                          CHILD_FAILURES.get(child.returncode, 'E2E_CHILD_CLEANUP_UNPROVEN'))
        finally:
            for s, handler in previous.items():
                signal.signal(s, handler)
            payload = b''  # Never forward child stdout/stderr, even on success.


def check_report(m):
    found = []
    for filename in (release.ROOT / 'e2e/evidence').glob('*.json'):
        r = json.loads(filename.read_text())
        if r.get('candidateId') == m['candidateId']:
            found.append(r)
    proof.require(len(found) == 1, 'E2E_REPORT_AMBIGUOUS')
    r = found[0]
    proof.require(r.get('sourceSha') == m['sourceSha'] and r.get('project') == proof.PROJECT and
                  r.get('region') == proof.REGION and r.get('result') == 'PENDING_TRAFFIC_VERIFICATION' and
                  r.get('httpsCookieVerified') is True and r.get('secretLeakCheck') == 'PASS' and
                  proof.matches(r'p2b-[0-9]{13}-[a-f0-9]{16}', r.get('runId')) and
                  r.get('cleanup') == {'auth': 0, 'users': 0, 'notes': 0, 'user_tags': 0} and
                  r.get('steps') == [{'name': n, 'result': 'PASS'} for n in STEPS], 'E2E_CLEANUP_PROOF_MISSING')
    for part in release.PARTS:
        proof.require(r.get(part) == {k: m[part][k] for k in
                      ('service', 'revision', 'tag', 'url', 'digest', 'traffic')}, 'E2E_TARGET_MISMATCH')
    proof.require(r.get('backendInternalUrl') == m['backend']['url'], 'E2E_TARGET_MISMATCH')


def main():
    env = os.environ
    phase = 'e2e-preflight'
    try:
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        proof.require(len(sys.argv) == 1, 'E2E_ARGUMENTS_REFUSED')
        m = release.input_manifest(env)
        proof.check_source(release.ROOT, m['sourceSha'])
        proof.check_credentials(env, provider=E2E_PROVIDER, service_account=E2E_SA)
        phase = 'e2e-credential'
        secret = access_secret(m['e2eSecret'])
        phase = 'candidate-e2e'
        controller(env, m, secret)
        secret = None
        phase = 'cleanup-verification'
        check_report(m)
        release.emit(env, 'e2e_hash', env['CD_MANIFEST_HASH'])
        print('CD-C1 E2E + exact-user cleanup: PASS; traffic read-back still required')
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, proof.GateError) and str(error) in PUBLIC_FAILURES else 'E2E_CONTROLLER_FAILED'
        if code in {'E2E_CLEANUP_UNPROVEN', 'E2E_INTERRUPTED_CLEANUP_UNPROVEN', 'E2E_CHILD_CLEANUP_UNPROVEN'}:
            phase = 'cleanup'
        elif code == 'E2E_EVIDENCE_REJECTED':
            phase = 'e2e-evidence'
        print(f'CD-C1 E2E: FAIL / {phase} / {code} / HUMAN_DECISION_REQUIRED; no retry', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
