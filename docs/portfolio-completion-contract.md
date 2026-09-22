# Workout-Journal Portfolio Finish Completion Contract

- **Version:** 1.0
- **Decision date:** 2026-08-29
- **Status:** Adopted for Portfolio Finish scope; Portfolio Done is not yet achieved
- **Owner:** Project owner
- **Purpose:** Define the bounded completion ceiling for presenting the completed Workout-Journal v1 as a mature portfolio project without reopening v1 product scope

## 1. Status and Boundary

Workout-Journal v1 is already **Done / Known-good Production**. Its release artifact, production smoke, and synthetic-data cleanup are recorded in the [v1 production release record](./releases/workout-journal-v1.md). Portfolio Finish is a separate bounded project and does not reopen the v1 Completion Contract.

Portfolio Finish is not a feature-expansion project. Work enters the Portfolio Must scope only when it is required by a Must condition in this contract or is necessary to correct a concrete security, secret, data-integrity, release, or documentation defect that prevents a Must from closing. Other improvements go to Backlog or a separate project.

Portfolio Finish is **Done** only when:

```text
All Portfolio Must conditions are Closed
AND
Final Portfolio Audit Must finding count = 0
```

Open Backlog items do not prevent Portfolio Done when they are outside this contract.

## 2. Source of Truth and Status Language

### Evidence Routing

Portfolio Finish does not apply one priority chain to every kind of evidence. Use the primary source that owns the decision or fact being evaluated.

| Decision / fact | Primary evidence |
| --- | --- |
| Portfolio Finish completion boundary | Current Portfolio Completion Contract / Project owner decision |
| Repository-specific implementation, placement, and verification method | Current Repository Harness / architecture / guideline / approved pattern |
| Repository implementation / current behavior | Target branch actual code / config / tests / runtime result |
| Production deployment / live runtime state | Current release evidence + actual production Cloud Run / Supabase state |
| Deployment / rollback contract | Current deployment runbook + actual deployment configuration |
| GitHub repository / PR / CI / protection / Release state | Actual GitHub state obtained through authorized GitHub tooling / CLI |
| Historical design / past decisions | ADR / PR / commit history / explicitly historical design documents |
| External technology behavior | Official primary documentation |

