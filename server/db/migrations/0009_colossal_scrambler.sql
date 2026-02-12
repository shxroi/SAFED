ALTER TABLE "operationjoblists" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "operationtools" ALTER COLUMN "prestatus" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "operationtools" ALTER COLUMN "poststatus" DROP NOT NULL;