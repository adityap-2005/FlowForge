
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@flowforge/backend-core", () => ({
    prisma: {
        stepExecution: {
            findMany: vi.fn(),
        },
    },
    addWorkflowJob: vi.fn(),
}));

import {
    prisma,
    addWorkflowJob,
} from "@flowforge/backend-core";

import { recoverPendingRetries } from "../recovery/retry.recovery.js";

describe("Retry Recovery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should find pending retries and schedule them", async () => {
        const retryAt = new Date(Date.now() - 5000);

        vi.mocked(prisma.stepExecution.findMany).mockResolvedValue([
            {
                executionId: "execution-1",
                nextRetryAt: retryAt,
            },
        ] as any);

        vi.mocked(addWorkflowJob).mockResolvedValue({} as any);

        const result = await recoverPendingRetries();

        expect(prisma.stepExecution.findMany).toHaveBeenCalled();

        expect(addWorkflowJob).toHaveBeenCalledWith(
            "execution-1",
            0,
            retryAt
        );

        expect(result).toEqual({
            found: 1,
            scheduled: 1,
        });
    });

    it("should return zero when no pending retries exist", async () => {
        vi.mocked(prisma.stepExecution.findMany).mockResolvedValue([]);

        const result = await recoverPendingRetries();

        expect(addWorkflowJob).not.toHaveBeenCalled();

        expect(result).toEqual({
            found: 0,
            scheduled: 0,
        });
    });

    it("should continue scheduling when one retry fails", async () => {
        const retryAt = new Date(Date.now() - 5000);

        vi.mocked(prisma.stepExecution.findMany).mockResolvedValue([
            {
                executionId: "execution-1",
                nextRetryAt: retryAt,
            },
            {
                executionId: "execution-2",
                nextRetryAt: retryAt,
            },
        ] as any);

        vi.mocked(addWorkflowJob)
            .mockRejectedValueOnce(new Error("Redis connection failed"))
            .mockResolvedValueOnce({} as any);

        const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const result = await recoverPendingRetries();

        expect(addWorkflowJob).toHaveBeenCalledTimes(2);

        expect(result).toEqual({
            found: 2,
            scheduled: 1,
        });

        consoleSpy.mockRestore();
    });

    it("should skip retries without a retry timestamp", async () => {
        vi.mocked(prisma.stepExecution.findMany).mockResolvedValue([
            {
                executionId: "execution-1",
                nextRetryAt: null,
            },
        ] as any);

        const result = await recoverPendingRetries();

        expect(addWorkflowJob).not.toHaveBeenCalled();

        expect(result).toEqual({
            found: 1,
            scheduled: 0,
        });
    });
});
