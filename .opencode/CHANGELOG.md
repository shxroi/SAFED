# OpenCode Change Log

## 2026-02-17

- Created and switched to branch `bug-demoai`.
- Fixed production build blocker by moving client-side user form schema import from `shared/` to `app/schemas/userSchema.ts`.
- Hardened password update validation by converting empty-string password inputs to `undefined` (prevent empty-password hashing).
- Added authorization checks (authenticated IM-only) to users/tools management API routes.
- Hardened delete endpoints to validate IDs and return 404 when target rows do not exist.
- Removed noisy debug logging from users/tools list APIs.
- Updated one operation component import to use type-only shared imports.
- Verified changes with:
  - `npm run test` (pass)
  - `npm run build` (pass; warnings remain for duplicated auto-import symbols)
