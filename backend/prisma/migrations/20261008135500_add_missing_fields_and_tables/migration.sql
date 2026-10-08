-- AlterTable User
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailySummaryTime" TEXT DEFAULT '06:00';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "enableDailySummary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "periodicSummaryType" TEXT DEFAULT 'WEEKLY';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "periodicSummaryDay" INTEGER DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastDailySummaryDate" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPeriodicDate" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;

-- AlterTable Household
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "dailySummaryTime" TEXT DEFAULT '06:00';
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "enableDailySummary" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "periodicSummaryType" TEXT DEFAULT 'WEEKLY';
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "periodicSummaryDay" INTEGER DEFAULT 1;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "lastDailySummaryDate" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "lastPeriodicDate" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;

-- AlterTable Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "hasSpecificTime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable ShoppingItem
CREATE TABLE IF NOT EXISTS "ShoppingItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" TEXT DEFAULT '1',
    "category" TEXT DEFAULT 'Geral',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "scope" "RecordScope" NOT NULL DEFAULT 'SHARED',
    "userId" TEXT NOT NULL,
    "householdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable CalendarEvent
CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "googleEventId" TEXT,
    "scope" "RecordScope" NOT NULL DEFAULT 'SHARED',
    "userId" TEXT NOT NULL,
    "householdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "ShoppingItem_householdId_isCompleted_idx" ON "ShoppingItem"("householdId", "isCompleted");
CREATE INDEX IF NOT EXISTS "ShoppingItem_userId_isCompleted_idx" ON "ShoppingItem"("userId", "isCompleted");
CREATE INDEX IF NOT EXISTS "CalendarEvent_userId_startDate_idx" ON "CalendarEvent"("userId", "startDate");
CREATE INDEX IF NOT EXISTS "CalendarEvent_householdId_startDate_idx" ON "CalendarEvent"("householdId", "startDate");
CREATE INDEX IF NOT EXISTS "CalendarEvent_googleEventId_idx" ON "CalendarEvent"("googleEventId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingItem_userId_fkey') THEN
        ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShoppingItem_householdId_fkey') THEN
        ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_userId_fkey') THEN
        ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_householdId_fkey') THEN
        ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
