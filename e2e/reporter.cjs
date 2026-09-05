const fs = require('node:fs');

// Do not serialize TestResult, errors, attachments, stdout, stderr, or call logs.
module.exports = class SafeReporter {
  printsToStdio() { return true; }
  onStdOut() {}
  onStdErr() {}
  onError() {}
  onEnd(result) {
    try {
      const report = JSON.parse(fs.readFileSync(process.env.E2E_BROWSER_REPORT, 'utf8'));
      const names = ['login', 'tag-create', 'note-create-save-read', 'tag-use',
        'Calendar', 'Analytics', 'tag-delete', 'logout'];
      const ok = result.status === 'passed' && names.every(name =>
        report.steps.some(step => step.name === name && step.result === 'PASS'));
      return { status: ok ? 'passed' : 'failed' };
    } catch { return { status: 'failed' }; }
  }
};
