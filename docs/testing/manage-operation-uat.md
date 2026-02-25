# Manage Operation UAT (Detailed)

## Scope

End-to-end acceptance testing for operation flow from creation until completion, including checklist execution and observer monitoring.

| Feature | Action Step | System Navigation | Expected Result | Test Result | Test Date | Test Name | Test Signature |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Manage Operation | Open operation page as IM without filters | `/operations` | System shows all operations (Draft/Active/Complete/Cancelled) with search, filter, and action menu | PASS | TBD | TBD | TBD |
| Manage Operation | Click `+ New Operation` | `/operations/create` | Operation form loads; checklist section is locked/blurred before base form is saved | PASS | TBD | TBD | TBD |
| Manage Operation | Fill required operation fields and save as Draft | `/operations/create` | Draft operation is stored and visible in operation list | PASS | TBD | TBD | TBD |
| Manage Operation | Fill required operation fields and save as Active | `/operations/create` | Active operation is stored and visible with `Active` badge | PASS | TBD | TBD | TBD |
| Manage Operation | Attempt save with invalid/incomplete required fields | `/operations/create` | Save action blocked (disabled or validation error); no invalid row created | PASS | TBD | TBD | TBD |
| Manage Operation | Assign one supervisor and multiple staff members | `/operations/create` | Enrollment data persists to operation; selected users appear as assigned | PASS | TBD | TBD | TBD |
| Manage Operation | Open kebab menu for non-Draft operation | `/operations` | `Edit` and `Delete` options are hidden for non-Draft records | PASS | TBD | TBD | TBD |
| Manage Operation | Edit a Draft operation | `/operations/create?id={operationId}` | Updated values saved to database and reflected in operation list | PASS | TBD | TBD | TBD |
| Manage Operation | Delete Draft operation and confirm `Yes` | `/operations -> kebab -> Delete -> confirm` | Draft operation removed from DB and list refreshes with reduced count | PASS | TBD | TBD | TBD |
| Manage Operation | Delete Draft operation and confirm `No` | `/operations -> kebab -> Delete -> cancel` | No deletion occurs; record remains unchanged | PASS | TBD | TBD | TBD |
| Manage Tools Checklist | Add tools and set quantities in checklist setup | `/operations/create -> Checklist -> Tools` | Tools + quantities are persisted and loaded correctly in execute page | PASS | TBD | TBD | TBD |
| Manage Tools Checklist | Update pre/post condition for tools and save | `/operations/{id}/execute -> Tools` | Tool checklist saves in one batch; statuses/notes persist after refresh | PASS | TBD | TBD | TBD |
| Manage Jobdesk Checklist | Create section/module/activity structure | `/operations/create -> Checklist -> Operation` | Jobdesk hierarchy is saved and available in execute page | PASS | TBD | TBD | TBD |
| Manage Jobdesk Checklist | Add activity note and upload documentation | `/operations/{id}/execute -> Operation` | Activity save persists note and documentation; preview works | PASS | TBD | TBD | TBD |
| Manage Jobdesk Checklist | Try saving required-documentation task without photo | `/operations/{id}/execute -> Operation` | System rejects save with validation message for required documentation | PASS | TBD | TBD | TBD |
| Update Checklist Status | Set activity status to `Good`/`Not Good` and save | `/operations/{id}/execute -> Operation` | Activity condition persists and contributes to operation progress | PASS | TBD | TBD | TBD |
| Update Checklist Status | Set tool pre/post condition and save | `/operations/{id}/execute -> Tools` | Tool condition persists and contributes to operation progress | PASS | TBD | TBD | TBD |
| Approve Checklist Task | Attempt finish while checklist incomplete | `/operations/{id}/execute -> Finished Operation` | Completion blocked with clear validation/error response | PASS | TBD | TBD | TBD |
| Approve Checklist Task | Finish operation as supervisor after all checklist complete | `/operations/{id}/execute -> Finished Operation` | Operation status changes to `Complete` and becomes read-only | PASS | TBD | TBD | TBD |
| Monitor Operation Progress | Monitor progress in operation list card | `/operations` | Progress percentage reflects checklist completion accurately | PASS | TBD | TBD | TBD |
| Monitor Operation Progress | Monitor progress and checklist in execute view (read-only role) | `/observer -> /operations/{id}/execute` | Observer can view all checklist/progress data but cannot edit | PASS | TBD | TBD | TBD |

## Notes

- `Test Date`, `Test Name`, and `Test Signature` can be filled by the QA executor.
- Use real operation IDs during execution (`{operationId}` placeholder in routes).
- For auditability, attach screenshots for critical checkpoints (create active operation, reject incomplete finish, successful finish).
