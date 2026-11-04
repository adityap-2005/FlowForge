import { Queue } from "bullmq";
import redisConnection from "./redis.connection.js";

export interface WorkflowJobData {
    executionId: string;
}

const workflowQueue = new Queue<WorkflowJobData>(
    "workflow-execution",
    {
        connection: redisConnection,
    }
);

export async function addWorkflowJob(
    executionId: string,
    delay = 0,
    retryAt?: Date
) {
    const jobId = retryAt
    ? `${executionId}-retry-${retryAt.getTime()}`
    : executionId;

    return workflowQueue.add(
        "execute-workflow",
        { executionId },
        {
            jobId,
            delay,
        }
    );
}

export async function closeWorkflowQueue() {
    await workflowQueue.close();
    await redisConnection.quit();
}

export default workflowQueue;