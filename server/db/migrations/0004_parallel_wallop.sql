ALTER TABLE "operationenroll" RENAME TO "operationsenroll";--> statement-breakpoint
ALTER TABLE "operationsenroll" DROP CONSTRAINT "operationenroll_userid_users_id_fk";
--> statement-breakpoint
ALTER TABLE "operationsenroll" DROP CONSTRAINT "operationenroll_operationid_operations_id_fk";
--> statement-breakpoint
ALTER TABLE "operationsenroll" ALTER COLUMN "operationrole" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."operationrole";--> statement-breakpoint
CREATE TYPE "public"."operationrole" AS ENUM('SUPERVISOR', 'STAFF');--> statement-breakpoint
ALTER TABLE "operationsenroll" ALTER COLUMN "operationrole" SET DATA TYPE "public"."operationrole" USING "operationrole"::"public"."operationrole";--> statement-breakpoint
ALTER TABLE "operationsenroll" ADD CONSTRAINT "operationsenroll_userid_users_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationsenroll" ADD CONSTRAINT "operationsenroll_operationid_operations_id_fk" FOREIGN KEY ("operationid") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;