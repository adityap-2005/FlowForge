import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import AppError from "../utils/AppError.js";

const {
    mockGetExecutionById,
    mockGetExecutions,
    mockCreateExecution,
} = vi.hoisted(() => ({
    mockGetExecutionById: vi.fn(),
    mockGetExecutions: vi.fn(),
    mockCreateExecution: vi.fn(),
}));

vi.mock("@flowforge/backend-core", () => ({
    prisma: {},
    addWorkflowJob: vi.fn(),
}));

vi.mock("../services/execution.service.js", () => ({
    default: {
        createExecution: mockCreateExecution,
        getExecutionById: mockGetExecutionById,
        getExecutions: mockGetExecutions,
    },
}));

import app from "../app.js";

describe("Execution API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/executions/:id", () => {
        it("should return an execution by ID", async () => {
            const mockExecution = {
                id: "execution-123",
                status: "COMPLETED",
                steps: [],
            };

            mockGetExecutionById.mockResolvedValue(mockExecution);

            const response = await request(app)
                .get("/api/executions/execution-123");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockExecution);
            expect(mockGetExecutionById).toHaveBeenCalledWith(
                "execution-123"
            );
        });

        it("should return 404 when execution does not exist", async () => {
            mockGetExecutionById.mockRejectedValue(
                new AppError("Execution not found", 404)
            );

            const response = await request(app)
                .get("/api/executions/invalid-id");

            expect(response.status).toBe(404);
            expect(response.body.message).toBe("Execution not found");
        });
    });

    describe("GET /api/executions", () => {
        it("should return executions with pagination", async () => {
            const mockResult = {
                executions: [
                    {
                        id: "execution-123",
                        status: "COMPLETED",
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            };

            mockGetExecutions.mockResolvedValue(mockResult);

            const response = await request(app)
                .get("/api/executions?page=1&limit=10");

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockResult.executions);
            expect(response.body.pagination).toEqual(
                mockResult.pagination
            );
        });

        it("should reject an invalid page number", async () => {
            const response = await request(app)
                .get("/api/executions?page=-1");

            expect(response.status).toBe(400);
        });

        it("should reject an invalid execution status", async () => {
            const response = await request(app)
                .get("/api/executions?status=INVALID");

            expect(response.status).toBe(400);
        });
    });

    describe("POST /api/workflows/:id/execute", () => {
        it("should create a workflow execution", async () => {
            const mockExecution = {
                id: "execution-123",
                workflowId: "workflow-123",
                status: "PENDING",
                steps: [],
            };

            mockCreateExecution.mockResolvedValue(mockExecution);

            const response = await request(app)
                .post("/api/workflows/workflow-123/execute")
                .send({
                    input: {
                        userId: 101,
                    },
                });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual(mockExecution);

            expect(mockCreateExecution).toHaveBeenCalledWith({
                workflowId: "workflow-123",
                input: {
                    userId: 101,
                },
            });
        });

        it("should return 404 when workflow does not exist", async () => {
            mockCreateExecution.mockRejectedValue(
                new AppError("Workflow not found", 404)
            );

            const response = await request(app)
                .post("/api/workflows/invalid-id/execute");

            expect(response.status).toBe(404);
        });

        it("should reject an invalid request body", async () => {
            const response = await request(app)
                .post("/api/workflows/workflow-123/execute")
                .send({
                    input: "invalid",
                });

            expect(response.status).toBe(400);
            expect(mockCreateExecution).not.toHaveBeenCalled();
        });

        it("should reject an array as input", async () => {
            const response = await request(app)
                .post("/api/workflows/workflow-123/execute")
                .send({
                    input: [1, 2, 3],
                });

            expect(response.status).toBe(400);
        });
    });
});
