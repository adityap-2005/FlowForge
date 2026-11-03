
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@flowforge/backend-core";
import workflowService from "../services/workflow.service.js";
import AppError from "../utils/AppError.js";

vi.mock("@flowforge/backend-core", () => ({
    prisma: {
        workflow: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
        workflowVersion: {
            findFirst: vi.fn(),
            create: vi.fn(),
        },
    },
}));

describe("WorkflowService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validDefinition = {
        steps: [
            {
                id: "step-1",
                type: "http",
                config: {
                    url: "https://example.com",
                    method: "GET",
                },
            },
        ],
    };


    describe("createWorkflow", () => {
        it("should create a workflow with its first version", async () => {
            const mockWorkflow = {
                id: "workflow-123",
                name: "Test Workflow",
                versions: [
                    {
                        version: 1,
                        definition: validDefinition,
                    },
                ],
            };

            vi.mocked(prisma.workflow.create).mockResolvedValue(
                mockWorkflow as never
            );

            const result = await workflowService.createWorkflow({
                name: "Test Workflow",
                definition: validDefinition,
            });

            expect(result).toEqual(mockWorkflow);

            expect(prisma.workflow.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: "Test Workflow",
                        versions: {
                            create: expect.objectContaining({
                                version: 1,
                            }),
                        },
                    }),
                })
            );
        });

        it("should reject an invalid workflow definition", async () => {
            await expect(
                workflowService.createWorkflow({
                    name: "Invalid Workflow",
                    definition: {
                        steps: [],
                    },
                })
            ).rejects.toThrow(AppError);

            expect(prisma.workflow.create).not.toHaveBeenCalled();
        });
    });

    describe("getWorkflows", () => {
        it("should return all workflows", async () => {
            const mockWorkflows = [
                {
                    id: "workflow-123",
                    name: "Test Workflow",
                },
                {
                    id: "workflow-456",
                    name: "Email Workflow",
                },
            ];
    
            vi.mocked(prisma.workflow.findMany).mockResolvedValue(
                mockWorkflows as never
            );
    
            const result = await workflowService.getWorkflows();
    
            expect(result).toEqual(mockWorkflows);
            expect(prisma.workflow.findMany).toHaveBeenCalledTimes(1);
        });
    });

    describe("getWorkflowById", () => {
        it("should return a workflow by ID", async () => {
            const mockWorkflow = {
                id: "workflow-123",
                name: "Test Workflow",
                versions: [],
            };
    
            vi.mocked(prisma.workflow.findUnique).mockResolvedValue(
                mockWorkflow as never
            );
    
            const result = await workflowService.getWorkflowById(
                "workflow-123"
            );
    
            expect(result).toEqual(mockWorkflow);
    
            expect(prisma.workflow.findUnique).toHaveBeenCalledWith({
                where: {
                    id: "workflow-123",
                },
                include: {
                    versions: {
                        orderBy: {
                            version: "desc",
                        },
                    },
                },
            });
        });
    });

    describe("createWorkflowVersion", () => {
        it("should create the next workflow version", async () => {
            vi.mocked(prisma.workflow.findUnique).mockResolvedValue({
                id: "workflow-123",
            } as never);
    
            vi.mocked(prisma.workflowVersion.findFirst).mockResolvedValue({
                version: 1,
            } as never);
    
            const mockVersion = {
                id: "version-2",
                workflowId: "workflow-123",
                version: 2,
            };
    
            vi.mocked(prisma.workflowVersion.create).mockResolvedValue(
                mockVersion as never
            );
    
            const result = await workflowService.createWorkflowVersion(
                "workflow-123",
                validDefinition
            );
    
            expect(result).toEqual(mockVersion);
    
            expect(prisma.workflowVersion.create).toHaveBeenCalledWith({
                data: {
                    workflowId: "workflow-123",
                    version: 2,
                    definition: validDefinition,
                },
            });
        });
    
        it("should reject version creation for a missing workflow", async () => {
            vi.mocked(prisma.workflow.findUnique).mockResolvedValue(null);
    
            await expect(
                workflowService.createWorkflowVersion(
                    "invalid-id",
                    validDefinition
                )
            ).rejects.toThrow("Workflow not found");
    
            expect(prisma.workflowVersion.create).not.toHaveBeenCalled();
        });
    
        it("should reject an invalid workflow definition", async () => {
            await expect(
                workflowService.createWorkflowVersion(
                    "workflow-123",
                    { steps: [] }
                )
            ).rejects.toThrow(AppError);
    
            expect(prisma.workflow.findUnique).not.toHaveBeenCalled();
        });
    });
});