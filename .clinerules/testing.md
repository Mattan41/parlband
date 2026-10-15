# Testing and verification

Vitest, run with `npm test` (`vitest run`). Tests live in `tests/` and are named
after the module they exercise: `tests/admin-upload.test.ts` covers
`functions/api/admin/upload-rules.ts`.

## Rules

- Every behavior change adds or updates a test, and that test is the proof:
  temporarily restoring the old behavior must make it **fail**. That is how the
  95 MB upload limit was checked — putting the old 25 MB cap back failed exactly
  the two meaningful assertions.
- Test the pure parts directly (the `*-rules.ts` modules) rather than reaching
  for Cloudflare globals. Boundary cases belong in the test: the limit itself
  passes, one byte over fails.
- Lock in the invariants that protect the deployment, for example that every
  upload kind stays under Cloudflare's 100 MB request-body cap.
- Before something counts as done: `npm test`, `npm run lint`,
  `npx prettier --check .` and `npx tsc --noEmit` all pass.
- Tests are not the only verification. User-facing behavior gets checked for
  real (`npm run preview` plus curl, or the admin UI in a browser), and a human
  reads the diff before committing.
