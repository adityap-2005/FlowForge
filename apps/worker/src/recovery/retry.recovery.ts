import {
    prisma,
    addWorkflowJob,
} from "@flowforge/backend-core";

export async function recoverPendingRetries() {
    const now = new Date();

    const pendingRetries = await prisma.stepExecution.findMany({
        where: {
            status: "RETRY_WAIT",
            nextRetryAt: {
                lte: now,
            },
            execution: {
                is: {
                    status: "PENDING",
                },
            },
        },
        select: {
            executionId: true,
            nextRetryAt: true,
        },
    });

    let scheduledCount = 0;

    for (const retry of pendingRetries) {
        if (!retry.nextRetryAt) continue;

        const delay = Math.max(
            0,
            retry.nextRetryAt.getTime() - Date.now()
        );

        try {
            await addWorkflowJob(
                retry.executionId,
                delay,
                retry.nextRetryAt
            );

            scheduledCount++;
        } catch (error) {
            console.error(
                `Failed to recover execution ${retry.executionId}:`,
                error
            );
        }
    }

    return {
        found: pendingRetries.length,
        scheduled: scheduledCount,
    };
}
