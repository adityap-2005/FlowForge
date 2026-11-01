import handlerRegistry from "./handler.registry.js";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../config/database.js";

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

class WorkflowEngine {

    private async wait(delayMs: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    async executeWorkflow(executionId: string): Promise<void> {
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
            throw new Error("Workflow execution not found or is not available to run");
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

            try {
                if (!stepExecution) {
                    throw new Error(`Step execution record not found: ${step.id}`);
                }

                const maxAttempts = Math.max(1, step.retry?.maxAttempts ?? 3);
                const delayMs = Math.max(0, step.retry?.delayMs ?? 1000);
                const backoffMultiplier = Math.max(
                    1,
                    step.retry?.backoffMultiplier ?? 2
                );

                let completed = false;
                let lastError = "Step execution failed";

                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        await prisma.stepExecution.update({
                            where: { id: stepExecution.id },
                            data: {
                                status: "RUNNING",
                                startedAt: new Date(),
                                attempts: { increment: 1 },
                                input: step.config as Prisma.InputJsonValue,
                                error: null,
                            },
                        });

                        const handler = handlerRegistry.get(step.type);
                        const output = await handler.execute(step.config);

                        await prisma.stepExecution.update({
                            where: { id: stepExecution.id },
                            data: {
                                status: "COMPLETED",
                                output: output as Prisma.InputJsonValue,
                                completedAt: new Date(),
                            },
                        });

                        completed = true;
                        break;
                    } catch (error) {
                        lastError =
                            error instanceof Error
                                ? error.message
                                : "Step execution failed";

                        if (attempt === maxAttempts) {
                            break;
                        }

                        await prisma.stepExecution.update({
                            where: { id: stepExecution.id },
                            data: {
                                status: "RETRY_WAIT",
                                error: lastError,
                            },
                        });

                        const retryDelay =
                            delayMs * Math.pow(backoffMultiplier, attempt - 1);

                        await this.wait(retryDelay);
                    }
                }

                if (!completed) {
                    throw new Error(lastError);
                }
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Step execution failed";

                await prisma.$transaction(async (tx) => {
                    await tx.stepExecution.update({
                        where: { id: stepExecution!.id },
                        data: {
                            status: "FAILED",
                            error: errorMessage,
                            completedAt: new Date(),
                        },
                    });

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

                return;
            }
        }

        await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });
    }
}

const workflowEngine = new WorkflowEngine();

export default workflowEngine;
