CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"preferred_time" text NOT NULL,
	"services" text NOT NULL,
	"location" text NOT NULL,
	"total" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"email_sent" boolean DEFAULT false NOT NULL,
	"sms_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
