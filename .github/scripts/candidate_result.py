"""Strict public result boundary. No free-form child text is publishable."""
import json
import os
from pathlib import Path
import stat

import wif_submission as proof

CONTRACT = json.loads((Path(__file__).resolve().parents[2] / 'e2e/candidate-result-contract.json').read_text())
TABLES = ('auth', 'users', 'notes', 'user_tags')


def initial(m, manifest_hash):
    proof.require(m.get('e2eIdentityVersion') == 2 and proof.matches(r'[a-f0-9]{64}', manifest_hash),
                  'RESULT_ENVELOPE_INVALID')
    return {'version': 1, 'candidateId': m['candidateId'], 'sourceSha': m['sourceSha'],
            'githubRunId': m['run']['id'], 'githubRunAttempt': m['run']['attempt'],
            'manifestHash': manifest_hash, 'scenario': 'UNKNOWN',
            'steps': [{'name': n, 'result': 'NOT_RUN'} for n in CONTRACT['steps']],
            'cleanup': dict.fromkeys(TABLES), 'cleanupState': 'UNPROVEN',
            'localReceiptState': 'UNKNOWN', 'evidenceState': 'UNKNOWN', 'httpsCookieVerified': False,
            'failureCode': None, 'failureOperation': None,
            'recoveryHandle': {'type': 'DETERMINISTIC_CANDIDATE_ID', 'candidateId': m['candidateId']}}


def state(counts):
    if any(type(counts[t]) is int and counts[t] > 0 for t in TABLES):
        return 'RESIDUAL'
    return 'PROVEN_ZERO' if all(type(counts[t]) is int and counts[t] == 0 for t in TABLES) else 'UNPROVEN'


def keys(value, expected):
    return type(value) is dict and set(value) == set(expected)


def validate(r, m, manifest_hash):
    def need(ok):
        proof.require(ok, 'RESULT_ENVELOPE_INVALID')
    base = initial(m, manifest_hash)
    need(keys(r, base))
    for key in ('version', 'candidateId', 'sourceSha', 'githubRunId', 'githubRunAttempt', 'manifestHash'):
        need(type(r[key]) is type(base[key]) and r[key] == base[key])
    need(r['scenario'] in ('PASS', 'FAIL', 'NOT_RUN', 'UNKNOWN'))
    need(type(r['steps']) is list and len(r['steps']) == len(CONTRACT['steps']))
    for row, name in zip(r['steps'], CONTRACT['steps']):
        need(keys(row, ('name', 'result')) and row['name'] == name and row['result'] in ('PASS', 'FAIL', 'NOT_RUN'))
    need(r['scenario'] != 'PASS' or all(s['result'] == 'PASS' for s in r['steps']))
    need(r['scenario'] != 'NOT_RUN' or all(s['result'] == 'NOT_RUN' for s in r['steps']))
    need(keys(r['cleanup'], TABLES))
    need(all(v is None or type(v) is int and 0 <= v <= 9007199254740991 for v in r['cleanup'].values()))
    need(r['cleanupState'] == state(r['cleanup']))
    need(r['localReceiptState'] in ('UNKNOWN', 'PERSISTED', 'FAILED', 'NOT_REQUIRED'))
    need(r['evidenceState'] in ('UNKNOWN', 'PASS', 'FAIL'))
    need(type(r['httpsCookieVerified']) is bool and
         (not r['httpsCookieVerified'] or r['steps'][0]['result'] == 'PASS'))
    code = r['failureCode']
    need((code is None and r['failureOperation'] is None) or
         type(code) is str and code in CONTRACT['failures'] and r['failureOperation'] == CONTRACT['failures'][code])
    need(keys(r['recoveryHandle'], ('type', 'candidateId')) and r['recoveryHandle'] == base['recoveryHandle'])
    need(len(json.dumps(r).encode()) <= CONTRACT['maxBytes'])
    return r


def set_failure(r, code):
    proof.require(code in CONTRACT['failures'], 'RESULT_ENVELOPE_INVALID')
    r['failureCode'], r['failureOperation'] = code, CONTRACT['failures'][code]


def exit_code(r):
    if r['cleanupState'] != 'PROVEN_ZERO':
        return 21
    if r['localReceiptState'] == 'FAILED' or r['evidenceState'] != 'PASS':
        return 22
    if r['scenario'] != 'PASS':
        return 20
    return 0 if r['failureCode'] is None and r['httpsCookieVerified'] else 22


def read(filename, expected_stat, m, manifest_hash):
    def pairs(rows):
        out = {}
        for k, v in rows:
            proof.require(k not in out, 'RESULT_ENVELOPE_INVALID')
            out[k] = v
        return out
    try:
        with os.fdopen(os.open(filename, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), 'rb') as file:
            s = os.fstat(file.fileno())
            proof.require(stat.S_ISREG(s.st_mode) and s.st_nlink == 1 and s.st_uid == os.getuid() and
                          stat.S_IMODE(s.st_mode) == 0o600 and
                          (s.st_dev, s.st_ino) == (expected_stat.st_dev, expected_stat.st_ino) and
                          s.st_size <= CONTRACT['maxBytes'], 'RESULT_ENVELOPE_INVALID')
            raw = file.read(CONTRACT['maxBytes'] + 1)
        proof.require(bool(raw), 'RESULT_ENVELOPE_MISSING')
        proof.require(len(raw) <= CONTRACT['maxBytes'], 'RESULT_ENVELOPE_INVALID')
        return validate(json.loads(raw, object_pairs_hook=pairs), m, manifest_hash)
    except FileNotFoundError:
        raise proof.GateError('RESULT_ENVELOPE_MISSING') from None
    except Exception as error:
        code = 'RESULT_ENVELOPE_MISSING' if isinstance(error, proof.GateError) and str(error) == 'RESULT_ENVELOPE_MISSING' else 'RESULT_ENVELOPE_INVALID'
        raise proof.GateError(code) from None


def publish(r, m, manifest_hash, env):
    validate(r, m, manifest_hash)
    safe = json.dumps(r, sort_keys=True, separators=(',', ':'))
    print('CD-C3 E2E result: ' + safe, flush=True)
    if env.get('GITHUB_STEP_SUMMARY'):
        with Path(env['GITHUB_STEP_SUMMARY']).open('a') as file:
            file.write('## Candidate E2E result\n\n```json\n' + safe + '\n```\n')
