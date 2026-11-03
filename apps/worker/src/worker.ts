import path from "node:path";
import dotenv from "dotenv";
import { Redis } from "ioredis";
import { Worker } from "bullmq";

import { createWorkflowProcessor } from "./processors/workflow.processor.js";

dotenv.config({
  path: path.resolve(process.cwd(), "../api/.env"),
});

console.log(
  "Worker DATABASE_URL loaded:",
  Boolean(process.env.DATABASE_URL)
);

const { workflowEngine, addWorkflowJob } = await import(
  "@flowforge/backend-core"
);

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

    addWorkflowJob: (executionId, delay) =>
      addWorkflowJob(executionId, delay),
  }),
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

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

  await workflowWorker.close();
  await redisConnection.quit();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
