CREATE TABLE "explanations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"speaker" text NOT NULL,
	"transcript" text NOT NULL,
	"understanding" text NOT NULL,
	"concepts_covered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"concepts_missed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book" text NOT NULL,
	"chapter" integer DEFAULT 0 NOT NULL,
	"problem_number" integer NOT NULL,
	"problem_text" text NOT NULL,
	"solution_text" text NOT NULL,
	"syllabus_area" text NOT NULL,
	"concepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "problems_book_chapter_number" UNIQUE("book","chapter","problem_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_date" date NOT NULL,
	"book" text NOT NULL,
	"speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations" ADD CONSTRAINT "explanations_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;