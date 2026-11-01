
import path from "node:path";
import dotenv from "dotenv";
import { Redis } from "ioredis";
import { Worker } from "bullmq";

import { workflowEngine } from "@flowforge/backend-core";

dotenv.config({
  path: path.resolve(process.cwd(), "../api/.env"),
});

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
  async (job) => {
    console.log(`Processing execution: ${job.data.executionId}`);

    if (job.name !== "execute-workflow") {
      throw new Error(`Unsupported job type: ${job.name}`);
    }

    await workflowEngine.executeWorkflow(job.data.executionId);

    console.log(`Execution completed: ${job.data.executionId}`);
  },
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