The current production pair `cd-35684518093-2` (100% each), fresh post-promotion read-back and final Must 5 runtime evidence are recorded in [OBS-D3F](./verification.md#obs-d3f-final-observability-documentation-closure). [OBS-D2A/B](./verification.md#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure) preserves the Historical previous production pair and Monitoring apply/no-drift evidence. [C4D](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure) retains the Historical automatic-delivery proof that closed Must 4. The [v1 production release record](./releases/workout-journal-v1.md) remains the original known-good v1 evidence. The [Cloud Run deployment runbook](./cloud-run-deployment-runbook.md) defines the current deployment, candidate-pairing, promotion, redeploy, and rollback contract.

Claims must distinguish:

- **Current:** confirmed current repository, production, configuration, or operational state.
- **Historical:** point-in-time investigation, design, migration, or verification evidence. Historical evidence is not promoted to Current merely because it remains in the repository.
- **Future:** required or proposed work that has not yet been implemented and verified.
- **Verified Portfolio Gap:** a confirmed missing Portfolio Must capability or setting; it is not a v1 release defect unless separate evidence establishes one.

### Evidence Conflict Rule

Do not apply one priority chain to all evidence. When evidence conflicts, return to the primary evidence that owns the decision or fact in the table above. Preserve historical evidence as historical, correct stale Current claims, and do not invent a third state by merging incompatible statements.

The Portfolio Completion Contract is the scope ceiling and Done boundary. It does not override every Current fact.

For example:

- do not infer a production revision from the current repository HEAD alone;
- do not infer current GitHub branch protection from the release record alone;
- do not infer current runtime behavior from a historical design document; and
- do not close a Portfolio Must merely because current repository code exists.

If the owner evidence has not been obtained or its currentness cannot be established, mark the decision `Pending Evidence`. Do not fill the gap by inference from a different source.

## 3. Portfolio Must Conditions

### Must 1: Documentation Consistency

Portfolio Done requires:

- current documentation does not materially contradict the actual production state or current repository behavior;
- Historical, Current, and Future claims are visibly distinguishable;
- historical design evidence is not presented as the current runtime Source of Truth;
- stale Current claims are removed or corrected; and
- this Completion Contract remains the Portfolio Finish scope ceiling.

### Must 2: Automated Production-like E2E Smoke

An automated candidate smoke must exercise a production-like environment and cover at least:

- login;
- note create, save, and read;
- tag create, use, and delete;
- Calendar;
- Analytics; and
- logout.

The smoke must produce reviewable pass/fail evidence and must be suitable for the candidate path defined by the CD contract. Workflows with an external email dependency, including password recovery, are not automated E2E Must coverage unless a later decision supplies a deterministic and safe test boundary.

### Must 3: Infrastructure as Code / Identity

Terraform must reproduce a portfolio-meaningful GCP foundation. The final approved scope must address, where applicable:

- Artifact Registry;
- runtime and deploy Service Accounts;
- IAM bindings;
- GitHub Actions Workload Identity Federation;
- Secret Manager resource metadata; and
- monitoring and alert resources.

Secret values must not enter Terraform configuration, plan output, or state. Terraform and CD must not compete for ownership of Cloud Run revisions, application images, or traffic promotion. The exact ownership boundary is a P1 investigation and decision; it must be documented before implementation.

Full Supabase infrastructure management is outside this Terraform Must.

### Must 4: Continuous Delivery

The verified delivery path must establish:

```text
main merge
-> CI success
-> GitHub OIDC / GCP Workload Identity Federation
-> Cloud Build
-> immutable image digest
-> Backend candidate
-> exact Backend tagged URL
-> Frontend candidate
-> automated smoke
-> production approval
-> Backend promotion
-> Frontend promotion
-> post-deploy verification
```

The implementation must not use a long-lived Service Account key. It must preserve the existing unique candidate identity, immutable Backend tagged URL, paired Frontend/Backend revision, promotion, redeploy, cleanup, and rollback contracts documented in the deployment runbook.

### Must 5: Observability

Portfolio Done requires at least:

- application and service health inspection;
- a Cloud Run health probe;
- sanitized structured failure logging;
- frontend availability monitoring;
- an actionable server-side failure alert; and
- a documented inspection and recovery procedure.

An advanced APM or distributed tracing platform is not required.

### Must 6: Security / Repository Governance

Portfolio Done requires at least:

- the existing CI quality gate;
- static security scanning such as CodeQL;
- dependency update and security automation;
- secret-safety controls;
- protected `main`; and
- required status checks.

**Verified Current Safeguard:** Actual GitHub read-back confirms that `main` is protected and requires the GitHub Actions check `Lint, build, and test baseline` pinned to app ID `15368`, with strict up-to-date checking. Functional verification on temporary PR #91 established both sides of the gate: head `b92c52c710f9408ea007f0e1832dda6a201959e5` produced zero check runs because of `[skip ci]` and remained `BLOCKED` despite being Git-mergeable; head `ec28344de2d9a49a3bf926416c987e0e2125ea6c` produced successful required checks and became `CLEAN`. The PR was closed without merge and its temporary branch was deleted, so no verification artifact entered `main`. This closes the protected-branch and required-check portions of Must 6 without closing its remaining security-automation requirements or reopening the completed v1 release.

### Must 7: Portfolio Presentation

The final README and repository surface must allow a third party to understand quickly:

- the product problem and value;
- major implemented features;
- the live production application;
- architecture;
- technology stack;
- CI/CD;
- infrastructure and security boundaries;
- testing strategy;
- production and rollback strategy;
- important engineering decisions; and
- links to deeper technical documentation.

The English README is primary. The Japanese README may be shorter, but it must not retain material feature, architecture, production, or operational contradictions.

### Must 8: Repository Maturity / Final Evidence

Portfolio Done requires:

- a portfolio-oriented repository description;
- a repository homepage;
- relevant repository topics;
- a GitHub Release identifying a known-good release;
- an intentional license policy and, when applicable, a root license file;
- zero material stale claims in current documentation; and
- a final Portfolio Audit with zero Must findings.

**Verified Portfolio Gap:** External repository inspection confirmed that the repository description and homepage are unset, topics are empty, and no GitHub Release exists. The root license policy/file is also unset. These gaps must be closed in the Repository Maturity phase; this P0 task does not change repository settings or decide the license policy.

## 4. Explicit Non-goals

The following are not Portfolio Done conditions unless concrete evidence shows that one is required to correct a Must defect:

- GKE or Kubernetes migration;
- microservice decomposition;
- service mesh;
- multi-region deployment;
- an advanced distributed tracing platform;
- 100% test coverage;
- a full-browser E2E matrix;
- external AI provider integration;
- a custom domain;
- full Supabase infrastructure management through Terraform;
- product feature expansion;
- redesign; and
- unrelated refactoring.

## 5. Completion Evidence Matrix

[CD-C1 merged source and CD-C2A/B runtime completion](./cd-c1-candidate-delivery.md)
establish dedicated E2E identity/credential separation: then 35 Terraform resources,
no-op baseline, exact-secret IAM verified, actual Supabase display name
`candidate_e2e`, Secret Manager version 1 ENABLED. CD-C2C provider activation is
COMPLETE; both providers are ACTIVE / disabled=false.
[R8 run `35411846680` / R9 closure](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure)
owns **CLOSED / PASS** isolated WIF proof: A/B/C **PASS**, exact source
`6c0b91579f2caff02e9e190249c4c4bd73e877d1`, attempt 1. R7 remediation runtime
verification is **PASS**; R2/R4/R6 failures remain Historical. This closes only
the specified Deploy positive, Deploy-provider-to-E2E negative and E2E positive
authentication/isolation contracts. At that R8/R9 checkpoint, full automatic CD
proof and Must 4 remained Open. C4D below closed that delivery gap; Must 3 was
still In progress at C4D. OBS-D2A/B below closes Must 3; existing CD-B2 Deploy
WIF / PE-P1C-01B remains Closed.

[C3F/G/H incident evidence](./cd-c3-e2e-recovery-contract.md#c3f--c3g-incident-and-c3h-diagnosis)
subsequently proves candidate delivery, E2E/cleanup and verify-candidate PASS for
run `35421684166`, source `8ac592abcfeee607229fada3f5685e8c1630ddef`, attempt 1.
C3G promotion failed after Backend promotion; automatic rollback restored the
exact previous production pair, with post-rollback smoke PASS. The technical
root cause and missing workflow-recorded rollback field remain NOT PROVEN.
C3I fixed the proven diagnostic durability defect and passed Fresh Result Audit.
Later [C3K run `35442981748` and C3M source contract](./cd-c1-candidate-delivery.md#c3k-incident-and-c3m-api-failure-diagnostics)
record candidate/E2E/cleanup/verify PASS and production promotion FAIL at source
`ba9ddf34b401355fa9ab98d87dec054ca4c8165f`. C3I promotion and rollback diagnostics
are runtime proven for those observed failures: `RUN_API_FAILED` at
`backend-traffic-update` and `backend-rollback-update`, with workflow rollback
`HUMAN_DECISION_REQUIRED`. Independent historical read-back found the previous
pair restored with smoke PASS; C3K technical root cause remains **NOT PROVEN**.
C3M added API failure provenance using fixed kind/stage enums. Later
[C3N run `35490314562` / C3O diagnosis / C3P source](./cd-c1-candidate-delivery.md#c3n-runtime-evidence-c3o-diagnosis-and-c3p-http-status)
records candidate/E2E/cleanup/verify PASS and production FAIL at main
`5586ca9fafa7b9b42170cf261e49a9d24bdd8023`, required CI `35488494492` SUCCESS.
C3N runtime-proved `HTTP_STATUS / OPERATION_GET`; the HTTP integer was not captured.
At C3O, root cause was **PENDING_EVIDENCE**, with exact historical effective
permission UNKNOWN; C3P's source-only validation was initially **runtime NOT YET**.
The historical C3N terminal state was the previous pair at 100%, candidates at 0%,
activation UNCONFIGURED. Those phase records are preserved, not current blockers.

[C3P → C3R2 → C3S → C3U → C3V closure](./cd-c1-candidate-delivery.md#c3u-and-c3v-runtime-closure)
now establishes **C3 runtime chain CLOSED**: numeric 403 / Operation GET PROVEN,
missing effective allow PROVEN, exact one-permission remediation applied and
runtime PROVEN, authorization defect CLOSED, then fresh production release
`35545739898` SUCCESS at `cc608aa5f2edbd81952024d497bdc5838b796599` (required CI
`35507087914` SUCCESS / attempt 1). C3U added 2 resources with 0 changes/destroys;
Terraform state at C3U was **37** and its post-apply plan was **0/0/0**. C3V proves
the manually dispatched path through production approval, Backend then Frontend
promotion and post-deploy verification. At C3W closure, pair `cd-35545739898-1` was
100% on both services and activation was again UNCONFIGURED. The diagnosed missing effective
allow is **PROVEN and CLOSED**; historical C3N/C3P incident root cause remains
**STRONGLY_SUPPORTED_NOT_PROVEN**. C3N's HTTP integer is absent; C3P's 403 and
later exact Operation evaluations strongly support IAM causation, but neither
the no-mutation continuity evidence nor C3V success reconstructs the original
GET authorization decision. The closure record gives the alternatives and
reassessment conditions. C3G/C3K root causes remain Historical / NOT PROVEN.

The former broad rollback-verification gap is closed for C3 restoration and
diagnostic durability by combined C3G actual previous-pair restoration/smoke PASS,
C3K workflow-recorded failure diagnostics and C3U exact rollback Operation GRANTED.
These satisfy the bounded evidence needed to preserve the paired rollback
contract without inventing a new C3V rollback; C3V's rollback field is null.
C3G's missing diagnostic and unrecorded full authenticated post-rollback browser
coverage are not newly proven. The runbook still requires its checks whenever a
rollback occurs; this contract does not require an induced production failure
after every remediation. Historical unknowns are not silently reclassified.

**Must 4 Closed — C4D automatic runtime closure.** [PR #114](https://github.com/tyosu131/Workout-Journal/pull/114)
merged as `03f45f3b7ba2d48040cffcb2130318717a1e9d09`; main CI `35572912520`
SUCCESS / attempt 1 automatically triggered `workflow_run` CD `35573153822`,
SUCCESS / attempt 1, with exact CI ID/attempt/source binding. Build
`b53e2ad8-8e66-4f98-a3f6-f4a380f383c8` produced immutable paired candidate
`cd-35573153822-1`. E2E was 8/8 PASS, HTTPS cookie verified, cleanup PROVEN_ZERO,
receipt PERSISTED and evidence PASS. Manifest/E2E hashes matched; verify succeeded.
GitHub's review-history API confirmed Human approval by `tyosu131` for the
`production` Environment. Backend then Frontend promotion and post-deploy verification
passed. At the Historical C4D checkpoint, production was `cd-35573153822-1`, both services at 100%,
with exact manifest digests and Backend tagged URL. Activation is UNCONFIGURED;
the automatic path succeeded without the manual latch. The [one-to-one requirement mapping](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure)
records PASS for every Must 4 requirement. **Remaining gap: None.**

Historical C4B run `35557989507`, source `719b22f246ed63f5512e9efff6773e6309dc0ad1`,
followed successful main CI `35557808342`, attempt 1. Trigger through E2E WIF passed,
but the nested Playwright metadata omission caused failure before step 1; cleanup
was PROVEN_ZERO and production skipped. C4C's source fix is now runtime PROVEN by
the fresh successful automatic run; the failure record is preserved. The C3 manually
dispatched proof remains separate. Existing bounded rollback evidence above remains
sufficient; C4D did not execute rollback or induce a failure. Other Must statuses
are unchanged, and the separate C4D Fresh Result Audit/Portfolio final audit is not
claimed by this documentation closure.

**Must 3 Closed — OBS-D1/D2A/B.** The [durable runtime record](./verification.md#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure)
closes the exact remaining Monitoring scope after reviewed merged-source plan,
Human apply, read-back and no-drift verification. Terraform now owns **42 resources**,
including the existing enabled Monitoring API adopted by import, one uptime check,
two alert policies and one enabled email channel. All 42 planned actions are no-op.
The [ownership matrix](./portfolio-infra-ownership.md#approved-ownership-matrix)
keeps Cloud Run services/probes CD-owned and Logging API externally owned.
The privately supplied notification destination is personal metadata persisted in
state by explicit Human decision; credentials and Secret Manager payloads remain
excluded. **Remaining Must 3 gap: None.**

**Must 5 Closed — OBS-D3D/E runtime proof and OBS-D3F durable closure.**
[Exact requirement mapping and final evidence](./verification.md#obs-d3f-final-observability-documentation-closure)
record health/probes and USA uptime PROVEN, two safe structured failure events
from attempt 2, two candidate 5xx and service-wide aligned value 2, Backend
incident OPEN/CLOSED, and Human-confirmed firing/recovery email receipt.
The inspection/recovery procedure is implemented. **Remaining Must 5 gap: None.**
Attempt 1 remains separate Historical supporting evidence. Must 3 and Must 4
remain Closed; no identity/build hardening requirement is inferred. Automatic
default-SA-grant prevention remains Backlog / separate hardening.

`Closed` requires implemented and reviewed evidence. A plan, design, partial implementation, or unverified external setting is not sufficient.

| Must | Status | Evidence | Remaining gap | Owner phase |
| --- | --- | --- | --- | --- |
| 1. Documentation consistency | In progress | Current code, release record, deployment runbook, and P0 documentation sync | Complete P0 sync, keep later docs current, and pass final stale-claim audit | P0 + Final Portfolio Audit |
| 2. Automated production-like E2E smoke | Closed | P2A local isolated foundation plus P2B actual HTTPS 0% candidate proof: run `p2b-1788593776629-9943a84c9ea7c644` passed login, note create/autosave/read, tag create/use/delete, Calendar, Analytics and logout on exact paired candidate `p2b-081adb25`; production traffic stayed 100%, Auth/profile/notes/user_tags residuals were zero and sanitized evidence passed leak inspection. Implementation and proof were freshly reviewed on 2026-09-05; the [durable E2E evidence record](./e2e-smoke-runbook.md#p2b-verified-candidate-proof) does not depend on local JSON availability | None for Must 2; CD integration and production promotion remain separately gated under Must 4 | P2A + P2B |
| 3. Infrastructure as Code / Identity | Closed | P1B imported the eight-resource existing GCP foundation without cloud resource mutation; P1C-A added the disabled keyless WIF foundation; P1C-B added and verified the exact 13-member operational least-privilege IAM layer; P1C-C verified dedicated Build execution from exact commit `709c55a934783917184d09831facc085e7bc19c9`, including both immutable image digests and Cloud Logging, without Cloud Run mutation; P1C-D found zero current active Compute default SA dependencies; after a separate Human Gate, P1C-D2 removed only its legacy project-level `roles/editor` binding outside Terraform; post-removal lightweight production verification passed. CD-B2 applied the exact provider update, confirmed actual `ACTIVE` / `disabled = false`, and closed [PE-P1C-01B with runtime evidence](./wif-submission-proof.md#cd-b2-verified-runtime-proof) on 2026-09-06. At CD-B2 closure Terraform had 30 resources with a no-op post-plan. CD-C2A provisioned five E2E resources, giving 35; CD-C2B verified the no-op baseline and dedicated key/version 1. CD-C2C provider activation is COMPLETE; R8 run `35411846680` at source `6c0b91579f2caff02e9e190249c4c4bd73e877d1` closes isolated A/B/C WIF proof with all checks PASS and runtime-verifies R7 remediation. C3U added the two C3S Operation IAM resources: then-state 37, post-plan 0/0/0, remediation runtime PROVEN. [OBS-D1/D2A/B](./verification.md#obs-d2a-post-apply-runtime-evidence-and-obs-d2b-closure) completes reviewed merged-source plan, Human apply (1 import / 4 add), Monitoring API adoption, uptime/channel/two-policy read-back and three-location uptime PASS; current state 42, serial 10, all 42 planned actions no-op, no Terraform/CD ownership conflict | None | P1 + IaC + OBS-D1/D2A/B |
| 4. Continuous Delivery | Closed | [C4D automatic runtime closure and requirement mapping](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure): PR #114 / main `03f45f3b7ba2d48040cffcb2130318717a1e9d09` → CI `35572912520` SUCCESS / attempt 1 → automatic workflow_run CD `35573153822` SUCCESS / attempt 1. Exact CI/source binding, OIDC/WIF, Build `b53e2ad8-8e66-4f98-a3f6-f4a380f383c8`, immutable paired 0% candidates, 8/8 E2E, PROVEN_ZERO cleanup, matching hashes, Human production Environment approval, Backend then Frontend promotion and post-deploy PASS. Historical C4D pair `cd-35573153822-1` at 100% each; activation UNCONFIGURED at that checkpoint. C3 bounded rollback evidence retained; no C4 rollback claimed | None | CD phase / C4D closure |
| 5. Observability | Closed | [OBS-D3F final evidence and exact requirement mapping](./verification.md#obs-d3f-final-observability-documentation-closure): health/probes and USA uptime PROVEN; attempt 2 safe structured failure runtime PROVEN; Backend alert incident OPEN/CLOSED and Human firing/recovery email delivery PROVEN; inspection/recovery procedure IMPLEMENTED | None | OBS-D3D/E runtime + OBS-D3F documentation closure |
| 6. Security / Repository Governance | Open | Existing CI and secret-safety boundaries exist; `main` is protected by a strict, GitHub-Actions-pinned required check; temporary PR #91 proved merge blocking with no CI result and availability after the required CI succeeded | Add static security scanning and dependency/security automation | Security / Governance phase |
| 7. Portfolio presentation | Open | Current READMEs and technical documents provide partial product and architecture coverage | Complete the P6 README and repository-surface rewrite, including a verified live URL and bilingual consistency | P6 |
| 8. Repository maturity / final evidence | Open | Known-good v1 production release record exists | Set metadata/topics, publish a GitHub Release, decide license policy, eliminate stale docs, and pass final audit with zero Must findings | Repository Maturity + Final Portfolio Audit |

## 6. P6 README Gap Register

P0 does not perform the final README rewrite. P6 must resolve and verify at least:

- the exact Live production URL;
- screenshots or other appropriate visual evidence;
- a complete current feature list;
- Analytics, Growth Signals, Tags, and RPE/RIR coverage;
- the current architecture;
- Cloud Run, Cloud Build, and Artifact Registry responsibilities;
- CI/CD;
- Terraform and Workload Identity Federation;
- automated E2E strategy and evidence;
- security boundaries and governance;
- observability;
- production, candidate-pairing, promotion, and rollback strategy;
- important design decisions;
- links to current technical documentation; and
- material English/Japanese consistency.

The Live URL must come from verified current evidence; it must not be inferred from a Backend tagged URL or an obsolete deployment record.

## 7. Scope Decision Rule

For every new finding or improvement proposal, record:

```text
Candidate:
Which Portfolio Must would fail without it?:
Concrete evidence:
Classification:
- Portfolio Must
- Human Decision
- Pending Evidence
- Backlog / Separate project
```

General desirability, novelty, or portfolio polish alone does not promote work into the Must scope. Security, secret exposure, data integrity, and release-contract defects remain eligible for Must classification when supported by concrete evidence.
