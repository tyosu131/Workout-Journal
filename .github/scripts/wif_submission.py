"""CD-A only. No deploy, secret retrieval, IAM mutation or token output.

Uses the runner's Python standard library; gcloud output/errors stay private.
The exact reviewed Cloud Build bytes are a deliberate fail-closed allowlist.
"""

import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile
import time


REPOSITORY = "tyosu131/Workout-Journal"
PROJECT = "workout-journal-506909"
PROJECT_NUMBER = "437413312066"
REGION = "asia-northeast1"
BUILD_REGION = "global"
PROVIDER = (f"projects/{PROJECT_NUMBER}/locations/global/"
            "workloadIdentityPools/github-actions/providers/workout-journal")
DEPLOY_SA = f"workout-journal-deploy@{PROJECT}.iam.gserviceaccount.com"
BUILD_SA = f"projects/{PROJECT}/serviceAccounts/workout-journal-build@{PROJECT}.iam.gserviceaccount.com"
BUCKET = f"{PROJECT}_cloudbuild"
IMAGE_ROOT = f"{REGION}-docker.pkg.dev/{PROJECT}/workout-journal"
SERVICES = ("workout-journal-backend", "workout-journal-frontend")
# Exact current cloudbuild.yaml: two Docker builds, two image pushes,
# dedicated Build SA, CLOUD_LOGGING_ONLY, no deploy/entrypoint/extra steps.
BUILD_CONFIG_SHA256 = "0ff3a7a3c3dc95b73b48f48b04839e903be6ff3fcc506adffdab91d9f15e5a15"
BUILD_STATUSES = {"STATUS_UNKNOWN", "PENDING", "QUEUED", "WORKING", "SUCCESS",
                  "FAILURE", "INTERNAL_ERROR", "TIMEOUT", "CANCELLED", "EXPIRED"}


class GateError(Exception):
    """Only fixed, repository-owned codes may be exposed to the summary."""


def require(condition, code):
    if not condition:
        raise GateError(code)


def matches(pattern, value):
    return isinstance(value, str) and re.fullmatch(pattern, value) is not None


