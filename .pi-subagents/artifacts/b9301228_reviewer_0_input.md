# Task for reviewer

Perform a READ-ONLY code quality review of the TrustRAG web UI frontend. Do NOT modify, edit, or implement anything — only read and report findings.

The project is at /home/pavan/TrustRAG. The frontend is in /home/pavan/TrustRAG/frontend.

Focus areas:
1. The React + TypeScript + Vite + Tailwind frontend source under /home/pavan/TrustRAG/frontend/src — especially these recently-updated files:
   - src/pages/Dashboard.tsx
   - src/pages/Documents.tsx
   - src/pages/Chat.tsx
   - src/pages/KnowledgeBase.tsx
   - src/pages/SystemStatus.tsx
   - src/components/Sidebar.tsx
   - src/components/Layout.tsx
   - src/components/Card.tsx
   - src/components/StatusBadge.tsx
   - src/components/FileUpload.tsx
   - src/index.css
   - src/App.tsx, src/main.tsx, src/services/api.ts, src/hooks/useApi.ts, src/types/index.ts
2. Check the recent dark-theme redesign for:
   - TypeScript correctness and type safety issues
   - Hardcoded hex colors vs. reusable tokens/design system consistency
   - Duplicated or inconsistent styling patterns
   - Unused imports, dead code, or leftover code
   - Accessibility issues (contrast, aria labels, semantic HTML)
   - Responsive layout problems
   - Any runtime/React anti-patterns (missing keys, stale closures, state issues)
   - Build config issues (vite.config.ts, tsconfig files, index.html)
   - Whether inline Tailwind arbitrary color values (e.g. bg-[#1e2024]) scattered across pages would be better centralized as CSS variables/theme tokens
3. Note any specific issues with file paths and line numbers. Report findings in the standard review format (Correct / Fixed / Blocker / Note). Since this is review-only, do not write any files.

Report the issues found with evidence (file paths + line numbers).

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```