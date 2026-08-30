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

The current production release evidence is the [v1 production release record](./releases/workout-journal-v1.md). The [Cloud Run deployment runbook](./cloud-run-deployment-runbook.md) defines the current deployment, candidate-pairing, promotion, redeploy, and rollback contract.

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

**Verified Portfolio Gap:** External repository inspection confirmed that `main` branch protection is disabled and required status checks are not configured. These gaps must be closed in the Security / Repository Governance phase. They do not reopen the completed v1 release.

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

`Closed` requires implemented and reviewed evidence. A plan, design, partial implementation, or unverified external setting is not sufficient.

| Must | Status | Evidence | Remaining gap | Owner phase |
| --- | --- | --- | --- | --- |
| 1. Documentation consistency | In progress | Current code, release record, deployment runbook, and P0 documentation sync | Complete P0 sync, keep later docs current, and pass final stale-claim audit | P0 + Final Portfolio Audit |
| 2. Automated production-like E2E smoke | Open | Manual v1 production smoke is recorded in the release record | Implement and verify automated candidate coverage for every required workflow | Automated E2E phase |
| 3. Infrastructure as Code / Identity | In progress | P1B imported the eight-resource existing GCP foundation without cloud resource mutation; P1C-A added the disabled keyless WIF foundation; P1C-B added and verified the exact 13-member operational least-privilege IAM layer, bringing remote state to 30 resources with a zero-drift post-apply plan | Complete P1C-C dedicated build-identity migration and verification, provider activation after GitHub safeguards/CD readiness, and subsequent build-identity hardening | P1 + IaC phase |
| 4. Continuous Delivery | Open | CI, Cloud Build image creation, and the manual candidate/promotion/rollback runbook exist | Add keyless GitHub OIDC/WIF CD, automated candidate smoke, approval, promotion, and post-deploy evidence | CD phase |
| 5. Observability | Open | Sanitized failure summaries and manual inspection guidance exist | Add health/probe, structured logging, availability monitoring, actionable alerting, and recovery evidence | Observability phase |
| 6. Security / Repository Governance | Open | Existing CI and secret-safety boundaries exist | Add static scanning and dependency/security automation; protect `main`; configure required status checks | Security / Governance phase |
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