def command(args, code, *, cwd=None, timeout=120):
    # Never stream SDK errors, build bodies, substitutions or authenticated logs.
    try:
        result = subprocess.run(args, cwd=cwd, capture_output=True, timeout=timeout,
                                check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise GateError(code) from None
    require(result.returncode == 0, code)
    return result.stdout


def cloud(args, code, *, timeout=120):
    raw = command(["gcloud", *args, f"--project={PROJECT}", "--quiet", "--format=json"],
                  code, timeout=timeout)
    try:
        return json.loads(raw)
    except (ValueError, UnicodeError):
        raise GateError(code) from None


def context(env):
    require(env.get("GITHUB_REPOSITORY") == REPOSITORY, "REPOSITORY_MISMATCH")
    require(env.get("GITHUB_REF") == "refs/heads/main", "REF_MISMATCH")
    require(env.get("GITHUB_EVENT_NAME") == "workflow_dispatch", "EVENT_MISMATCH")
    require(env.get("GITHUB_WORKFLOW_REF") ==
            f"{REPOSITORY}/.github/workflows/cd.yml@refs/heads/main", "WORKFLOW_MISMATCH")
    sha = env.get("GITHUB_SHA", "")
    require(matches(r"[0-9a-f]{40}", sha) and env.get("GITHUB_WORKFLOW_SHA") == sha,
            "SOURCE_SHA_MISMATCH")
    require(matches(r"[1-9][0-9]*", env.get("GITHUB_RUN_ID")) and
            matches(r"[1-9][0-9]*", env.get("GITHUB_RUN_ATTEMPT")), "RUN_ID_MISMATCH")
    require(env.get("GCP_PROJECT") == PROJECT and env.get("WIF_PROVIDER") == PROVIDER
            and env.get("DEPLOY_SERVICE_ACCOUNT") == DEPLOY_SA, "WIF_INPUT_MISMATCH")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    # New publishable keys only, not a legacy JWT, secret key or substitution delimiter.
    require(matches(r"https://[a-z]{20}\.supabase\.co", url), "PUBLIC_URL_INVALID")
    require(matches(r"sb_publishable_[A-Za-z0-9_-]{10,256}", key), "PUBLIC_KEY_INVALID")
    return sha


def check_source(repo, sha):
    head = command(["git", "rev-parse", "HEAD"], "SOURCE_SHA_MISMATCH", cwd=repo).decode().strip()
    require(head == sha, "SOURCE_SHA_MISMATCH")
    command(["git", "diff", "--quiet", "HEAD", "--"], "TRACKED_SOURCE_DIRTY", cwd=repo)
    # Refuse an old dispatch if main has moved. Public repository: no persisted PAT.
    remote = command(["git", "ls-remote", "https://github.com/tyosu131/Workout-Journal.git",
                      "refs/heads/main"], "MAIN_READ_FAILED", cwd=repo).decode().strip()
    require(remote == f"{sha}\trefs/heads/main", "MAIN_MOVED")
    check_build_config(repo)


def check_build_config(directory):
    require(hashlib.sha256((directory / "cloudbuild.yaml").read_bytes()).hexdigest()
            == BUILD_CONFIG_SHA256, "BUILD_CONFIG_MISMATCH")


def tree_digest(directory):
    digest = hashlib.sha256()
    for path in sorted(directory.rglob("*")):
        require(not path.is_symlink(), "SOURCE_LINK_FORBIDDEN")
        if path.is_dir():
            continue
        require(path.is_file(), "SOURCE_FILE_INVALID")
        digest.update(str(path.relative_to(directory)).encode() + b"\0")
        digest.update(path.read_bytes() + b"\0")
    return digest.hexdigest()


def stage_source(repo, sha, runner_temp):
    source = Path(tempfile.mkdtemp(prefix="cd-a-source-", dir=runner_temp))
    # Archive the Git object, NOT the checkout: auth's gha-creds-*.json, dotenv,
    # node_modules and any other untracked data cannot enter the source upload.
    archive = command(["git", "archive", "--format=tar", sha], "ARCHIVE_FAILED", cwd=repo)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar.getmembers():
            name = Path(member.name)
            require(not name.is_absolute() and ".." not in name.parts and
                    (member.isfile() or member.isdir()), "ARCHIVE_ENTRY_INVALID")
            destination = source / name
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as entry:
                    destination.write_bytes(entry.read())
                destination.chmod(0o755 if member.mode & 0o111 else 0o644)
    check_build_config(source)
    return source


def prepare(env):
    sha = context(env)
    repo = Path(env["GITHUB_WORKSPACE"]).resolve()
    check_source(repo, sha)
    source = stage_source(repo, sha, env["RUNNER_TEMP"])
    require("\n" not in str(source) and "\r" not in str(source), "SOURCE_PATH_INVALID")
    with Path(env["GITHUB_ENV"]).open("a") as output:
        output.write(f"CD_A_SOURCE_DIR={source}\nCD_A_SOURCE_DIGEST={tree_digest(source)}\n")


def check_credentials(env):
    # Examine only credential identity/type locally; never serialize this document.
    require(env.get("GOOGLE_APPLICATION_CREDENTIALS") ==
            env.get("CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE") and
            bool(env.get("GOOGLE_APPLICATION_CREDENTIALS")), "CREDENTIAL_PATH_MISMATCH")
    credential = json.loads(Path(env["GOOGLE_APPLICATION_CREDENTIALS"]).read_bytes())
    require(credential.get("type") == "external_account" and
            credential.get("audience") == f"//iam.googleapis.com/{PROVIDER}" and
            credential.get("service_account_impersonation_url") ==
            f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{DEPLOY_SA}:generateAccessToken",
            "WIF_CREDENTIAL_MISMATCH")
    require(not env.get("CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"), "IMPERSONATION_OVERRIDE")
    active = cloud(["auth", "list", "--filter=status:ACTIVE"], "AUTH_IDENTITY_READ_FAILED")
    require(isinstance(active, list) and len(active) == 1 and
            active[0].get("account") == DEPLOY_SA and active[0].get("status") == "ACTIVE",
            "AUTH_IDENTITY_MISMATCH")


def service_snapshot(raw, service):
    metadata, status = raw["metadata"], raw["status"]
    require(metadata["name"] == service and metadata["namespace"] == PROJECT_NUMBER and
            metadata["labels"]["cloud.googleapis.com/location"] == REGION, "RUN_IDENTITY_MISMATCH")
    require(str(metadata["generation"]) == str(status["observedGeneration"]) and
            any(item.get("type") == "Ready" and item.get("status") == "True"
                for item in status["conditions"]), "RUN_NOT_READY")
    revision_pattern = re.escape(service) + r"-[a-z0-9-]+"
    latest = {key: status[key] for key in ("latestCreatedRevisionName", "latestReadyRevisionName")}
    require(all(matches(revision_pattern, value) for value in latest.values()), "RUN_REVISION_INVALID")
    require(matches(r"[1-9][0-9]*", str(metadata["generation"])), "RUN_GENERATION_INVALID")
    traffic = []
    for item in status["traffic"]:
        revision, percent, tag = item["revisionName"], item.get("percent", 0), item.get("tag", "")
        require(matches(revision_pattern, revision) and type(percent) is int and 0 <= percent <= 100
                and (tag == "" or matches(r"[a-z][a-z0-9-]{0,62}", tag)), "RUN_TRAFFIC_INVALID")
        traffic.append({"revision": revision, "percent": percent, "tag": tag})
    require(sum(item["percent"] for item in traffic) == 100, "RUN_TRAFFIC_INVALID")
    return {"generation": str(metadata["generation"]), **latest,
            "traffic": sorted(traffic, key=lambda item: (item["revision"], item["tag"], item["percent"]))}


def snapshot():
    return {service: service_snapshot(cloud(
        ["run", "services", "describe", service, f"--region={REGION}"], "RUN_READ_FAILED"), service)
            for service in SERVICES}


def build_identity(build, sha, build_id, source_prefix):
    require(build.get("id") == build_id and build.get("projectId") == PROJECT,
            "BUILD_IDENTITY_MISMATCH")
    require(build.get("serviceAccount") == BUILD_SA, "BUILD_SA_MISMATCH")
    require(build.get("substitutions", {}).get("COMMIT_SHA") == sha, "BUILD_SOURCE_SHA_MISMATCH")
    source = build.get("source", {}).get("storageSource", {})
    require(source.get("bucket") == BUCKET and isinstance(source.get("object"), str)
            and source["object"].startswith(source_prefix + "/"), "BUILD_SOURCE_BUCKET_MISMATCH")
    require(build.get("options", {}).get("logging") == "CLOUD_LOGGING_ONLY", "BUILD_LOGGING_MISMATCH")


def resolve_digests(build, sha):
    images = build.get("results", {}).get("images", [])
    expected = {f"{IMAGE_ROOT}/{service}:{sha}" for service in SERVICES}
    require(len(images) == 2 and {item.get("name") for item in images} == expected,
            "BUILD_IMAGES_MISMATCH")
    result = {}
    for service in SERVICES:
        name = f"{IMAGE_ROOT}/{service}:{sha}"
        digest = next(item.get("digest") for item in images if item.get("name") == name)
        require(matches(r"sha256:[a-f0-9]{64}", digest), "BUILD_DIGEST_MISSING")
        registry = cloud(["artifacts", "docker", "images", "describe", name], "DIGEST_READ_FAILED")
        require(registry.get("image_summary", {}).get("digest") == digest, "REGISTRY_DIGEST_MISMATCH")
        result[service] = digest
    return result


def prove(env, evidence):
    sha = context(env)
    evidence.update({"runId": env["GITHUB_RUN_ID"], "runAttempt": env["GITHUB_RUN_ATTEMPT"],
                     "githubSha": sha, "project": PROJECT})
    repo = Path(env["GITHUB_WORKSPACE"]).resolve()
    check_source(repo, sha)
    source = Path(env["CD_A_SOURCE_DIR"]).resolve()
    require(source.parent == Path(env["RUNNER_TEMP"]).resolve() and
            source.name.startswith("cd-a-source-"), "SOURCE_PATH_INVALID")
    require(tree_digest(source) == env["CD_A_SOURCE_DIGEST"], "STAGED_SOURCE_CHANGED")
    check_build_config(source)
    check_credentials(env)
    evidence["authenticatedServiceAccount"] = DEPLOY_SA
    before = snapshot()
    evidence["cloudRunBefore"] = before
    try:
        # No bucket bootstrap: the existing resource-scoped grants must suffice.
        bucket = cloud(["storage", "buckets", "describe", f"gs://{BUCKET}"], "SOURCE_BUCKET_READ_FAILED")
        require(bucket.get("name") == BUCKET, "SOURCE_BUCKET_MISMATCH")
        prefix = f"source/cd-a/{env['GITHUB_RUN_ID']}-{env['GITHUB_RUN_ATTEMPT']}"
        substitutions = (f"COMMIT_SHA={sha},_REGION={REGION},_AR_REPOSITORY=workout-journal,"
                         f"_NEXT_PUBLIC_SUPABASE_URL={env['NEXT_PUBLIC_SUPABASE_URL']},"
                         f"_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY={env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']}")
        submitted = cloud(["builds", "submit", str(source), f"--config={source / 'cloudbuild.yaml'}",
                           f"--region={BUILD_REGION}", f"--gcs-source-staging-dir=gs://{BUCKET}/{prefix}",
                           f"--substitutions={substitutions}", "--timeout=900s", "--async", "--suppress-logs"],
                          "BUILD_SUBMISSION_FAILED", timeout=300)
        build_id = submitted.get("id")
        require(matches(r"[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}", build_id), "BUILD_ID_INVALID")
        evidence["buildId"] = build_id
        deadline = time.monotonic() + 1200
        while True:
            build = cloud(["builds", "describe", build_id, f"--region={BUILD_REGION}"], "BUILD_READ_FAILED")
            build_identity(build, sha, build_id, prefix)
            evidence["actualBuildServiceAccount"] = BUILD_SA
            status = build.get("status")
            require(status in BUILD_STATUSES, "BUILD_STATUS_INVALID")
            evidence["buildResult"] = status
            if status not in {"PENDING", "QUEUED", "WORKING"}:
                break
            require(time.monotonic() < deadline, "BUILD_WAIT_TIMEOUT")
            time.sleep(10)
        require(status == "SUCCESS", "BUILD_NOT_SUCCESSFUL")
        evidence["digests"] = resolve_digests(build, sha)
    finally:
        # Also run on submission/build/digest failure. Never attempt a compensating deploy.
        after = snapshot()
        evidence["cloudRunAfter"] = after
        evidence["cloudRunUnchanged"] = before == after
        require(before == after, "CLOUD_RUN_CHANGED")


def main(argv=None, env=None):
    argv = sys.argv[1:] if argv is None else argv
    env = os.environ if env is None else env
    evidence = {"proof": "PE-P1C-01B", "result": "FAIL"}
    result = 1
    try:
        require(argv in (["prepare"], ["prove"]), "COMMAND_INVALID")
        # Public configuration is not a secret. Mask it defensively for subsequent
        # SDK/action logs; it is NEVER included in the evidence allowlist below.
        key = env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
        if matches(r"sb_publishable_[A-Za-z0-9_-]{10,256}", key):
            print(f"::add-mask::{key}")
        if argv == ["prepare"]:
            prepare(env)
        else:
            prove(env, evidence)
        evidence["result"] = "PASS"
        result = 0
    except GateError as error:
        evidence["failureCode"] = str(error)
    except Exception:
        # Never serialize a traceback, subprocess command, credential or API body.
        evidence["failureCode"] = "UNEXPECTED_PROOF_ERROR"
    if argv == ["prove"]:
        with Path(env["GITHUB_STEP_SUMMARY"]).open("a") as summary:
            summary.write("## CD-A submission proof\n\n```json\n" +
                          json.dumps(evidence, indent=2, sort_keys=True) + "\n```\n")
    print("CD-A: " + ("PASS" if result == 0 else evidence["failureCode"]))
    return result


if __name__ == "__main__":
    sys.exit(main())
