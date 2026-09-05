"""Offline contract tests. Every GitHub/GCP command is mocked; no runtime proof."""

from contextlib import redirect_stdout
from copy import deepcopy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("proof", Path(__file__).with_name("wif_submission.py"))
proof = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(proof)
ROOT = Path(__file__).resolve().parents[2]
SHA = "a" * 40
BUILD_ID = "12345678-1234-1234-1234-123456789abc"
SECRET = "dummy-private-credential-marker-never-report"
PUBLIC_KEY = "sb_publishable_dummy_public_marker_1234567890"


def environment():
    return {"GITHUB_REPOSITORY": proof.REPOSITORY, "GITHUB_REF": "refs/heads/main",
            "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_WORKFLOW_REF": f"{proof.REPOSITORY}/.github/workflows/cd.yml@refs/heads/main",
            "GITHUB_SHA": SHA, "GITHUB_WORKFLOW_SHA": SHA,
            "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "1",
            "GCP_PROJECT": proof.PROJECT, "WIF_PROVIDER": proof.PROVIDER,
            "DEPLOY_SERVICE_ACCOUNT": proof.DEPLOY_SA,
            "NEXT_PUBLIC_SUPABASE_URL": "https://" + "a" * 20 + ".supabase.co",
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": PUBLIC_KEY}


def run_service(service):
    return {"metadata": {"name": service, "namespace": proof.PROJECT_NUMBER, "generation": 8,
                         "labels": {"cloud.googleapis.com/location": proof.REGION}},
            "status": {"observedGeneration": 8, "conditions": [{"type": "Ready", "status": "True"}],
                       "latestCreatedRevisionName": service + "-candidate",
                       "latestReadyRevisionName": service + "-candidate",
                       "traffic": [{"revisionName": service + "-00003-good", "percent": 100},
                                   {"revisionName": service + "-candidate", "tag": "candidate-proof"}]},
            "spec": {"credential": SECRET}}


def successful_build():
    return {"id": BUILD_ID, "projectId": proof.PROJECT, "serviceAccount": proof.BUILD_SA,
            "status": "SUCCESS", "substitutions": {"COMMIT_SHA": SHA, "PUBLIC_KEY": PUBLIC_KEY},
            "source": {"storageSource": {"bucket": proof.BUCKET,
                                         "object": "source/cd-a/123-1/source.tgz"}},
            "options": {"logging": "CLOUD_LOGGING_ONLY"},
            "results": {"images": [{"name": f"{proof.IMAGE_ROOT}/{service}:{SHA}",
                                     "digest": "sha256:" + "b" * 64}
                                    for service in proof.SERVICES]}, "unknownRawBody": SECRET}


class ContractTests(unittest.TestCase):
    def assertGate(self, code, callback):
        with self.assertRaisesRegex(proof.GateError, "^" + code + "$"):
            callback()

    def test_context_valid(self):
        self.assertEqual(proof.context(environment()), SHA)

    def test_context_rejects_each_untrusted_or_missing_input(self):
        cases = {"GITHUB_REPOSITORY": ("fork/Workout-Journal", "REPOSITORY_MISMATCH"),
                 "GITHUB_REF": ("refs/heads/feature", "REF_MISMATCH"),
                 "GITHUB_EVENT_NAME": ("push", "EVENT_MISMATCH"),
                 "GITHUB_WORKFLOW_REF": ("unexpected.yml", "WORKFLOW_MISMATCH"),
                 "GITHUB_SHA": ("b" * 40, "SOURCE_SHA_MISMATCH"),
                 "GITHUB_WORKFLOW_SHA": ("b" * 40, "SOURCE_SHA_MISMATCH"),
                 "GITHUB_RUN_ID": ("1\ninjection", "RUN_ID_MISMATCH"),
                 "GITHUB_RUN_ATTEMPT": ("0", "RUN_ID_MISMATCH"),
                 "GCP_PROJECT": ("different", "WIF_INPUT_MISMATCH"),
                 "WIF_PROVIDER": ("different", "WIF_INPUT_MISMATCH"),
                 "DEPLOY_SERVICE_ACCOUNT": ("different", "WIF_INPUT_MISMATCH"),
                 "NEXT_PUBLIC_SUPABASE_URL": ("http://localhost", "PUBLIC_URL_INVALID"),
                 "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": ("sb_secret_" + SECRET, "PUBLIC_KEY_INVALID")}
        for key, (value, code) in cases.items():
            for bad in (value, ""):
                with self.subTest(key=key, bad=bool(bad)):
                    env = environment()
                    env[key] = bad
                    self.assertGate(code, lambda: proof.context(env))

    def test_public_inputs_cannot_inject_substitutions_or_commands(self):
        for key, code in [("NEXT_PUBLIC_SUPABASE_URL", "PUBLIC_URL_INVALID"),
                          ("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "PUBLIC_KEY_INVALID")]:
            for suffix in (",COMMIT_SHA=other", "\n", "$(touch x)", "?key=x", "@evil"):
                env = environment()
                env[key] += suffix
                self.assertGate(code, lambda: proof.context(env))

    def test_reviewed_config_hash_matches_repository(self):
        proof.check_build_config(ROOT)

    def test_every_config_change_including_sa_logging_and_deploy_is_rejected(self):
        original = (ROOT / "cloudbuild.yaml").read_bytes()
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            for content in (original.replace(b"workout-journal-build@", b"other@"),
                            original.replace(b"CLOUD_LOGGING_ONLY", b"LEGACY"),
                            original + b"\n# new deploy step\n", b"invalid yaml"):
                (directory / "cloudbuild.yaml").write_bytes(content)
                self.assertGate("BUILD_CONFIG_MISMATCH", lambda: proof.check_build_config(directory))

    def test_exact_head_and_current_main_guard(self):
        for outputs, code in [([b"b" * 40], "SOURCE_SHA_MISMATCH"),
                              ([SHA.encode(), b"", b"b" * 40 + b"\trefs/heads/main"], "MAIN_MOVED")]:
            with patch.object(proof, "command", side_effect=outputs):
                self.assertGate(code, lambda: proof.check_source(ROOT, SHA))
        with patch.object(proof, "command", side_effect=[SHA.encode(), b"", f"{SHA}\trefs/heads/main\n".encode()]):
            proof.check_source(ROOT, SHA)

    def test_archive_only_uses_git_object_and_not_untracked_credentials(self):
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode="w") as tar:
            for name, data in [("cloudbuild.yaml", (ROOT / "cloudbuild.yaml").read_bytes()),
                               ("frontend/tracked.txt", b"tracked source")]:
                member = tarfile.TarInfo(name)
                member.size = len(data)
                tar.addfile(member, io.BytesIO(data))
        with tempfile.TemporaryDirectory() as temp, patch.object(proof, "command", return_value=archive.getvalue()) as cmd:
            workspace = Path(temp) / "workspace"
            workspace.mkdir()
            (workspace / "gha-creds-private.json").write_text(SECRET)
            source = proof.stage_source(workspace, SHA, temp)
            cmd.assert_called_once_with(["git", "archive", "--format=tar", SHA], "ARCHIVE_FAILED", cwd=workspace)
            self.assertFalse((source / "gha-creds-private.json").exists())
            first = proof.tree_digest(source)
            (source / "injected.json").write_text(SECRET)
            self.assertNotEqual(proof.tree_digest(source), first)

    def test_archive_refuses_traversal_symlink_and_special_files(self):
        for name, kind in [("../escape", tarfile.REGTYPE), ("/absolute", tarfile.REGTYPE),
                           ("link", tarfile.SYMTYPE), ("pipe", tarfile.FIFOTYPE)]:
            archive = io.BytesIO()
            with tarfile.open(fileobj=archive, mode="w") as tar:
                member = tarfile.TarInfo(name)
                member.type = kind
                tar.addfile(member)
            with tempfile.TemporaryDirectory() as temp, patch.object(proof, "command", return_value=archive.getvalue()):
                self.assertGate("ARCHIVE_ENTRY_INVALID", lambda: proof.stage_source(ROOT, SHA, temp))

    def test_external_account_and_active_identity(self):
        document = {"type": "external_account", "audience": f"//iam.googleapis.com/{proof.PROVIDER}",
                    "service_account_impersonation_url":
                    f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{proof.DEPLOY_SA}:generateAccessToken",
                    "credential_source": {"private": SECRET}}
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "credential.json"
            env = {"GOOGLE_APPLICATION_CREDENTIALS": str(path), "CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE": str(path)}
            for key in ("type", "audience", "service_account_impersonation_url"):
                wrong = {**document, key: "wrong"}
                path.write_text(json.dumps(wrong))
                with patch.object(proof, "cloud") as cloud:
                    self.assertGate("WIF_CREDENTIAL_MISMATCH", lambda: proof.check_credentials(env))
                    cloud.assert_not_called()
            path.write_text(json.dumps(document))
            for active in ([], [{"account": "other", "status": "ACTIVE"}],
                           [{"account": proof.DEPLOY_SA, "status": "ACTIVE"}] * 2):
                with patch.object(proof, "cloud", return_value=active):
                    self.assertGate("AUTH_IDENTITY_MISMATCH", lambda: proof.check_credentials(env))
            with patch.object(proof, "cloud", return_value=[{"account": proof.DEPLOY_SA, "status": "ACTIVE"}]):
                proof.check_credentials(env)
                env["CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT"] = "other"
                self.assertGate("IMPERSONATION_OVERRIDE", lambda: proof.check_credentials(env))

    def test_snapshot_keeps_only_safe_identity_including_zero_percent_tags(self):
        service = proof.SERVICES[0]
        raw = run_service(service)
        snapshot = proof.service_snapshot(raw, service)
        self.assertNotIn(SECRET, json.dumps(snapshot))
        self.assertEqual([entry["percent"] for entry in snapshot["traffic"]], [100, 0])
        raw["status"]["traffic"].reverse()
        self.assertEqual(proof.service_snapshot(raw, service), snapshot)

    def test_snapshot_rejects_invalid_identity_and_unstable_service(self):
        service = proof.SERVICES[0]
        for change, code in [
            (lambda d: d["metadata"].update(namespace="other"), "RUN_IDENTITY_MISMATCH"),
            (lambda d: d["status"].update(observedGeneration=7), "RUN_NOT_READY"),
            (lambda d: d["status"].update(conditions=[]), "RUN_NOT_READY"),
            (lambda d: d["status"].update(latestReadyRevisionName=SECRET), "RUN_REVISION_INVALID"),
            (lambda d: d["status"]["traffic"][0].update(percent=99), "RUN_TRAFFIC_INVALID"),
            (lambda d: d["status"]["traffic"][0].update(percent=True), "RUN_TRAFFIC_INVALID"),
            (lambda d: d["status"]["traffic"][1].update(tag="x\n```"), "RUN_TRAFFIC_INVALID")]:
            raw = run_service(service)
            change(raw)
            self.assertGate(code, lambda: proof.service_snapshot(raw, service))

    def test_build_actual_identity_source_and_logging(self):
        for key, value, code in [
            ("id", "other", "BUILD_IDENTITY_MISMATCH"),
            ("projectId", "other", "BUILD_IDENTITY_MISMATCH"),
            ("serviceAccount", "other", "BUILD_SA_MISMATCH"),
            ("substitutions", {"COMMIT_SHA": "b" * 40}, "BUILD_SOURCE_SHA_MISMATCH"),
            ("source", {"storageSource": {"bucket": "other"}}, "BUILD_SOURCE_BUCKET_MISMATCH"),
            ("options", {"logging": "LEGACY"}, "BUILD_LOGGING_MISMATCH")]:
            build = successful_build()
            build[key] = value
            self.assertGate(code, lambda: proof.build_identity(build, SHA, BUILD_ID, "source/cd-a/123-1"))
        proof.build_identity(successful_build(), SHA, BUILD_ID, "source/cd-a/123-1")

    def test_digest_requires_both_build_outputs_and_exact_registry_match(self):
        with patch.object(proof, "cloud", return_value={"image_summary": {"digest": "sha256:" + "b" * 64}}):
            self.assertEqual(len(proof.resolve_digests(successful_build(), SHA)), 2)
        with patch.object(proof, "cloud", return_value={"image_summary": {"digest": "sha256:" + "c" * 64}}):
            self.assertGate("REGISTRY_DIGEST_MISMATCH", lambda: proof.resolve_digests(successful_build(), SHA))
        for images, code in [([], "BUILD_IMAGES_MISMATCH"),
                             (successful_build()["results"]["images"] * 2, "BUILD_IMAGES_MISMATCH")]:
            build = successful_build()
            build["results"]["images"] = images
            self.assertGate(code, lambda: proof.resolve_digests(build, SHA))
        build = successful_build()
        build["results"]["images"][0]["digest"] = SECRET
        self.assertGate("BUILD_DIGEST_MISSING", lambda: proof.resolve_digests(build, SHA))

    def test_command_errors_never_expose_raw_output_or_arguments(self):
        failures = [subprocess.CompletedProcess([SECRET], 1, SECRET.encode(), SECRET.encode()),
                    subprocess.TimeoutExpired([SECRET], 1, SECRET.encode(), SECRET.encode())]
        for failure in failures:
            with patch.object(proof.subprocess, "run", side_effect=failure if isinstance(failure, Exception) else None,
                              return_value=failure):
                self.assertGate("FIXED_CODE", lambda: proof.command([SECRET], "FIXED_CODE"))


class ExecutionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "cd-a-source-test"
        self.source.mkdir()
        (self.source / "cloudbuild.yaml").write_bytes((ROOT / "cloudbuild.yaml").read_bytes())
        self.env = {**environment(), "RUNNER_TEMP": self.temp.name, "GITHUB_WORKSPACE": str(ROOT),
                    "CD_A_SOURCE_DIR": str(self.source), "CD_A_SOURCE_DIGEST": proof.tree_digest(self.source),
                    "GITHUB_STEP_SUMMARY": str(Path(self.temp.name) / "summary.md")}
        self.calls = []
        self.build = successful_build()
        self.submission_error = None
        self.after_changed = False
        self.run_reads = 0
        for name in ("check_source", "check_credentials"):
            mocker = patch.object(proof, name)
            mocker.start()
            self.addCleanup(mocker.stop)

    def fake_cloud(self, args, code, **kwargs):
        self.calls.append(args)
        if args[:3] == ["run", "services", "describe"]:
            self.run_reads += 1
            raw = run_service(args[3])
            if self.after_changed and self.run_reads > 2:
                raw["status"]["traffic"][0]["revisionName"] = args[3] + "-changed"
            return raw
        if args[:3] == ["storage", "buckets", "describe"]:
            return {"name": proof.BUCKET}
        if args[:2] == ["builds", "submit"]:
            if self.submission_error:
                raise self.submission_error
            return {"id": BUILD_ID}
        if args[:2] == ["builds", "describe"]:
            return deepcopy(self.build)
        if args[:4] == ["artifacts", "docker", "images", "describe"]:
            return {"image_summary": {"digest": "sha256:" + "b" * 64}}
        raise AssertionError("Unexpected command")

    def execute(self):
        with patch.object(proof, "cloud", side_effect=self.fake_cloud), redirect_stdout(io.StringIO()) as log:
            code = proof.main(["prove"], self.env)
        return code, Path(self.env["GITHUB_STEP_SUMMARY"]).read_text(), log.getvalue()

    def test_success_allowlisted_evidence_and_only_build_submission_mutates(self):
        code, summary, log = self.execute()
        self.assertEqual(code, 0)
        for forbidden in (SECRET, PUBLIC_KEY, "credential_source", "unknownRawBody", "PUBLIC_KEY"):
            self.assertNotIn(forbidden, summary)
        self.assertNotIn(SECRET, log)
        self.assertIn('"result": "PASS"', summary)
        self.assertIn('"cloudRunUnchanged": true', summary)
        submit = [args for args in self.calls if args[:2] == ["builds", "submit"]]
        self.assertEqual(len(submit), 1)
        self.assertEqual(submit[0][2], str(self.source.resolve()))
        self.assertIn("--async", submit[0])
        self.assertIn("--suppress-logs", submit[0])
        self.assertEqual(self.run_reads, 4)
        for args in self.calls:
            self.assertTrue(args[:3] in (["run", "services", "describe"], ["storage", "buckets", "describe"])
                            or args[:2] in (["builds", "submit"], ["builds", "describe"])
                            or args[:4] == ["artifacts", "docker", "images", "describe"])

    def test_submission_error_still_reads_cloud_run_and_sanitizes_unknown_error(self):
        self.submission_error = RuntimeError(SECRET + PUBLIC_KEY)
        code, summary, log = self.execute()
        self.assertEqual(code, 1)
        self.assertEqual(self.run_reads, 4)
        self.assertIn("UNEXPECTED_PROOF_ERROR", summary)
        self.assertNotIn(SECRET, summary + log)
        self.assertNotIn(PUBLIC_KEY, summary)

    def test_build_failure_and_wrong_build_sa_never_pass(self):
        for key, value, expected in [("status", "FAILURE", "BUILD_NOT_SUCCESSFUL"),
                                     ("serviceAccount", "other", "BUILD_SA_MISMATCH")]:
            self.build = {**successful_build(), key: value}
            code, summary, _ = self.execute()
            self.assertEqual(code, 1)
            self.assertIn(expected, summary)

    def test_cloud_run_change_blocks_even_successful_build(self):
        self.after_changed = True
        code, summary, _ = self.execute()
        self.assertEqual(code, 1)
        self.assertIn("CLOUD_RUN_CHANGED", summary)
        self.assertIn('"cloudRunUnchanged": false', summary)

    def test_source_injection_stops_before_credentials_cloud_or_submission(self):
        (self.source / "gha-creds-injected.json").write_text(SECRET)
        code, summary, _ = self.execute()
        self.assertEqual(code, 1)
        self.assertIn("STAGED_SOURCE_CHANGED", summary)
        self.assertEqual(self.calls, [])

    def test_missing_variables_stop_before_cloud(self):
        del self.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
        code, summary, _ = self.execute()
        self.assertEqual(code, 1)
        self.assertIn("PUBLIC_KEY_INVALID", summary)
        self.assertEqual(self.calls, [])

    def test_poll_timeout_is_bounded_and_does_not_resubmit(self):
        self.build["status"] = "WORKING"
        with patch.object(proof.time, "monotonic", side_effect=[0, 1201]):
            code, summary, _ = self.execute()
        self.assertEqual(code, 1)
        self.assertIn("BUILD_WAIT_TIMEOUT", summary)
        self.assertEqual(len([call for call in self.calls if call[:2] == ["builds", "submit"]]), 1)
        self.assertEqual(self.run_reads, 4)


if __name__ == "__main__":
    unittest.main()
