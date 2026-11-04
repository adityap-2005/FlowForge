interface WorkflowJobData {
    executionId: string;
}

interface WorkflowRetryResult {
    retryDelay: number;
    nextRetryAt: Date;
}

interface WorkflowProcessorDependencies {
    executeWorkflow: (
        executionId: string
    ) => Promise<WorkflowRetryResult | null>;

    addWorkflowJob: (
        executionId: string,
        delay?: number,
        retryAt?: Date
    ) => Promise<unknown>;
}

export function createWorkflowProcessor({
    executeWorkflow,
    addWorkflowJob,
}: WorkflowProcessorDependencies) {
    return async (job: {
        name: string;
        data: WorkflowJobData;
    }) => {
        console.log(`Processing execution: ${job.data.executionId}`);

        if (job.name !== "execute-workflow") {
            throw new Error(`Unsupported job type: ${job.name}`);
        }

        const retryDelay = await executeWorkflow(job.data.executionId);

        if (retryDelay !== null) {
            console.log(
                `Scheduling retry for execution: ${job.data.executionId} in ${retryDelay.retryDelay}ms`
            );

            await addWorkflowJob(
                job.data.executionId,
                retryDelay.retryDelay,
                retryDelay.nextRetryAt
            );

            console.log(
                `Retry scheduled successfully for execution: ${job.data.executionId}`
            );
        } else {
            console.log(`Execution finished: ${job.data.executionId}`);
        }
    };
}