-- AlterTable CalendarEvent
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "attendees" TEXT;
