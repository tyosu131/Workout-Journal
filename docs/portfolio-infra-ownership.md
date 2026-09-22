# Portfolio Infrastructure Ownership

- **Decision status:** Approved for Portfolio Finish P1
- **Implementation status:** P1B existing-production adoption, P1C-A disabled-WIF foundation, P1C-B operational least-privilege IAM, P1C-C dedicated Build execution, P1C-D dependency audit, and P1C-D2 Compute default SA Editor cleanup complete. CD-B2 activated the provider and closed PE-P1C-01B by runtime proof on 2026-09-06; actual provider is `ACTIVE` / `disabled = false`, and its historical post-apply plan was `0 add / 0 change / 0 destroy` with 30 resources. C3U applied the two-resource C3S IAM remediation: current state 37, post-plan 0/0/0, authorization defect CLOSED. C3V manual release and C4D automatic release succeeded; Must 3 remains In progress, while Must 4 is Closed
- **Scope ceiling:** [Portfolio Completion Contract Must 3 and Must 4](./portfolio-completion-contract.md)
- **Production contract:** [Cloud Run deployment runbook](./cloud-run-deployment-runbook.md)

## Core ownership rule

CD-C1's [dedicated E2E identity and gated delivery source](./cd-c1-candidate-delivery.md)
is merged. **CD-C2A/B are COMPLETE**: five additional resources are provisioned,
giving **35 applied resources / no-op baseline at CD-C2B**. E2E secret access is runtime
verified and exact-resource scoped; existing Deploy/Build grants are unchanged.
Supabase key display name is `candidate_e2e`; Secret Manager version 1 is ENABLED.
CD-C2C provider activation is COMPLETE: both providers are ACTIVE / disabled=false.
[R8 run `35411846680` / R9 closure](./cd-c1-candidate-delivery.md#cd-c2d-r8-runtime-proof-and-r9-closure)
owns isolated WIF proof **CLOSED / PASS**, A/B/C **PASS**, source
`6c0b91579f2caff02e9e190249c4c4bd73e877d1`, attempt 1. R7 remediation is runtime
verified; R6's fixed-path failure remains Historical. R8 proves only the specified
Deploy positive, same-STS-token Deploy-to-E2E denial and E2E positive paths.
The [C3U/C3V closure](./cd-c1-candidate-delivery.md#c3u-and-c3v-runtime-closure)
now proves the manually dispatched production path; C3 runtime chain is CLOSED.
Must 3 stays In progress; Must 4 is Closed by [C4D](./cd-c1-candidate-delivery.md#c4d-automatic-production-delivery-runtime-closure).
Automatic run `35573153822` proves the fixed E2E path (8/8 PASS, PROVEN_ZERO cleanup),
verify, Human production approval and promotion/post-deploy SUCCESS. Current pair
`cd-35573153822-1` is 100% on both services; C3V and failed C4B pairs are 0%.
[C4C](./cd-c1-candidate-delivery.md#c4c-nested-playwright-authority-remediation) retains
the earlier failure and now runtime-proven fix. No infrastructure ownership,
provider condition or IAM change is needed. `CD_C1_ACTIVATION` is UNCONFIGURED and
now gates manual release only; qualified automatic release still requires production
Environment Human approval. R9 changed no IAM/WIF
configuration and performs no runtime execution or new cloud metadata check.
C3A later proved Build and paired 0% candidate creation but failed E2E cleanup proof.
[C3C](./cd-c3-e2e-recovery-contract.md) returned activation to UNCONFIGURED and adds
merged future recovery safety (PR #106, post-merge CI PASS) without changing
infrastructure ownership; C3F/C3V later proved the successful path. C3A's historical scenario is
NOT PROVEN and cleanup execution UNPROVEN. [C3D](./cd-c3-e2e-recovery-contract.md#c3d-current-residual-closure)
closed current residual uncertainty: PROVEN_ZERO under verified current schema
contract. C3E changes documentation only; monitoring/alert scope is unchanged.

Terraform and CD must not compete for the same mutable production state.

**Cloud Run services themselves remain CD-owned.** The application image, revision template, environment/runtime configuration, Secret Manager version references, candidate tag, traffic allocation, promotion, and rollback pair form one mutable delivery contract already governed by CD and the runbook. Terraform therefore does not define or import `google_cloud_run_v2_service`, and broad `ignore_changes` is not the selected design.

## Approved ownership matrix

| Resource or state | Ownership | Current status and boundary |
| --- | --- | --- |
| Dedicated GCS Terraform state bucket | Terraform Owns | Manually bootstrapped, verified, imported, and used by the initialized GCS backend |
| Artifact Registry repository `workout-journal` | Terraform Owns | Imported into remote state; zero-drift verified |
| Backend and Frontend runtime Service Accounts | Terraform Owns | Both existing runtime identities are in remote state; zero-drift verified |
| Secret Manager secret metadata | Terraform Owns | Three metadata-only resources (Backend, JWT, dedicated E2E) are in remote state; secret versions and values remain excluded |
| Backend runtime access to the two secrets | Terraform Owns | Two exact additive `secretAccessor` members are in remote state; zero-drift verified |
| IAM, Cloud Resource Manager, IAM Credentials, and STS APIs | Terraform Owns | Four prerequisite `google_project_service` resources are enabled and protected from disable-on-destroy |
| Deploy Service Account `workout-journal-deploy` | Terraform Owns | Keyless identity with exact P1C-A impersonation and P1C-B operational additive members; CD-B2 verified its submission path under GitHub WIF |
| Build Service Account `workout-journal-build` | Terraform Owns | Keyless identity with exact P1C-B build permissions; P1C-C runtime-verified its repository build, two image pushes, and Cloud Logging path |
| WIF pool `github-actions` and provider `workout-journal` | Terraform Owns | Actual pool is `ACTIVE` / `FEDERATION_ONLY`; actual provider is `ACTIVE` / `disabled = false`, matching desired state after CD-B2; no pool or trust change |
| Deploy-SA WIF impersonation member | Terraform Owns | Exact additive `roles/iam.workloadIdentityUser` member scoped to repository ID `790375516` |
| E2E SA, exact-secret Accessor, E2E provider and impersonation member | Terraform Owns | CD-C2A provisioned; zero SA keys; `attribute.e2e_boundary/candidate-e2e-v1` separates the mapped grant; actual provider ACTIVE / disabled=false after CD-C2C; isolated A/B/C proof CLOSED / PASS for R8's exact run/source |
| P1C-B operational IAM members | Terraform Owns | Exactly 13 additive members are in remote state and actual IAM; zero-drift verified |
| C3S Operation reader custom role and Deploy SA project member | Terraform Owns | C3U applied exactly 2 additions; `workoutJournalRunOperationReader` has only `run.operations.get`; exact Deploy SA binding and service grants runtime verified |
| Policy Troubleshooter API | External / Manually Managed | ENABLED; not Terraform-owned; cleanup/codification DEFERRED, with no inferred Portfolio Must |
| Cloud Run services, image, revision, env, secret-version refs, tags, and traffic | CD Owns | No Terraform resource or import |
| Cloud Build source bucket body `workout-journal-506909_cloudbuild` | External / Manually Managed | Terraform owns only the three exact P1C-B additive bucket IAM members, not the bucket body or legacy members |
| Candidate creation, promotion, post-deploy verification, and rollback pair | CD / runbook Owns | Must preserve the current paired-release contract |
| Human Owner bindings and Google-managed service agents | External / Manually Managed | Terraform must not adopt them |
| BigQuery Data Transfer service-agent binding | External / Google-managed | Google-managed `roles/bigquerydatatransfer.serviceAgent` binding for `service-437413312066@gcp-sa-bigquerydatatransfer.iam.gserviceaccount.com`; preserved outside Terraform ownership |
| Supabase infrastructure | External / Manually Managed | Outside Terraform scope |
| `main` branch protection | External / Manually Managed | Current / Implemented and functionally verified with the strict required GitHub Actions check `Lint, build, and test baseline` pinned to app ID `15368`; not Terraform-owned |
| GitHub production Environment | External / Manually Managed | Current / Implemented and verified by configuration read-back; exact owner reviewer, no administrator bypass, branch `main` only; not Terraform-owned |
| Secret versions, values, and payloads | Do Not Manage | Never enter Terraform configuration, plan, or state |
| Compute default Service Account | Do Not Manage | The Service Account body still exists and remains enabled. Its former project-level `roles/editor` grant was removed outside Terraform after the P1C-D dependency audit and a separate P1C-D2 Human Gate; neither the Service Account nor that former binding is Terraform-owned |
| Legacy Cloud Build Service Account | Do Not Manage | Not an adoption target |
| Service Account keys and long-lived GCP JSON credentials | Do Not Manage | Keyless federation is required |
| Monitoring API, uptime, two alert policies and email channel | Terraform Owns / desired state implemented | OBS-B/C source/offline verified; existing Monitoring API imported at later apply; NOT APPLIED, runtime NOT YET |
| Cloud Run revision health probes | CD Owns | Backend HTTP startup/liveness transition is verified in candidate configuration; no Terraform service body |
| Logging API | External prerequisite | OBS-A read-back ENABLED; no ownership change |

Monitoring and alert resources are the concrete remaining Must 3 resource gap
under the [Completion Contract](./portfolio-completion-contract.md#must-3-infrastructure-as-code--identity).
OBS-B/C implements that scope. Fresh merged-source plan, Human apply, read-back
and no-drift remain. Human selected a Terraform-owned email channel: the address
is supplied through `monitoring_notification_email` with no default and is never
committed or output. It is personal destination metadata stored in Terraform state,
an explicitly accepted design; secret payloads remain excluded. Applied state stays
37 resources until the separately approved one-import/four-add plan produces 42.
R8 closes the isolated WIF prerequisite only. No new identity/build hardening
requirement is inferred; automatic default-SA-grant prevention remains the
Backlog / separate hardening item recorded below.

The current remote state contains exactly **37 resources**: the eight-resource P1B foundation, nine-resource P1C-A identity foundation, 13-resource P1C-B operational IAM layer, five-resource CD-C2A E2E boundary and two-resource C3S Operation IAM remediation applied in C3U. C3U's post-apply plan was 0/0/0; existing project bindings and service-level Developer grants were preserved. CD-C2B's historical 35-resource baseline was no-op. Historical P1C-B added 13 without changing existing resources; CD-B2 applied one Deploy-provider update with a zero-change post-plan. See the [historical activation and computed-drift checks](../infra/terraform/README.md#completed-cd-b2-provider-activation). CD-C2C activation is complete; R1's historical read-only plan was No changes / exit 0 with no IAM change in that phase.

## CD-owned delivery contract

Terraform does not own any step below:

```text
main merge
-> CI success
-> GitHub OIDC / GCP WIF authentication
-> Cloud Build invocation
-> immutable Backend and Frontend digest resolution
-> new CANDIDATE_ID
-> Backend 0% candidate deployment
-> exact Backend tagged URL capture and verification
-> Frontend 0% candidate deployment with that exact URL
-> automated production-like E2E smoke
-> production Environment approval
-> Backend promotion
-> Frontend promotion
-> post-deploy verification and evidence
-> paired rollback by recorded revision names when required
```

Each release attempt gets a never-reused `CANDIDATE_ID`. A Backend tag referenced by a known-good or rollback-eligible Frontend revision is not moved or removed. Rollback restores the compatible revision pair recorded by the runbook; Terraform does not reconstruct or reconcile it.

## Completed P1C-A identity foundation and P1C-B operations

P1C-A created and verified the identity foundation in Terraform with its GitHub provider initially disabled. Its only new IAM grant was the additive repository-ID-scoped `roles/iam.workloadIdentityUser` member on the dedicated deploy Service Account. No operational deploy/build role was part of P1C-A; CD-B2 subsequently enabled the provider without changing IAM.

The CD-B2-verified GitHub Actions authentication path uses keyless Service Account impersonation:

```text
GitHub Actions OIDC
-> workload identity pool github-actions
-> provider workout-journal
-> repository/branch/workflow-constrained principal
-> workout-journal-deploy Service Account impersonation
```

The provider maps:

```text
google.subject                = assertion.sub
attribute.repository_owner_id = assertion.repository_owner_id
attribute.repository_id       = assertion.repository_id
attribute.repository_owner    = assertion.repository_owner
attribute.repository          = assertion.repository
attribute.ref                 = assertion.ref
attribute.workflow_ref        = assertion.workflow_ref
```

The provider trust condition requires all of:

```text
repository_owner_id == 95160728
repository_id       == 790375516
repository_owner    == tyosu131
repository          == tyosu131/Workout-Journal
ref                 == refs/heads/main
workflow_ref        == tyosu131/Workout-Journal/.github/workflows/cd.yml@refs/heads/main
```

Numeric owner/repository IDs are the stable trust anchors; name checks provide defense in depth and make intent reviewable. P1C-A owns `roles/iam.workloadIdentityUser` on the deploy Service Account, limited to repository ID `790375516` through the mapped repository principal. CD-B2 read-back confirmed actual provider `ACTIVE` / `disabled = false` after applying CD-B1's activation and neutral description. All trust conditions above, mappings, issuer, pool and IAM remain unchanged. P1C-B owns only the exact additive permissions needed to invoke Cloud Build and perform the approved Cloud Run delivery contract, including `actAs` only for the dedicated build and approved runtime Service Accounts. It grants no Secret Manager payload access.

Google requires mappings for claims used in provider conditions and recommends restricting a shared GitHub issuer with an attribute condition. GitHub documents `repository_owner_id`, `repository_id`, `repository_owner`, `repository`, `ref`, and `workflow_ref` as OIDC token claims. See [Google Cloud deployment-pipeline federation](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) and the [GitHub OIDC claim reference](https://docs.github.com/en/actions/reference/security/oidc).

## Production Environment and activation dependency

The GitHub `production` Environment is Current / Implemented and verified by
actual configuration read-back on 2026-09-05:

| Setting | Verified current value |
| --- | --- |
| Environment | `production` (ID `21297410440`) |
| Required reviewer | Exactly one User: repository owner `tyosu131`, numeric ID `95160728` |
| Prevent self-review | `false` |
| Wait timer | `0`; no active wait-timer rule |
| Administrator bypass | Disabled; actual `can_admins_bypass = false` |
| Deployment policy mode | `protected_branches = false`, `custom_branch_policies = true` |
| Deployment branch | Exactly one policy: `name = main`, `type = branch` (ID `59168511`) |
| Tag policies / other patterns | None |
| Environment secrets / variables | `0` / `0`; none added |

The Environment and branch policy were created through documented REST endpoints.
The owner disabled administrator bypass in the GitHub UI; a subsequent GET returned
`can_admins_bypass = false` (Environment `updated_at = 2026-09-05T08:36:40Z`).
The reviewer ID matches the authenticated owner and repository owner. Read-back of
the complete branch-policy collection confirmed only the exact `main` branch rule;
no wildcard, tag policy or unexpected protection rule is configured.

This is an explicit owner release checkpoint for a solo project, not independent four-eyes approval.
This verifies configuration, not an executed deployment-approval or bypass test.
No workflow was created or activated during that Environment configuration phase.
Subsequent CD-A repository implementation added a [manual submission-proof workflow](./wif-submission-proof.md)
at `cd.yml`, not an Environment approval job or full CD. CD-B2 activated WIF and
verified one manual submission-proof run; it did not exercise Environment approval.
Main protection and Environment configuration were unchanged in CD-B2. C3V later
exercised the production approval and delivery path successfully; current release
activation is UNCONFIGURED after that completed run.

The required delivery sequence remains:

```text
Terraform/WIF foundation
-> main branch protection + required CI checks
-> automated candidate E2E
-> production Environment configuration
-> keyless WIF/CD integration
-> CD activation
```

Current status of that sequence:

| Dependency | Current status |
| --- | --- |
| Terraform/WIF foundation | Implemented; CD-B2 applied the exact provider update, actual `ACTIVE` / `disabled = false`, post-apply plan zero-change |
| `main` branch protection + required CI | Implemented and functionally verified |
| Automated candidate E2E | Implemented and runtime-verified: P2A local foundation plus P2B HTTPS 0% candidate `p2b-081adb25`; all required browser steps, exact cleanup and unchanged production traffic verified |
| GitHub production Environment | Implemented and configuration-verified; C3V runtime approval integration and production job SUCCESS |
| Keyless WIF/CD integration | CD-B2 and R8 proofs retained; C3U least-privilege IAM remediation PROVEN; C3V manually dispatched full production delivery SUCCESS. C4D full automatic E2E/release is runtime PROVEN; Must 4 Closed |
| Production CD activation | C3V was separately activated and approved; current `CD_C1_ACTIVATION` UNCONFIGURED. Manual activation/release needs its Human Gate. C4B automatic start instead requires exact successful main CI; production Environment approval remains Human-gated; C4D full automatic delivery SUCCESS without the manual latch |

The automated candidate E2E prerequisite is now satisfied; see the [P2B proof](./e2e-smoke-runbook.md#p2b-verified-candidate-proof).
The production Environment prerequisite and full automatic-delivery path are satisfied:
C4D passed the fixed E2E/verify path, Human production approval, paired promotion
and post-deploy verification. Must 4 is Closed with no remaining delivery gap;
Must 3 monitoring/alert resources and Must 5 Observability remain open work.
CD-B2 closed the separate `PE-P1C-01B` Deploy-SA/WIF submission evidence. Historically, P2B did not
activate the provider, create an Environment, implement CD, promote traffic or
close Must 4; this subsequent Environment setup does not activate WIF/CD or
authorize production promotion.

P2B tested application source `9b6c3c69543784b3e02e4fd9b45d8e7a4b34300d`
with runner changes on `test/portfolio-p2b-candidate-proof`. The Backend and Frontend
revisions `workout-journal-backend-p2b-081adb25` and
`workout-journal-frontend-p2b-081adb25` remain at 0%, sharing tag
`candidate-p2b-081adb25`. The Frontend points to the exact Backend tagged URL,
not the production service URL. At P2B, production remained `00003-luc` / `00003-xar`
at 100%, with the known-good `candidate-0829-923536` pair intact. C3V subsequently
promoted `cd-35545739898-1`; C4D now serves `cd-35573153822-1` at 100%, with both
older production pairs at 0%. These revisions,
tags, images and configuration remain outside Terraform ownership; keeping this
proof pair does not authorize tag reassignment or deletion.

Actual GitHub read-back confirms `main` is protected. The rule requires a pull request with zero approving reviews, enforces administrators, requires conversation resolution, and requires the strict `Lint, build, and test baseline` check from GitHub Actions app ID `15368`. Force pushes and deletions are disabled; linear history and branch locking are not required; restrictions are unset. No repository ruleset overlapped when the protection was applied.

Temporary PR #91 provided functional evidence without entering `main`. Its first head, `b92c52c710f9408ea007f0e1832dda6a201959e5`, used `[skip ci]`; it had zero check runs and was `BLOCKED` even though Git reported it mergeable. Its second head, `ec28344de2d9a49a3bf926416c987e0e2125ea6c`, received two successful `Lint, build, and test baseline` checks because CI runs on both `push` and `pull_request`, after which the PR became `CLEAN`. The PR was closed unmerged and the temporary branch was deleted locally and remotely. The duplicate CI executions are a separate optimization opportunity, not a safeguard defect.

Branch protection was not created by P1C-A and remains externally/manually managed rather than Terraform-owned. The production Environment is likewise externally/manually managed; its verified configuration above comes from actual GitHub read-back, not workflow files. See GitHub's official documentation for [deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) and [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Dedicated build identity decision

The dedicated build Service Account has the exact P1C-B Artifact Registry writer, Cloud Logging writer, and source-object viewer members. P1C-C runtime-verified that role set for the repository build path. The deploy Service Account has the exact build invocation, Service Usage, resource-scoped Artifact Registry/Cloud Run/Storage, and three `actAs` members. CD-B2 runtime-verified its submission path under GitHub WIF without adding IAM grants.

P1C-B correction closure: future `gcloud builds submit` runs as the dedicated deploy Service Account and stages local source into `workout-journal-506909_cloudbuild`. The current 13-member layer therefore includes deploy `roles/storage.objectCreator` and `roles/storage.bucketViewer` on that exact bucket, plus project `roles/serviceusage.serviceUsageConsumer` for `serviceusage.services.use`. The previous `10 add` and intermediate `12 add` expectations are historical and obsolete.

P1C-C selected `projects/workout-journal-506909/serviceAccounts/workout-journal-build@workout-journal-506909.iam.gserviceaccount.com` in `cloudbuild.yaml` and preserved `CLOUD_LOGGING_ONLY`. Human-gated build `44a37101-eb7c-4f12-8901-5b3854afd7ae` completed with `SUCCESS` from exact tested commit `709c55a934783917184d09831facc085e7bc19c9`; build metadata confirmed that dedicated Build Service Account as the actual execution identity and the logs were readable.

`PE-P1C-01A — Dedicated Build execution` is Closed by that build. The verified scope is repository source build, Backend and Frontend Docker builds, Backend and Frontend Artifact Registry pushes, and Cloud Logging. The exact-SHA verification artifacts resolve to immutable digests:

- Backend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-backend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:a36a6e9ee78ab59c8de5eccd1595bb740342e31b896acea0cb20aed1d8614c04`
- Frontend: `asia-northeast1-docker.pkg.dev/workout-journal-506909/workout-journal/workout-journal-frontend:709c55a934783917184d09831facc085e7bc19c9` -> `sha256:d65af4c241e31658d684191f1d831b79d9bb6bd5b0043ea315affcd1ed0d7ea6`

They are P1C-C verification artifacts, not production-deployed images. Backend and Frontend Cloud Run state remained unchanged, and there was no Cloud Run Admin Activity during the build execution window.

`PE-P1C-01B — Deploy submission / WIF path` is Closed by [CD-B2 runtime evidence](./wif-submission-proof.md#cd-b2-verified-runtime-proof), separately from the earlier human-submitted P1C-C build. On 2026-09-06, run `34007295086` at SHA `0f0a677f196f43681d55d90f93350dd83cff841d` authenticated through GitHub OIDC/WIF as the dedicated Deploy SA and submitted successful Build `f7735982-2596-407d-bbe6-7c6d9c0adb50` using the dedicated Build SA. The Human-confirmed Job Summary reported PASS; independent read-back matched both immutable digests and unchanged Cloud Run.

CD-B2 created only the two repository variables `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, applied the exact provider update, and
executed one dispatch/Build with source staging and two proof-image pushes.
The proof images were not deployed. IAM grants, Service Accounts, GitHub secrets,
Environment settings and Cloud Run were unchanged; full mutation accounting is
in the linked evidence record. At CD-B2, production CD was inactive and full CD
credential delivery remained future work. C3V subsequently verified delivery
with the separate E2E identity/credential boundary; the Deploy SA still has no
Secret Manager payload access. Must 3 remains In progress and Must 4 is Closed by
C4D automatic runtime proof; current manual-release activation is UNCONFIGURED.

Compute default Service Account Editor removal was **not** part of initial creation. The approved boundary required all three gates:

```text
dedicated build succeeds
+ dependency audit confirms no other required use
+ separate Human Gate
```

All three gates are now satisfied. P1C-C proved the dedicated Build execution path. P1C-D audited Cloud Run, Cloud Build, Compute API state, enabled GCP services, repository references, IAM, Audit Logs, and Terraform, found zero current active dependencies, and returned `SAFE_CANDIDATE`. The only historical usage found was Cloud Build activity on 2026-08-28; the current build path uses `workout-journal-build@workout-journal-506909.iam.gserviceaccount.com`, so that historical activity is not a current dependency. P1C-D2 then passed its separate Human Gate and removed only the Compute default Service Account's project-level `roles/editor` binding outside Terraform.

Post-removal read-back confirms that `roles/editor` is absent while `437413312066-compute@developer.gserviceaccount.com` still exists, remains enabled, has zero user-managed keys, and has zero resource-level Service Account IAM bindings. P1C-D2 did not disable, delete, or adopt the Service Account into Terraform.

Cloud Run also remained unchanged: Backend revision `workout-journal-backend-00003-luc` runs as `workout-journal-backend-run@workout-journal-506909.iam.gserviceaccount.com`, Frontend revision `workout-journal-frontend-00003-xar` runs as `workout-journal-frontend-run@workout-journal-506909.iam.gserviceaccount.com`, and each retained 100% traffic plus candidate tag `candidate-0829-923536`. Post-removal lightweight production verification returned Frontend `/` `200` and Backend `/` `404`; it created no synthetic data and did not trigger password-reset or email workflows. This is not the full v1 production smoke. Terraform remained at 30 state resources and the post-removal plan remained zero-drift.

A read-only BigQuery Data Transfer API inspection during P1C-D caused Google to provision the service-agent binding `roles/bigquerydatatransfer.serviceAgent` for `service-437413312066@gcp-sa-bigquerydatatransfer.iam.gserviceaccount.com`; Audit Logs identified `service-agent-manager@system.gserviceaccount.com` as the actor. This Google-managed binding is unrelated to the Compute default SA cleanup, was preserved during P1C-D2, and remains outside Terraform ownership.

P1B created no new IAM binding and changed no existing cloud IAM policy. It adopted only the two previously verified additive Backend `secretAccessor` members. P1C-A added one additive, repository-scoped impersonation member. P1C-B added exactly 13 additive operational IAM members without taking authoritative ownership of any policy. Human members and legacy bucket IAM remain external. P1C-D2 later removed the single separately approved legacy Editor binding without changing Terraform ownership.

## Completed P1B state ownership and adoption record

In P1A, `workout-journal-506909-tfstate` was a candidate whose global availability was Pending Evidence. P1B confirmed availability by creating the dedicated bucket through its Human Gate, verified the complete bootstrap contract, and completed the following adoption sequence:

1. Verify the candidate bucket name is globally available.
2. With Human approval, manually bootstrap the bucket once using the approved settings.
3. Before adding the import block or initializing the backend, retrieve the actual bucket metadata with the read-only command below.
4. Confirm that every read-back property exactly matches the approved contract.
5. Stop if any property is absent or differs.
6. Add the state bucket import block.
7. Initialize the GCS backend.
8. Produce an imports-only plan for the bucket plus the seven verified existing targets.
9. Stop for the Human Gate and review the complete plan.
10. Apply only the reviewed eight imports.
11. Require a second plan of `0 to add, 0 to change, 0 to destroy`.

```bash
gcloud storage buckets describe \
  gs://workout-journal-506909-tfstate \
  --raw \
  --format=json
```

The read-back contract uses the actual raw API fields: `name` must be `workout-journal-506909-tfstate`; `projectNumber` must be `437413312066`, which is the approved project `workout-journal-506909`; `location` must be `ASIA-NORTHEAST1`, the API representation of `asia-northeast1`; `iamConfiguration.uniformBucketLevelAccess.enabled` must be `true`; `iamConfiguration.publicAccessPrevention` must be `enforced`; and `versioning.enabled` must be `true`. A successful create command alone does not pass this gate.

The read-back matched every required property before import and backend initialization. `force_destroy = false` and `prevent_destroy = true` are Terraform configuration protections rather than remote bucket properties and were not part of the read-back.

The reviewed imports-only plan and the import apply both reported no resource create, update, destroy, or replacement. The required post-import baseline plan reported:

```text
0 to add
0 to change
0 to destroy
```

At P1B closure, remote state contained exactly the eight approved resources. No secret values entered configuration, plan output, or state. No hardening, new identity, WIF, or IAM redesign was mixed into that adoption.

PE-1 is Closed by the successful eight-resource import and post-import zero-drift plan. PE-2 is Closed by the successful bucket bootstrap, exact property read-back, state-bucket import block, and initialized GCS backend.

## Human gates and deferred risk

| Action | Risk | Required gate / status |
| --- | --- | --- |
| State bucket bootstrap and first remote state | High | P1B complete: read-back verified, backend initialized, and zero-drift confirmed |
| Existing resource and IAM-member import | High | P1B complete: eight imports, no resource mutation, and zero-drift confirmed |
| Disabled WIF foundation and exact trust condition | High | P1C-A complete: initially disabled provider and exact trust verified; subsequent CD-B2 activation preserved that trust |
| Dedicated deploy/build SA creation | High | P1C-A complete: both identities exist with zero user-managed keys and no operational roles |
| P1C-B operational IAM | High | Complete: exact 13-member additive matrix applied, actual read-back matched, and zero-drift confirmed |
| P1C-C dedicated Build execution | High | Complete: build `44a37101-eb7c-4f12-8901-5b3854afd7ae` succeeded from exact commit `709c55a934783917184d09831facc085e7bc19c9` using the dedicated Build Service Account; Cloud Run remained unchanged |
| CD-B2 provider activation and Deploy-SA/WIF submission | High | Complete: exact saved-plan apply, post-apply zero-change, one successful workflow/Build, Human-confirmed Summary and independent read-back; PE-P1C-01B Closed |
| Compute default SA role removal | High | P1C-D2 complete: dedicated build succeeded, P1C-D returned `SAFE_CANDIDATE` with zero current active dependencies, separate Human Gate approved, and only the project-level `roles/editor` binding was removed |
| Prevent future automatic default-SA grants through Organization Policy | High | Backlog / separate hardening: `constraints/iam.automaticIamGrantsForDefaultServiceAccounts` is currently not enforced; this did not block P1C-D2 |
| Production CD activation | High | C3V verified the manually dispatched candidate/E2E/approval/promotion/post-deploy path; existing rollback evidence and its limits are recorded in the C3U/C3V closure. C4D automatic delivery closes Must 4. Manual activation UNCONFIGURED; manual release retains its Human Gate. C4B automatic start uses exact successful main CI authority without the latch; production Environment approval remains mandatory; automatic E2E/verify/promotion/post-deploy runtime PROVEN in `35573153822` |
| Cloud Run ownership change | High | Not approved; would require a new owner decision |
