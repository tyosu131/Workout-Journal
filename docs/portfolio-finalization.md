# Portfolio Presentation and Repository Maturity — PF-F1 / PF-F2 / PF-F3

## Scope and authority

PF-F1 Historical scope: read-only evidence was collected on **2026-09-22 (UTC)** for Portfolio Finish
Must 1, Must 6 durable closure, Must 7 and Must 8 preparation. These are the
[Portfolio Completion Contract](./portfolio-completion-contract.md) conditions,
not v1 Completion Contract Conditions 7/8. Product v1 is not reopened.

- Starting working tree: clean; local main fast-forwarded without rebase.
- Base main / fetched origin/main / GitHub main: `2d9ec91d8f11a83c0904de770cc8df436139325b`.
- Local documentation branch: `portfolio/final-presentation-maturity`.
- [PR #124](https://github.com/tyosu131/Workout-Journal/pull/124): merged at that SHA.
- Source Map v3.1, Core v3.2, Workflow Router v3.2 and Review v3.1 were applied.
- PF-F1 changed documentation only and authorized no external mutation. PF-F2
  completed Fresh Result Audit with zero remaining Must/Should/Pending findings.
- PF-F3 implements the subsequently approved MIT decision and exact GitHub metadata
  and Release. Production operations, stage, commit, push and PR remain outside scope.

## Current production

This is the current production checkpoint, established by `gcloud run services
describe` and `gcloud run revisions describe`, not by selecting a historical
release revision or assuming that main must be deployed.

| Field | Verified value |
| --- | --- |
| GCP project / region | `workout-journal-506909` / `asia-northeast1` |
| Production source | `2d9ec91d8f11a83c0904de770cc8df436139325b` |
| Frontend service | `workout-journal-frontend` |
| Stable public application URL | [Workout Journal](https://workout-journal-frontend-cpbzb7lqza-an.a.run.app) |
| Frontend production revision | `workout-journal-frontend-cd-35737278328-1` |
| Frontend traffic / Ready | 100% / True |
| Backend service | `workout-journal-backend` |
| Backend production revision | `workout-journal-backend-cd-35737278328-1` |
| Backend traffic / Ready | 100% / True |
| Pair identity | `cd-35737278328-1` |
| Frontend server-only Backend target | `https://cd-35737278328-1---workout-journal-backend-cpbzb7lqza-an.a.run.app` |
| Pairing check | Backend tag resolves to the same Backend production revision |
| Frontend image digest | `sha256:1885bb4038639f9005c1b8160f73b9692127ff68075c0dc3c670e2466c136b4a` |
| Backend image digest | `sha256:1ce8b4694cca534090cf38c42dbf962b32fbe6e9c24898f34769a3cdfc87dab1` |
| Public availability | One unauthenticated GET to stable Frontend `/login`: HTTP 200; no account/data creation |

Latest automatic CD [35737278328](https://github.com/tyosu131/Workout-Journal/actions/runs/35737278328)
is `workflow_run`, SUCCESS, attempt 1, exact production source. Preflight,
candidate, candidate E2E, verify-candidate and production jobs succeeded. Its log
records all eight scenario steps PASS, HTTPS cookie verified, cleanup
`PROVEN_ZERO` (Auth/users/notes/user_tags all zero), receipt PERSISTED and evidence
PASS. GitHub approval history records Human `tyosu131` approval for `production`.
The production diagnostic records `post-deploy-verification: PASS`, no promotion
failure and rollback null; no new rollback execution is claimed.

Current revisions retain Frontend TCP startup and Backend HTTP `/health`:8080
startup/liveness probes. The dedicated [observability proof](./verification.md#obs-d3f-final-observability-documentation-closure)
remains the dated Must 5 evidence; no failure injection or new notification test
was performed here. Its `cd-35684518093-2` pair is now Historical, at 0% traffic.
The [original v1 release](./releases/workout-journal-v1.md) remains Historical
known-good evidence from 2026-08-29, including its then-current traffic.

## Must 6 durable closure

**Must 6: Closed.** The following fresh GitHub read-back plus main source confirms
all portions of the condition. Successful automation does not mean every new
Dependabot PR is safe to merge or all advisories are absent.

| Requirement | Verified evidence |
| --- | --- |
| Existing CI quality gate | Main push [35736936685](https://github.com/tyosu131/Workout-Journal/actions/runs/35736936685), SUCCESS / attempt 1 / exact base SHA; `Lint, build, and test baseline` SUCCESS |
| Static security scanning | CodeQL Default setup configured; post-merge [35736936078](https://github.com/tyosu131/Workout-Journal/actions/runs/35736936078), SUCCESS / attempt 1 / exact base SHA; Actions and JavaScript/TypeScript jobs SUCCESS |
| Version-update configuration | [`.github/dependabot.yml`](../.github/dependabot.yml) exists on default branch main; monthly npm root/frontend/backend, Actions root, Docker frontend/backend and Terraform |
| Actual version-update execution | After merge: Docker [35736942973](https://github.com/tyosu131/Workout-Journal/actions/runs/35736942973), Actions [35736943336](https://github.com/tyosu131/Workout-Journal/actions/runs/35736943336), Terraform [35736943493](https://github.com/tyosu131/Workout-Journal/actions/runs/35736943493) SUCCESS; npm [35736943477](https://github.com/tyosu131/Workout-Journal/actions/runs/35736943477) observed in progress at read-back. Bot PRs #125–#131 and #137 corroborate version-update execution; this is not just configuration presence |
| Security update automation | Dependabot alerts endpoint enabled; repository `dependabot_security_updates` enabled; security PRs #119–#123 generated and then superseded by #124 |
| Secret-safety controls | Secret scanning and push protection enabled; [`.gitignore`](../.gitignore) ignores real `.env`/`.env.*` while retaining examples; server-only Supabase/Secret Manager boundaries preserved |
| Protected main / required check | Branch protected; strict `Lint, build, and test baseline`, GitHub Actions app ID `15368`; administrators enforced, conversation resolution required, force push/deletion disabled |

PRs **#119, #120, #121, #122 and #123 are CLOSED, not merged**. Each issue-event
record identifies `dependabot[bot]` as the closing actor after #124 merged.
No PR action or GitHub setting change was performed by PF-F1. CodeQL remains
Default setup; no advanced workflow was added. The successful automatic CD and
current production read-back above establish delivery of the merged safeguards.

## Portfolio presentation and claim audit

The English [README](../README.md) is the primary reviewer surface; the
[Japanese README](../readme_Japanese) is a shorter, consistent counterpart.
Feature claims were checked against the actual pages, note editor/handlers,
Auth and note routes/services, Analytics page/shared utilities, and browser
password-recovery implementation. There is no full-note deletion route; the
README describes exercise/set deletion and tag deletion precisely. The summary
provider is local/mock, not external AI.

Only framework placeholder SVGs were found in the tracked product visual assets;
there is no verified current product screenshot to reuse. The two README Mermaid
diagrams reflect actual proxy/client and CI/CD boundaries and serve as the
contract's **other appropriate visual evidence**. No screenshot is fabricated;
a decorative screenshot is not a blocking requirement.

| Old-looking claim group | Classification / action |
| --- | --- |
| README clone placeholder, missing features and incomplete Japanese setup | Stale Current claim corrected; rewritten from actual source/scripts/templates |
| Current production `cd-35684518093-2` in current doc summaries | Stale Current claim corrected; current readers point to this read-back, with the OBS-D3F checkpoint preserved |
| Must 6 Open / future security automation | Stale Current claim corrected; closed using the evidence above |
| CI described as only lint/build/Jest | Incomplete Current claim corrected; added existing offline E2E/Python/Terraform checks |
| OBS-D3F final-docs approval-wait plan | Historical phase-specific plan; latest production and this phase's no-deploy authorization are separate |
| Original v1, P2B, CD-B2, C3 incidents, C4D, OBS-D2A/B and OBS-D3F IDs/results | Historical and valid; exact evidence retained, no old failure promoted to current defect |
| Eight / 30 / 35 / 37 Terraform resources and initially disabled providers | Historical checkpoints; 42-resource OBS-D2A inventory and activated provider boundary remain current accepted evidence, not a new PF-F1 plan/apply |
| Terraform/CD ownership, mock summary, public Backend/JWT boundary | Current and still valid |
| External AI, broader tracing/metrics, unrelated hardening | Future / separate scope |
| Empty repository metadata, no Release and undecided license | Historical PF-F1/PF-F2 state; superseded by approved PF-F3 execution below |

Current owner docs inspected include README, Japanese README, Completion Contract,
system design, deployment, verification, ownership, E2E, CD-C1, WIF proof,
quality improvements, Terraform README, Supabase README and the dated v1 release.
No new runtime regression suite is implied by documentation edits. The PF-F1
claim audit above is Historical; PF-F2/PF-F3 review results are recorded separately below.

## Repository maturity read-back

At PF-F1 read-back, GitHub reports description null, homepage null, topics empty,
Releases empty, tags empty, detected repository license null and default branch
`main`. At that Historical checkpoint no tracked root LICENSE existed, root/backend
packages had no license field, and the private frontend package declared ISC.
These were observations, not an approved repository-wide policy. PF-F3 supersedes
that maturity state as follows; default-branch license detection awaits merge.

### GitHub metadata — applied and verified

PF-F3 applied the Human-approved values and verified exact API read-back:

- Description: `A calendar-based workout journal with training analytics, deployed on Cloud Run through verified paired releases.`
- Homepage: `https://workout-journal-frontend-cpbzb7lqza-an.a.run.app`
- Topics: `workout-tracker`, `nextjs`, `typescript`, `express`, `supabase`, `cloud-run`, `terraform`, `github-actions`, `playwright`

### GitHub Release — published and verified

PF-F3 rechecked absence of the tag/Release before publication. No existing
release-tag convention constrained the name. The dated tag identifies the
known-good production artifact without introducing a semantic-version policy.

- Tag: `production-2026-09-22`
- Title: `Workout Journal — Verified production snapshot (2026-09-22)`
- Target SHA: `2d9ec91d8f11a83c0904de770cc8df436139325b`
- Draft: `false`.
- Prerelease: `false`.
- Known-good basis: exact-source main CI and CodeQL SUCCESS, automatic CD SUCCESS,
  candidate E2E/cleanup, Human approval, post-deploy PASS, and current 100% paired
  Cloud Run read-back.
- Relationship to the portfolio branch: targets the deployed source, not the later documentation
  commit. This README rewrite is not part of that target artifact.

- Release URL: [production-2026-09-22](https://github.com/tyosu131/Workout-Journal/releases/tag/production-2026-09-22).
- Published: `2026-09-22T15:43:25Z`; actual tag reference and Release target both
  resolve to the exact source SHA above. No evidence files or assets were attached.
- Published notes record CI, CodeQL, automatic candidate delivery, production-like
  E2E/cleanup, Human approval, paired promotion, post-deploy verification and active
  security safeguards. They explicitly distinguish the production snapshot from
  later portfolio documentation and do not claim Portfolio Finish complete.

### License Project Decision — MIT

The owner approved **MIT** in PF-F3 for explicit open-source reuse terms and a
simple, repository-wide policy. This resolves the PF-F2 Human Decision; it is not
an outstanding MIT/ISC/No License comparison.

- Root [LICENSE](../LICENSE): canonical MIT text, copyright `2026 tyosu131`.
- `frontend/package.json`: `license: MIT`; `private: true` remains unchanged.
- `frontend/package-lock.json`: npm-generated root package license aligned to MIT;
  dependency entries, versions and resolved graph are unchanged.
- Root/backend package metadata is unchanged; root LICENSE owns the approved policy.
- English/Japanese READMEs disclose MIT and link to LICENSE.
- Repository policy implemented locally: **YES**.
- GitHub default-branch MIT detection: **NOT YET — PENDING MERGE**. The main branch
  still lacks LICENSE; local implementation is not default-branch detection.

Historical context: PF-F1 compared No License/MIT; PF-F2 added ISC because the
frontend previously declared it. Those proposals are superseded by the explicit
MIT decision. Third-party dependency license notices remain their own metadata.

## PF-F1 validation and self-review

- `git diff --check`: PASS.
- Relative path/heading checks across all 15 changed documentation files: 285
  links checked, zero missing targets/anchors. No existing Markdown/link checker
  was found; no new dependency was installed.
- Targeted Current/Historical/Future search covered 30 tracked technical documents
  plus this new record. Remaining old identities belong to explicitly dated
  checkpoints or the original dated v1 release; no material stale Current claim
  remains in the reviewed scope.
- GitHub read-back and production read-back: PASS; source, E2E identity and both
  deployed image digests agree with the successful CD log.
- Self-review checked implemented feature coverage, the public Backend/JWT and
  recovery-only browser Supabase boundary, current production ownership,
  historical failure classification, Must 6 closure, Must 8 pending gates,
  bilingual consistency and README readability. No unresolved material issue
  found in this documentation diff; an independent Fresh Audit is still required.
- Non-documentation changes: NONE. Expensive runtime tests were not rerun for
  this documentation-only phase; the exact-base successful CI is separate evidence.

## PF-F3 verification, final audit and author Pre-PR

PF-F3 applied Source Map v3.1, Core v3.2, Router v3.2, Review v3.1 and Pre-PR
v3.1. The final audit below uses the current Completion Contract, actual complete
branch diff, current source and fresh external read-back, not only PF-F2's verdict.

- Authority: fetched origin/main, HEAD and merge-base remain
  `2d9ec91d8f11a83c0904de770cc8df436139325b`; staged files remain NONE.
- GitHub read-back: approved description/homepage/topics match exactly. Release
  fields and actual tag SHA match the approved production target. Main did not move.
- Unrelated repository settings: visibility, default branch, features, security
  controls, required checks, Actions permissions and Environment protection match
  the pre-mutation read-back. Dependabot alerts remain enabled.
- Production read-only verification: both services Ready, current pair
  `cd-35737278328-1` at 100% each, exact Backend target preserved; CI, CodeQL,
  automatic CD and production job success plus Human approval re-read. No new
  application HTTP request, failure injection or production operation occurred.
- Canonical MIT: exact GitHub MIT template with only year/holder substituted.
  Manifest and entire parsed lockfile equal main after excluding the one approved
  root license field; no dependency or resolution changes.
- Node `24.18.0` / npm `11.16.0`: offline lockfile-only generation succeeded.
  `npm ci --ignore-scripts --prefix frontend --no-audit --no-fund` passed (1079
  packages). An initial sandbox DNS failure was retried with network access; it
  was not a package consistency failure. No tracked install side effects remain.
- `git diff --check`: PASS. Deterministic relative path/anchor verification covers
  15 changed documentation files, 288 links, zero errors. No checker dependency added.
- Targeted stale-current review: no unresolved material contradiction; prior
  empty metadata/ISC proposals are Historical. The old system-design next step
  was narrowed to the now-remaining merge and maturity read-back.

| Must | Independent final audit evidence / result |
| --- | --- |
| 1 | Complete documentation diff and Current/Historical boundaries reviewed; no stale Current production, security or maturity claim remains. READY_TO_CLOSE_AFTER_MERGE |
| 2 | Durable P2B scenario/cleanup proof and subsequent automatic candidate E2E remain valid; no E2E code/config changed. CLOSED |
| 3 | Durable 42-resource foundation/WIF/Monitoring evidence and Terraform/CD ownership preserved; no infrastructure/identity changes. CLOSED |
| 4 | Actual CD source preserves keyless paired candidates, Human approval, Backend then Frontend promotion and recovery; exact-source successful automatic CD re-read. CLOSED |
| 5 | OBS-D3F health/probes, sanitized logging, incident/notification proof and runbook remain valid; no monitoring/runtime changes. CLOSED |
| 6 | Main CI, configured CodeQL, Dependabot configuration/runtime evidence, enabled secret controls and protected main/required check preserved. CLOSED |
| 7 | English/Japanese features traced to routes, note editor, Analytics/Growth Signals and recovery source; stable URL, accurate diagrams/security boundaries and useful documentation map retained. READY_TO_CLOSE_AFTER_MERGE |
| 8 | Approved metadata and exact production Release verified; MIT canonical and metadata aligned. Default-branch LICENSE merge/detection remains the explicit closure dependency |

Adversarial review covered all 13 PF-F3 cases: unsupported features; wrong live
URL; false private-Backend claim; stale Current production; falsely Open Must 6;
metadata mismatch; wrong Release SHA; documentation/production artifact confusion;
remaining first-party ISC conflict; non-canonical LICENSE; premature Must 8 Closed;
rewritten historical failures; premature Portfolio Done. No unresolved finding.
Third-party dependency ISC notices are not conflicting repository policy.

Final audit classifications: **Must 0 / Should 0 / Pending Evidence 0 /
Decision Needed 0 / new Backlog 0**. No Finding for the reviewed acceptance cases;
existing unrelated Backlog remains outside scope. Default-branch license detection
is a known merge-dependent gate, not missing evidence about this branch.
Author-side Pre-PR reviewed scope, complete diff, empty index, MIT consistency,
README, history boundaries, metadata/Release identity and link checks: **PASS**.
Full application tests were not rerun: runtime source/config/dependencies are unchanged.

## Current closure readiness

- Must 1: READY_TO_CLOSE_AFTER_MERGE.
- Must 2–5: Closed, preserved; no contrary evidence found.
- Must 6: Closed; security controls and required check re-read in PF-F3.
- Must 7: READY_TO_CLOSE_AFTER_MERGE.
- Must 8: READY_TO_CLOSE_AFTER_MERGE_AND_FINAL_AUDIT. Approved description,
  homepage/topics and Release are applied and verified; MIT is implemented on this
  branch. LICENSE merge and GitHub default-branch MIT detection remain required.

Portfolio Done still requires **all Portfolio Must conditions Closed AND final
Portfolio Audit Must finding count = 0**. Local readiness does not declare it Done.
PF-F3 does not stage, commit, push, create a PR, or operate production. The approved
GitHub Release/tag records the existing production source; it does not publish
this branch's files.
