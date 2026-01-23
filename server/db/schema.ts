import { pgTable, serial, varchar, timestamp, boolean, pgEnum, text, integer } from 'drizzle-orm/pg-core';

export const userRolesEnum = pgEnum('userroles', ['IM', 'OBSERVER', 'STAFF']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(), // Added Email
  password: varchar('password', { length: 100 }).notNull(),
  roles: userRolesEnum('roles').notNull(),
  isActive: boolean('isactive').notNull().default(true),
  createdAt: timestamp('createdat').notNull().defaultNow(),
});