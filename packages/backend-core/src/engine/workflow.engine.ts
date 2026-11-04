import handlerRegistry from "./handler.registry.js";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../config/database.js";
import StepExecutionError from "../errors/step-execution.error.js";
import {
    redactSensitiveData,
    sanitizeErrorMessage,
} from "../utils/data-redaction.js";

interface WorkflowStep {
    id: string;
    type: string;
    config: Record<string, unknown>;
    retry?: {
        maxAttempts?: number;
        delayMs?: number;
        backoffMultiplier?: number;
    };
}

interface WorkflowDefinition {
    steps: WorkflowStep[];
}
interface WorkflowRetryResult {
    retryDelay: number;
    nextRetryAt: Date;
}

class WorkflowEngine {
    async executeWorkflow(
        executionId: string
    ): Promise<WorkflowRetryResult | null> {
        const claim = await prisma.workflowExecution.updateMany({
            where: {
                id: executionId,
                status: "PENDING",
            },
            data: {
                status: "RUNNING",
                startedAt: new Date(),
            },
        });

        if (claim.count === 0) {
            throw new Error(
                "Workflow execution not found or is not available to run"
            );
        }

        const execution = await prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
                workflowVersion: true,
                steps: true,
            },
        });

        if (!execution) {
            throw new Error("Workflow execution not found");
        }

        const definition =
            execution.workflowVersion.definition as unknown as WorkflowDefinition;

        for (const step of definition.steps) {
            const stepExecution = execution.steps.find(
                (item) => item.stepId === step.id
            );

            if (stepExecution?.status === "COMPLETED") {
                continue;
            }

            try {
                if (!stepExecution) {
                    throw new Error(
                        `Step execution record not found: ${step.id}`
                    );
                }

                const maxAttempts = Math.max(
                    1,
                    step.retry?.maxAttempts ?? 3
                );

                const delayMs = Math.max(
                    0,
                    step.retry?.delayMs ?? 1000
                );

                const backoffMultiplier = Math.max(
                    1,
                    step.retry?.backoffMultiplier ?? 2
                );

                const currentAttempt = stepExecution.attempts + 1;

                try {
                    await prisma.stepExecution.update({
                        where: { id: stepExecution.id },
                        data: {
                            status: "RUNNING",
                            startedAt: new Date(),
                            attempts: { increment: 1 },
                            input: redactSensitiveData(
                                step.config
                            ) as Prisma.InputJsonValue,
                            error: null,
                        },
                    });

                    const handler = handlerRegistry.get(step.type);
                    const output = await handler.execute(step.config);

                    await prisma.stepExecution.update({
                        where: { id: stepExecution.id },
                        data: {
                            status: "COMPLETED",
                            output: redactSensitiveData(
                                output
                            ) as Prisma.InputJsonValue,
                            completedAt: new Date(),
                            nextRetryAt: null,
                        },
                    });
                } catch (error) {
                    const lastError = sanitizeErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Step execution failed",
                        step.config
                    );

                    if (
                        error instanceof StepExecutionError &&
                        !error.retryable
                    ) {
                        throw error;
                    }

                    if (currentAttempt >= maxAttempts) {
                        throw new Error(lastError);
                    }

                    const retryDelay =
                        delayMs *
                        Math.pow(backoffMultiplier, currentAttempt - 1);

                    const nextRetryAt = new Date(
                        Date.now() + retryDelay
                    );

                    await prisma.$transaction(async (tx) => {
                        await tx.stepExecution.update({
                            where: { id: stepExecution.id },
                            data: {
                                status: "RETRY_WAIT",
                                error: lastError,
                                nextRetryAt,
                            },
                        });

                        await tx.workflowExecution.update({
                            where: { id: executionId },
                            data: {
                                status: "PENDING",
                            },
                        });
                    });
                    return {
                        retryDelay,
                        nextRetryAt,
                    };
                }
            } catch (error) {
                const errorMessage = sanitizeErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Step execution failed",
                    step.config
                );

                await prisma.$transaction(async (tx) => {
                    if (stepExecution) {
                        await tx.stepExecution.update({
                            where: { id: stepExecution.id },
                            data: {
                                status: "FAILED",
                                error: errorMessage,
                                completedAt: new Date(),
                                nextRetryAt: null,
                            },
                        });
                    }

                    await tx.stepExecution.updateMany({
                        where: {
                            executionId,
                            status: "PENDING",
                        },
                        data: {
                            status: "SKIPPED",
                        },
                    });

                    await tx.workflowExecution.update({
                        where: { id: executionId },
                        data: {
                            status: "FAILED",
                            error: errorMessage,
                            completedAt: new Date(),
                        },
                    });
                });

                return null;
            }
        }

        await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });

        return null;
    }
}

const workflowEngine = new WorkflowEngine();

export default workflowEngine;
