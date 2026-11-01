import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "../config/database.js";
import workflowEngine from "../engine/workflow.engine.js";
import handlerRegistry from "../engine/handler.registry.js";

vi.mock("../config/database.js", () => ({
    default: {
        workflowExecution: {
            updateMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        stepExecution: {
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock("../engine/handler.registry.js", () => ({
    default: {
        get: vi.fn(() => ({
            execute: vi.fn().mockResolvedValue({
                result: "success",
            }),
        })),
    },
}));


describe("WorkflowEngine", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
            return callback(prisma);
        });
    });

    it("should reject an execution that is not PENDING", async () => {
        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 0,
        } as never);

        await expect(
            workflowEngine.executeWorkflow("execution-123")
        ).rejects.toThrow(
            "Workflow execution not found or is not available to run"
        );

        expect(prisma.workflowExecution.updateMany).toHaveBeenCalledWith({
            where: {
                id: "execution-123",
                status: "PENDING",
            },
            data: {
                status: "RUNNING",
                startedAt: expect.any(Date),
            },
        });
    });

    it("should execute a workflow successfully", async () => {
        const execution = {
            id: "execution-123",
            status: "PENDING",
            workflowVersion: {
                definition: {
                    steps: [
                        {
                            id: "step-1",
                            type: "http",
                            config: { url: "https://example.com", method: "GET" },
                        },
                    ],
                },
            },
            steps: [
                {
                    id: "step-execution-1",
                    stepId: "step-1",
                    status: "PENDING",
                },
            ],
        };

        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(
            execution as never
        );

        vi.mocked(prisma.stepExecution.update).mockResolvedValue({} as never);
        vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as never);

        await workflowEngine.executeWorkflow("execution-123");

        expect(prisma.workflowExecution.updateMany).toHaveBeenCalled();
        expect(prisma.stepExecution.update).toHaveBeenCalledTimes(2);

        expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "execution-123" },
                data: expect.objectContaining({
                    status: "COMPLETED",
                }),
            })
        );
    });

    it("should fail the workflow and skip remaining steps when a step fails", async () => {
        const execution = {
            id: "execution-123",
            status: "PENDING",
            workflowVersion: {
                definition: {
                    steps: [
                        {
                            id: "step-1",
                            type: "http",
                            config: { url: "https://example.com", method: "GET" },
                        },
                        {
                            id: "step-2",
                            type: "email",
                            config: { to: "test@example.com", subject: "Test", body: "Hello" },
                        },
                    ],
                },
            },
            steps: [
                {
                    id: "step-execution-1",
                    stepId: "step-1",
                    status: "PENDING",
                },
                {
                    id: "step-execution-2",
                    stepId: "step-2",
                    status: "PENDING",
                },
            ],
        };

        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(
            execution as never
        );

        vi.mocked(prisma.stepExecution.update).mockResolvedValue({} as never);

        vi.mocked(handlerRegistry.get).mockReturnValue({
            execute: vi.fn().mockRejectedValue(new Error("HTTP request failed")),
        });

        vi.mocked(prisma.stepExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as never);

        await workflowEngine.executeWorkflow("execution-123");

        expect(prisma.stepExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "step-execution-1" },
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "HTTP request failed",
                }),
            })
        );

        expect(prisma.stepExecution.updateMany).toHaveBeenCalledWith({
            where: {
                executionId: "execution-123",
                status: "PENDING",
            },
            data: {
                status: "SKIPPED",
            },
        });

        expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "execution-123" },
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "HTTP request failed",
                }),
            })
        );
    });

    it("should mark a step and workflow as FAILED when a handler fails", async () => {
        const execution = {
            id: "execution-123",
            status: "PENDING",
            workflowVersion: {
                definition: {
                    steps: [
                        {
                            id: "step-1",
                            type: "http",
                            config: { url: "https://example.com", method: "GET" },
                        },
                    ],
                },
            },
            steps: [
                {
                    id: "step-execution-1",
                    stepId: "step-1",
                    status: "PENDING",
                },
            ],
        };

        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(
            execution as never
        );

        vi.mocked(prisma.stepExecution.update).mockResolvedValue({} as never);
        vi.mocked(prisma.stepExecution.updateMany).mockResolvedValue({
            count: 0,
        } as never);
        vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as never);

        vi.mocked(handlerRegistry.get).mockReturnValue({
            execute: vi.fn().mockRejectedValue(new Error("External API unavailable")),
        });

        await workflowEngine.executeWorkflow("execution-123");

        expect(prisma.stepExecution.update).toHaveBeenLastCalledWith(
            expect.objectContaining({
                where: { id: "step-execution-1" },
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "External API unavailable",
                }),
            })
        );

        expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "execution-123" },
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "External API unavailable",
                }),
            })
        );
    });

    it("should reject duplicate execution attempts", async () => {
        vi.mocked(prisma.workflowExecution.updateMany)
            .mockResolvedValueOnce({ count: 1 } as never)
            .mockResolvedValueOnce({ count: 0 } as never);

        // First call claims the execution, but the test doesn't need
        // to fetch the workflow because we'll stop the second call here.
        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue({
            id: "execution-123",
            status: "PENDING",
            workflowVersion: {
                definition: { steps: [] },
            },
            steps: [],
        } as never);

        await workflowEngine.executeWorkflow("execution-123");

        await expect(
            workflowEngine.executeWorkflow("execution-123")
        ).rejects.toThrow(
            "Workflow execution not found or is not available to run"
        );

        expect(prisma.workflowExecution.updateMany).toHaveBeenCalledTimes(2);
    });

    it("should retry a failed step and succeed on the third attempt", async () => {
        const execution = {
            id: "execution-retry",
            status: "PENDING",
            workflowVersion: {
                definition: {
                    steps: [
                        {
                            id: "step-1",
                            type: "http",
                            config: { url: "https://example.com", method: "GET" },
                            retry: {
                                maxAttempts: 3,
                                delayMs: 0,
                                backoffMultiplier: 2,
                            },
                        },
                    ],
                },
            },
            steps: [
                {
                    id: "step-execution-1",
                    stepId: "step-1",
                    status: "PENDING",
                },
            ],
        };

        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(
            execution as never
        );

        vi.mocked(prisma.stepExecution.update).mockResolvedValue({} as never);
        vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as never);

        const execute = vi.fn()
            .mockRejectedValueOnce(new Error("Temporary failure"))
            .mockRejectedValueOnce(new Error("Temporary failure"))
            .mockResolvedValueOnce({ result: "success" });

        vi.mocked(handlerRegistry.get).mockReturnValue({
            execute,
        } as never);

        await workflowEngine.executeWorkflow("execution-retry");

        expect(execute).toHaveBeenCalledTimes(3);

        expect(prisma.stepExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "step-execution-1" },
                data: expect.objectContaining({
                    status: "COMPLETED",
                }),
            })
        );

        expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: "COMPLETED",
                }),
            })
        );
    });

    it("should fail the workflow when all retry attempts are exhausted", async () => {
        const execution = {
            id: "execution-exhausted",
            status: "PENDING",
            workflowVersion: {
                definition: {
                    steps: [
                        {
                            id: "step-1",
                            type: "http",
                            config: { url: "https://example.com", method: "GET" },
                            retry: {
                                maxAttempts: 3,
                                delayMs: 0,
                                backoffMultiplier: 2,
                            },
                        },
                        {
                            id: "step-2",
                            type: "email",
                            config: {
                                to: "test@example.com",
                                subject: "Test",
                                body: "Hello",
                            },
                        },
                    ],
                },
            },
            steps: [
                {
                    id: "step-execution-1",
                    stepId: "step-1",
                    status: "PENDING",
                },
                {
                    id: "step-execution-2",
                    stepId: "step-2",
                    status: "PENDING",
                },
            ],
        };

        vi.mocked(prisma.workflowExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);

        vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(
            execution as never
        );

        vi.mocked(prisma.stepExecution.update).mockResolvedValue({} as never);
        vi.mocked(prisma.stepExecution.updateMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as never);

        const execute = vi.fn().mockRejectedValue(
            new Error("External API unavailable")
        );

        vi.mocked(handlerRegistry.get).mockReturnValue({
            execute,
        } as never);

        await workflowEngine.executeWorkflow("execution-exhausted");

        expect(execute).toHaveBeenCalledTimes(3);

        expect(prisma.stepExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "step-execution-1" },
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "External API unavailable",
                }),
            })
        );

        expect(prisma.stepExecution.updateMany).toHaveBeenCalledWith({
            where: {
                executionId: "execution-exhausted",
                status: "PENDING",
            },
            data: {
                status: "SKIPPED",
            },
        });

        expect(prisma.workflowExecution.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: "FAILED",
                    error: "External API unavailable",
                }),
            })
        );

        expect(prisma.workflowExecution.update).not.toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: "COMPLETED",
                }),
            })
        );
    });

});
