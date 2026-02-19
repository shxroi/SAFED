# SAFED Data Model

## Overview

SAFED uses PostgreSQL with Drizzle ORM. The operation execution flow centers on operations, checklists, tools, job tasks, and field documentation photos.

## Core Entities

### users

- `id` (PK)
- `name`, `username`, `email`, `password`
- `roles` (`IM` | `OBSERVER` | `STAFF`)
- `isActive`, `createdAt`

### operations

- `id` (PK)
- `company`, `type`, `vesselName`, `location`, `date`
- `status` (`Draft` | `Active` | `Complete` | `Cancelled`)
- `createdAt`

### operationsenroll

- `id` (PK)
- `userId` -> `users.id`
- `operationId` -> `operations.id`
- `operationRole` (`SUPERVISOR` | `STAFF`)

### tools

- `id` (PK)
- `name`

### operationtools

- `id` (PK)
- `operationId` -> `operations.id`
- `toolId` -> `tools.id`
- `quantity`
- `preStatus`, `postStatus` (`Good` | `Not Good` | null)
- `preNote`, `postNote`

### jobsection

- `id` (PK)
- `operationId` -> `operations.id`
- `sectionName`

### operationjoblists

- `id` (PK)
- `jobsectionId` -> `jobsection.id`
- `operationId` -> `operations.id`
- `executedBy` -> `users.id` (nullable)
- `jobDescription`
- `documentationRequired` (boolean)
- `status` (`Good` | `Not Good` | null)
- `notes`
- `createdAt`

### fielddocumentations

- `id` (PK)
- `joblistId` -> `operationjoblists.id`
- `filePath`, `fileName`, `fileSize`
- `timestamp`

## Key Relationships

- One `operation` has many `operationsenroll` members.
- One `operation` has many `operationtools` rows.
- One `operation` has many `jobsection` rows.
- One `jobsection` has many `operationjoblists` activities.
- One `operationjoblists` activity has up to 2 `fielddocumentations` photos (enforced in API logic).

## Runtime Query Notes

- For `fielddocumentations` lookups by joblist IDs, treat singleton ID arrays defensively:
  - use `eq(joblistId, id)` for one ID,
  - use `inArray(joblistId, ids)` for multiple IDs,
  - skip query for zero IDs.
- This avoids singleton `IN ($1)` edge behavior seen in certain runtime/driver combinations.
