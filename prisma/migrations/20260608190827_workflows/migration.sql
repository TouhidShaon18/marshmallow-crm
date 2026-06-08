-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "workflowId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "workflowId" TEXT;

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "trigger" TEXT NOT NULL,
    "triggerStage" TEXT,
    "daysBefore" INTEGER,
    "inactivityDays" INTEGER,
    "action" TEXT NOT NULL,
    "actionSequenceId" TEXT,
    "taskChannel" TEXT,
    "taskTitle" TEXT,
    "taskMessage" TEXT,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
