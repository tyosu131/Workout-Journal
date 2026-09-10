"""Authentication only. No SDK, credential file, secret access or resource API.

A/B reuse one Deploy-provider STS token. Only an IAM 403 PERMISSION_DENIED
passes B; STS/network/parse failures do not prove isolation. C runs separately
through candidate-e2e.yml, only after A/B succeed. Never serialize exceptions.
"""
import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import resource
import subprocess
import sys
from urllib.error import HTTPError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = 'tyosu131/Workout-Journal'
CALLER = REPOSITORY + '/.github/workflows/cd.yml@refs/heads/main'
CALLED = REPOSITORY + '/.github/workflows/candidate-e2e.yml@refs/heads/main'
POOL = 'projects/437413312066/locations/global/workloadIdentityPools/github-actions'
PROVIDERS = {'deploy': POOL + '/providers/workout-journal',
             'e2e': POOL + '/providers/workout-journal-e2e'}
ACCOUNTS = {role: f'workout-journal-{role}@workout-journal-506909.iam.gserviceaccount.com'
            for role in ('deploy', 'e2e')}
STS = 'https://sts.googleapis.com/v1/token'
IAM = 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/'
SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
ACCESS_TYPE = 'urn:ietf:params:oauth:token-type:access_token'
LIMIT = 64 * 1024


def require(ok):
    if not ok:
        raise ValueError('WIF_PROOF_REFUSED')


def context(env):
    expected = {'CD_MODE': 'wif-proof', 'GITHUB_REPOSITORY': REPOSITORY,
                'GITHUB_REPOSITORY_ID': '790375516', 'GITHUB_REPOSITORY_OWNER_ID': '95160728',
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_WORKFLOW_REF': CALLER,
                'GITHUB_EVENT_NAME': 'workflow_dispatch'}
    require(all(env.get(k) == v for k, v in expected.items()))
    sha = env.get('GITHUB_SHA', '')
    require(re.fullmatch(r'[a-f0-9]{40}', sha) and env.get('GITHUB_WORKFLOW_SHA') == sha)
    require(re.fullmatch(r'[1-9][0-9]{0,19}', env.get('GITHUB_RUN_ID', '')) and
            re.fullmatch(r'[1-9][0-9]{0,3}', env.get('GITHUB_RUN_ATTEMPT', '')))
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT,
                          capture_output=True, check=True, timeout=10)
    require(head.stdout.decode().strip() == sha)
    subprocess.run(['git', 'diff', '--quiet', 'HEAD'], cwd=ROOT,
                   capture_output=True, check=True, timeout=10)
    return {'sourceSha': sha, 'runId': env['GITHUB_RUN_ID'], 'runAttempt': env['GITHUB_RUN_ATTEMPT']}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def request_json(url, *, token=None, body=None):
    """Private bounded response; no retries, proxies, redirects or HTTP logging."""
    headers = {'Accept': 'application/json'}
    if token is not None:
        headers['Authorization'] = 'Bearer ' + token
    if body is not None:
        headers['Content-Type'] = 'application/json'
    request = Request(url, headers=headers,
                      data=None if body is None else json.dumps(body).encode())
    try:
        response = build_opener(ProxyHandler({}), NoRedirect()).open(request, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        raw = response.read(LIMIT + 1)
        require(len(raw) <= LIMIT)
        data = json.loads(raw)
        require(isinstance(data, dict))
        return response.code, data


def token_value(value):
    require(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9._~+/-]{1,16384}={0,2}', value))
    return value


def github_token(env, role, metadata):
    # GitHub supplies this runner endpoint; never accept arbitrary token recipients.
    parts = urlsplit(env.get('ACTIONS_ID_TOKEN_REQUEST_URL', ''))
    require(parts.scheme == 'https' and parts.hostname is not None and
            parts.hostname.endswith('.actions.githubusercontent.com') and
            parts.port in (None, 443) and not parts.username and not parts.password and
            not parts.fragment and parts.path.endswith('/idtoken'))
    audience = '//iam.googleapis.com/' + PROVIDERS[role]
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != 'audience']
    query.append(('audience', audience))
    url = urlunsplit(parts._replace(query=urlencode(query)))
    status, data = request_json(url, token=token_value(env.get('ACTIONS_ID_TOKEN_REQUEST_TOKEN')))
    require(status == 200)
    token = token_value(data.get('value'))
    pieces = token.split('.')
    require(len(pieces) == 3)
    claims = json.loads(base64.urlsafe_b64decode(pieces[1] + '=' * (-len(pieces[1]) % 4)))
    expected = {'iss': 'https://token.actions.githubusercontent.com', 'aud': audience,
                'repository': REPOSITORY, 'repository_id': '790375516',
                'repository_owner': 'tyosu131', 'repository_owner_id': '95160728',
                'ref': 'refs/heads/main', 'workflow_ref': CALLER,
                'sha': metadata['sourceSha'], 'workflow_sha': metadata['sourceSha'],
                'run_id': metadata['runId'], 'run_attempt': metadata['runAttempt'],
                'event_name': 'workflow_dispatch'}
    if role == 'e2e':
        expected.update(job_workflow_ref=CALLED, job_workflow_sha=metadata['sourceSha'])
    require(all(claims.get(k) == v for k, v in expected.items()))
    # This is a consistency check, not local signature verification. STS verifies
    # the signed token, issuer, audience, expiry and provider trust condition.
    return token


