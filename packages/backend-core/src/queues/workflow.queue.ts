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
    delay = 0
) {
    return workflowQueue.add(
        "execute-workflow",
        { executionId },
        {
            jobId: delay > 0
                ? `${executionId}-retry-${Date.now()}`
                : executionId,
            delay,
        }
    );
}

export default workflowQueue;