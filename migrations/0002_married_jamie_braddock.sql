ALTER TABLE "jobs" ADD COLUMN "ai_screening_threshold" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "shortlisting_threshold" integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "interview_scheduled_threshold" integer DEFAULT 85 NOT NULL;