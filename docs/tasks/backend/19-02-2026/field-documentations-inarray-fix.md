# Field Documentations Query Fix - Schema Alignment

## Issue
Query failures when fetching field documentations:
```
Failed query: select "id", "operationjoblistid", "filepath", "filename", "filesize", "timestamp" 
from "fielddocumentations" where "fielddocumentations"."operationjoblistid" in ($1) 
params: 69

[cause]: column "operationjoblistid" does not exist
```

## Root Cause
Migration `0012_long_thunderbird` attempted to rename the column from `joblistid` to `operationjoblistid` but:
1. Was marked as migrated (`npx nuxt db mark-as-migrated 0012_long_thunderbird`)
2. Was never actually executed against the database
3. Database still has column named `joblistid`
4. Schema was referencing the non-existent `operationjoblistid` column

## Solution
Reverted schema and removed the phantom migration to match actual database state:

1. **Schema Fix**: Reverted `fieldDocumentations` table column reference from `operationjoblistid` back to `joblistid`
2. **Migration Cleanup**: 
   - Deleted `0012_long_thunderbird.sql`
   - Deleted `meta/0012_snapshot.json`
   - Removed entry from `meta/_journal.json`

### Updated Schema
```typescript
export const fieldDocumentations = pgTable('fielddocumentations', {
  id: serial('id').primaryKey(),
  joblistId: integer('joblistid').notNull().references(() => operationJobLists.id),
  filePath: varchar('filepath', { length: 255 }).notNull(),
  fileName: varchar('filename', { length: 255 }).notNull(),
  fileSize: integer('filesize').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})
```

## Files Changed
1. `server/db/schema.ts` - Reverted column reference to `joblistid`
2. `server/db/migrations/0012_long_thunderbird.sql` - Deleted
3. `server/db/migrations/meta/0012_snapshot.json` - Deleted  
4. `server/db/migrations/meta/_journal.json` - Removed migration entry

## Previous Attempts
- Initially tried using `inArray()` with defensive checks
- Fixed imports from `or` to `inArray` in multiple endpoints
- All code properly uses `inArray()` now, but schema mismatch was causing failures

## Result
- ✅ Schema matches actual database structure
- ✅ All `inArray(fieldDocumentations.joblistId, ids)` queries work correctly
- ✅ Migration history is clean and accurate
- ✅ No phantom migrations marked as applied

## Lesson Learned
**Never** use `mark-as-migrated` without actually running the migration SQL against the database. This creates a state mismatch between the migration tracker and actual database schema.
