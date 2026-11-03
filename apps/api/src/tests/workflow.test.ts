import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import AppError from "../utils/AppError.js";

const {
    mockCreateWorkflow,
    mockGetWorkflows,
    mockGetWorkflowById,
    mockCreateWorkflowVersion,
} = vi.hoisted(() => ({
    mockCreateWorkflow: vi.fn(),
    mockGetWorkflows: vi.fn(),
    mockGetWorkflowById: vi.fn(),
    mockCreateWorkflowVersion: vi.fn(),
}));

vi.mock("@flowforge/backend-core", () => ({
    prisma: {},
    addWorkflowJob: vi.fn(),
}));

vi.mock("../services/workflow.service.js", () => ({
    default: {
        createWorkflow: mockCreateWorkflow,
        getWorkflows: mockGetWorkflows,
        getWorkflowById: mockGetWorkflowById,
        createWorkflowVersion: mockCreateWorkflowVersion,
    },
}));

vi.mock("../services/execution.service.js", () => ({
    default: {
        createExecution: vi.fn(),
        getExecutionById: vi.fn(),
        getExecutions: vi.fn(),
    },
}));

import app from "../app.js";

describe("Workflow API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("POST /api/workflows", () => {
        it("should create a workflow", async () => {
            const mockWorkflow = {
                id: "workflow-123",
                name: "Test Workflow",
                versions: [],
            };

            mockCreateWorkflow.mockResolvedValue(mockWorkflow);

            const response = await request(app)
                .post("/api/workflows")
                .send({
                    name: "Test Workflow",
                    definition: {
                        steps: [],
                    },
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual(mockWorkflow);
            expect(mockCreateWorkflow).toHaveBeenCalled();
        });

        it("should reject an empty workflow name", async () => {
            const response = await request(app)
                .post("/api/workflows")
                .send({
                    name: " ",
                    definition: {
                        steps: [],
                    },
                });

            expect(response.status).toBe(400);
            expect(mockCreateWorkflow).not.toHaveBeenCalled();
        });

        it("should reject an invalid workflow definition type", async () => {
            const response = await request(app)
                .post("/api/workflows")
                .send({
                    name: "Test Workflow",
                    definition: [],
                });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /api/workflows", () => {
        it("should return all workflows", async () => {
            const mockWorkflows = [
                {
                    id: "workflow-123",
                    name: "Test Workflow",
                },
            ];

            mockGetWorkflows.mockResolvedValue(mockWorkflows);

            const response = await request(app)
                .get("/api/workflows");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockWorkflows);
        });
    });

    describe("GET /api/workflows/:id", () => {
        it("should return a workflow by ID", async () => {
            const mockWorkflow = {
                id: "workflow-123",
                name: "Test Workflow",
                versions: [],
            };

            mockGetWorkflowById.mockResolvedValue(mockWorkflow);

            const response = await request(app)
                .get("/api/workflows/workflow-123");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockWorkflow);
        });

        it("should return 404 when workflow does not exist", async () => {
            mockGetWorkflowById.mockResolvedValue(null);

            const response = await request(app)
                .get("/api/workflows/invalid-id");

            expect(response.status).toBe(404);
        });
    });

    describe("POST /api/workflows/:id/versions", () => {
        it("should create a new workflow version", async () => {
            const mockVersion = {
                id: "version-2",
                workflowId: "workflow-123",
                version: 2,
            };

            mockCreateWorkflowVersion.mockResolvedValue(mockVersion);

            const response = await request(app)
                .post("/api/workflows/workflow-123/versions")
                .send({
                    definition: {
                        steps: [],
                    },
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual(mockVersion);
        });

        it("should return 404 when workflow does not exist", async () => {
            mockCreateWorkflowVersion.mockRejectedValue(
                new AppError("Workflow not found", 404)
            );

            const response = await request(app)
                .post("/api/workflows/invalid-id/versions")
                .send({
                    definition: {
                        steps: [],
                    },
                });

            expect(response.status).toBe(404);
        });
    });
});
