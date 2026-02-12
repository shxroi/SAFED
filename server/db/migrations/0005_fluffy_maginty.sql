CREATE TYPE "public"."statusenum" AS ENUM('Good', 'Not Good');--> statement-breakpoint
CREATE TABLE "joblists" (
	"id" serial PRIMARY KEY NOT NULL,
	"operationid" integer NOT NULL,
	"sectionname" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operationjoblists" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobsectionid" integer NOT NULL,
	"operationid" integer NOT NULL,
	"executedby" integer,
	"jobdescription" text NOT NULL,
	"status" "statusenum" NOT NULL,
	"notes" text,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operationstools" (
	"id" serial PRIMARY KEY NOT NULL,
	"operationid" integer NOT NULL,
	"toolid" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"prestatus" "statusenum" NOT NULL,
	"postsatus" "statusenum" NOT NULL,
	"prenote" text,
	"postnote" text
);
--> statement-breakpoint
ALTER TABLE "joblists" ADD CONSTRAINT "joblists_operationid_operations_id_fk" FOREIGN KEY ("operationid") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationjoblists" ADD CONSTRAINT "operationjoblists_jobsectionid_joblists_id_fk" FOREIGN KEY ("jobsectionid") REFERENCES "public"."joblists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationjoblists" ADD CONSTRAINT "operationjoblists_operationid_operations_id_fk" FOREIGN KEY ("operationid") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationjoblists" ADD CONSTRAINT "operationjoblists_executedby_users_id_fk" FOREIGN KEY ("executedby") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationstools" ADD CONSTRAINT "operationstools_operationid_operations_id_fk" FOREIGN KEY ("operationid") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operationstools" ADD CONSTRAINT "operationstools_toolid_tools_id_fk" FOREIGN KEY ("toolid") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;