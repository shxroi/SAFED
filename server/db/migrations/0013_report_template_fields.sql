ALTER TABLE "fieldreports" ADD COLUMN IF NOT EXISTS "referencenumber" varchar(120) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "fieldreports" ADD COLUMN IF NOT EXISTS "serialnumber" varchar(120) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "fieldreports" ADD COLUMN IF NOT EXISTS "crewname" varchar(255) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "fieldreports" ADD COLUMN IF NOT EXISTS "crewsignrequired" boolean DEFAULT false NOT NULL;
