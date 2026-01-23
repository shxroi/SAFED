CREATE TYPE "public"."userroles" AS ENUM('IM', 'OBSERVER', 'STAFF');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"username" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(100) NOT NULL,
	"roles" "userroles" NOT NULL,
	"isactive" boolean DEFAULT true NOT NULL,
	"createdat" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