def federate(env, role, metadata):
    token = github_token(env, role, metadata)
    status, data = request_json(STS, body={
        'audience': '//iam.googleapis.com/' + PROVIDERS[role],
        'grantType': 'urn:ietf:params:oauth:grant-type:token-exchange',
        'requestedTokenType': ACCESS_TYPE, 'scope': SCOPE,
        'subjectTokenType': 'urn:ietf:params:oauth:token-type:jwt', 'subjectToken': token})
    require(status == 200 and data.get('token_type') == 'Bearer' and
            data.get('issued_token_type') == ACCESS_TYPE and
            type(data.get('expires_in')) is int and data['expires_in'] > 0)
    return token_value(data.get('access_token'))


def impersonate(token, target, *, expect_denial=False):
    require(target in ACCOUNTS)
    status, data = request_json(IAM + ACCOUNTS[target] + ':generateAccessToken', token=token,
                                body={'scope': [SCOPE], 'lifetime': '600s'})
    if expect_denial:
        # Even a malformed 200 is an unexpected success. Never accept unrelated
        # 401/404/429/5xx, failed STS, disabled provider, or network failure as proof.
        require(status == 403 and data.get('error', {}).get('code') == 403 and
                data['error'].get('status') == 'PERMISSION_DENIED')
    else:
        require(status == 200)
        token_value(data.get('accessToken'))
        expires = datetime.fromisoformat(data.get('expireTime', '').replace('Z', '+00:00'))
        remaining = (expires - datetime.now(timezone.utc)).total_seconds()
        require(0 < remaining <= 3600)
    # The minted SA token is never used for another API or exported.


def run(env, action, records):
    metadata = context(env)
    require(action in ('control-negative', 'positive'))
    role = 'deploy' if action == 'control-negative' else 'e2e'
    control = {**metadata, 'providerRole': role, 'targetSA': ACCOUNTS[role],
               'expected': 'AUTH_SUCCESS', 'result': 'FAIL'}
    records.append(control)
    token = federate(env, role, metadata)
    impersonate(token, role)
    control['result'] = 'PASS'
    if action == 'control-negative':
        negative = {**metadata, 'providerRole': 'deploy', 'targetSA': ACCOUNTS['e2e'],
                    'expected': 'IAM_PERMISSION_DENIED', 'result': 'FAIL'}
        records.append(negative)
        # Same federated token as A, not A's impersonated Deploy-SA access token.
        impersonate(token, 'e2e', expect_denial=True)
        negative['result'] = 'PASS'


def main():
    records = []
    result = 'FAIL'
    try:
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        require(len(sys.argv) == 2)
        run(os.environ, sys.argv[1], records)
        result = 'PASS'
    except Exception:
        # Never print response bodies, exception strings, JWTs or credential data.
        pass
    evidence = json.dumps({'wifProof': result, 'checks': records}, sort_keys=True)
    print(evidence)
    try:
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with Path(os.environ['GITHUB_STEP_SUMMARY']).open('a') as summary:
                summary.write('```json\n' + evidence + '\n```\n')
    except Exception:
        return 1
    return 0 if result == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
