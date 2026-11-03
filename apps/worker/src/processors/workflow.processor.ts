interface WorkflowJobData {
    executionId: string;
}

interface WorkflowProcessorDependencies {
    executeWorkflow: (executionId: string) => Promise<number | null>;
    addWorkflowJob: (
        executionId: string,
        delay?: number
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
                `Scheduling retry for execution: ${job.data.executionId} in ${retryDelay}ms`
            );

            await addWorkflowJob(job.data.executionId, retryDelay);

            console.log(
                `Retry scheduled successfully for execution: ${job.data.executionId}`
            );
        } else {
            console.log(`Execution finished: ${job.data.executionId}`);
        }
    };
}