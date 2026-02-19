CREATE TABLE "fielddocumentations" (
	"id" serial PRIMARY KEY NOT NULL,
	"joblistid" integer NOT NULL,
	"filepath" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"filesize" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fielddocumentations" ADD CONSTRAINT "fielddocumentations_joblistid_operationjoblists_id_fk" FOREIGN KEY ("joblistid") REFERENCES "public"."operationjoblists"("id") ON DELETE no action ON UPDATE no action;