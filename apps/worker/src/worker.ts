import path from "node:path";
import dotenv from "dotenv";
import { Redis } from "ioredis";
import { Worker } from "bullmq";

import { createWorkflowProcessor } from "./processors/workflow.processor.js";

dotenv.config({
  path: path.resolve(process.cwd(), "../api/.env"),
});

console.log(
  "Worker DATABASE_URL valid:",
  Boolean(process.env.DATABASE_URL?.startsWith("postgresql://"))
);

const {
  workflowEngine,
  addWorkflowJob,
  closeWorkflowQueue,
} = await import("@flowforge/backend-core");

import { recoverPendingRetries } from "./recovery/retry.recovery.js";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

interface WorkflowJobData {
  executionId: string;
}

const workflowWorker = new Worker<WorkflowJobData>(
  "workflow-execution",
  createWorkflowProcessor({
    executeWorkflow: (executionId) =>
      workflowEngine.executeWorkflow(executionId),

    addWorkflowJob: (executionId, delay, retryAt) =>
      addWorkflowJob(executionId, delay, retryAt),
  }),
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

const RETRY_RECOVERY_INTERVAL = 5000;

let isRecovering = false;

const recoveryInterval = setInterval(async () => {
  if (isRecovering) return;

  isRecovering = true;

  try {
    const recoveryResult = await recoverPendingRetries();

    if (recoveryResult.found > 0) {
      console.log(
        `Retry recovery: found ${recoveryResult.found}, scheduled ${recoveryResult.scheduled}`
      );
    }
  } catch (error) {
    console.error("Retry recovery failed:", error);
  } finally {
    isRecovering = false;
  }
}, RETRY_RECOVERY_INTERVAL);

workflowWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

workflowWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

workflowWorker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("FlowForge worker started");

async function shutdown() {
  console.log("Shutting down worker...");
  clearInterval(recoveryInterval);

  try {
    await workflowWorker.close();
    await closeWorkflowQueue();
    await redisConnection.quit();

    console.log("Worker shut down successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
