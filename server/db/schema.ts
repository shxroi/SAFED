import { pgTable, serial, varchar, timestamp, boolean, pgEnum, text, integer } from 'drizzle-orm/pg-core';

export const userRolesEnum = pgEnum('userroles', ['IM', 'OBSERVER', 'STAFF']);
export const operationTypeEnum = pgEnum('operationtype', ['Upgrade', 'Installation', 'Maintenance', 'SAT/Commissioning', 'Uninstall']);
export const operationStatusEnum = pgEnum('operationstatus', ['Draft', 'Active', 'Complete', 'Cancelled'])
export const operationRoleEnum = pgEnum('operationrole', ['SUPERVISOR', 'STAFF'])
export const checklistStatusEnum = pgEnum('statusenum', ['Good', 'Not Good']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 100 }).notNull(),
  roles: userRolesEnum('roles').notNull(),
  isActive: boolean('isactive').notNull().default(true),
  createdAt: timestamp('createdat').notNull().defaultNow(),
});

export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const operations = pgTable('operations', {
  id: serial('id').primaryKey(),
  company: varchar('company', { length: 255 }).notNull(),
  type: operationTypeEnum('type').notNull(),
  vesselName: varchar('vesselname', { length: 255 }),
  location: varchar('location', { length: 100 }).notNull(),
  date: timestamp('date').notNull(),
  status: operationStatusEnum('status').notNull().default('Draft'),
  scheduleEmailLastSentAt: timestamp('scheduleemaillastsentat'),
  createdAt: timestamp('createdat').notNull().defaultNow(),
})

export const operationsEnroll = pgTable('operationsenroll', {
  id: serial('id').primaryKey(),
  userId: integer('userid').notNull().references(() => users.id),
  operationId: integer('operationid').notNull().references(() => operations.id),
  operationRole: operationRoleEnum('operationrole').notNull(),
})

export const jobsection = pgTable('jobsection', {
  id: serial('id').primaryKey(),
  operationId: integer('operationid').notNull().references(() => operations.id),
  sectionName: varchar('sectionname', { length: 255 }).notNull(),
})

export const operationTools = pgTable('operationtools', {
  id: serial('id').primaryKey(),
  operationId: integer('operationid').notNull().references(() => operations.id),
  toolId: integer('toolid').notNull().references(() => tools.id),
  quantity: integer('quantity').notNull().default(1),
  preStatus: checklistStatusEnum('prestatus'),
  postStatus: checklistStatusEnum('poststatus'),
  preNote: text('prenote'),
  postNote: text('postnote')
})

export const operationJobLists = pgTable('operationjoblists', {
  id: serial('id').primaryKey(),
  jobsectionId: integer('jobsectionid').notNull().references(() => jobsection.id),
  operationId: integer('operationid').notNull().references(() => operations.id),
  executedBy: integer('executedby').references(() => users.id),
  jobDescription: text('jobdescription').notNull(),
  documentationRequired: boolean('documentationrequired').notNull().default(false),
  status: checklistStatusEnum('status'),
  notes: text('notes'),
  createAt: timestamp('createdat').notNull().defaultNow(),
})

export const fieldDocumentations = pgTable('fielddocumentations', {
  id: serial('id').primaryKey(),
  joblistId: integer('operationjoblistid').notNull().references(() => operationJobLists.id),
  filePath: varchar('filepath', { length: 255 }).notNull(),
  fileName: varchar('filename', { length: 255 }).notNull(),
  fileSize: integer('filesize').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
})
