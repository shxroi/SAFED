CREATE TABLE "fieldreports" (
	"id" serial PRIMARY KEY NOT NULL,
	"operationid" integer NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"pdfpath" varchar(255) NOT NULL,
	"generatedby" integer NOT NULL,
	"generatedat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fieldreports_operationid_unique" UNIQUE("operationid")
);
--> statement-breakpoint
CREATE TABLE "fieldreportnotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportid" integer NOT NULL,
	"note" text NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fieldreportnotedocumentations" (
	"id" serial PRIMARY KEY NOT NULL,
	"noteid" integer NOT NULL,
	"documentationid" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fieldreports" ADD CONSTRAINT "fieldreports_operationid_operations_id_fk" FOREIGN KEY ("operationid") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fieldreports" ADD CONSTRAINT "fieldreports_generatedby_users_id_fk" FOREIGN KEY ("generatedby") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fieldreportnotes" ADD CONSTRAINT "fieldreportnotes_reportid_fieldreports_id_fk" FOREIGN KEY ("reportid") REFERENCES "public"."fieldreports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fieldreportnotedocumentations" ADD CONSTRAINT "fieldreportnotedocumentations_noteid_fieldreportnotes_id_fk" FOREIGN KEY ("noteid") REFERENCES "public"."fieldreportnotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fieldreportnotedocumentations" ADD CONSTRAINT "fieldreportnotedocumentations_documentationid_fielddocumentations_id_fk" FOREIGN KEY ("documentationid") REFERENCES "public"."fielddocumentations"("id") ON DELETE no action ON UPDATE no action;
