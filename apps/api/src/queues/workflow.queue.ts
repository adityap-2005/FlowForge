
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

export async function addWorkflowJob(executionId: string) {
    return workflowQueue.add(
        "execute-workflow",
        { executionId },
        {
            jobId: executionId,
        }
    );
}

export default workflowQueue;
