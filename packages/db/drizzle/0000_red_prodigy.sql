CREATE TYPE "public"."board_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."public_mutation_policy" AS ENUM('access_code_required', 'staff_only', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."public_view_policy" AS ENUM('open', 'access_code_required');--> statement-breakpoint
CREATE TYPE "public"."qr_rotation_policy" AS ENUM('manual', 'scheduled');--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"public_slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "board_status" NOT NULL,
	"public_view_policy" "public_view_policy" NOT NULL,
	"public_add_policy" "public_mutation_policy" NOT NULL,
	"public_remove_policy" "public_mutation_policy" NOT NULL,
	"qr_rotation_policy" "qr_rotation_policy" NOT NULL,
	"qr_rotation_interval_minutes" integer,
	"next_sort_order" integer DEFAULT 1 NOT NULL,
	"display_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boards_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_venue_slug_unique" ON "boards" USING btree ("venue_id","slug");--> statement-breakpoint
CREATE INDEX "boards_venue_id_idx" ON "boards" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_organization_slug_unique" ON "venues" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "venues_organization_id_idx" ON "venues" USING btree ("organization_id");