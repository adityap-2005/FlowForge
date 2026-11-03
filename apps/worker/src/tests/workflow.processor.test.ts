import { describe, it, expect, vi } from "vitest";
import { createWorkflowProcessor } from "../processors/workflow.processor.js";

describe("Workflow Processor", () => {
  it("should execute a workflow successfully", async () => {
    const executeWorkflow = vi.fn().mockResolvedValue(null);
    const addWorkflowJob = vi.fn();

    const processor = createWorkflowProcessor({
      executeWorkflow,
      addWorkflowJob,
    });

    await processor({
      name: "execute-workflow",
      data: { executionId: "execution-1" },
    });

    expect(executeWorkflow).toHaveBeenCalledWith("execution-1");
    expect(addWorkflowJob).not.toHaveBeenCalled();
  });

  it("should schedule a retry when execution returns a delay", async () => {
    const executeWorkflow = vi.fn().mockResolvedValue(5000);
    const addWorkflowJob = vi.fn().mockResolvedValue(undefined);

    const processor = createWorkflowProcessor({
      executeWorkflow,
      addWorkflowJob,
    });

    await processor({
      name: "execute-workflow",
      data: { executionId: "execution-1" },
    });

    expect(addWorkflowJob).toHaveBeenCalledWith("execution-1", 5000);
  });

  it("should reject unsupported job types", async () => {
    const executeWorkflow = vi.fn();
    const addWorkflowJob = vi.fn();

    const processor = createWorkflowProcessor({
      executeWorkflow,
      addWorkflowJob,
    });

    await expect(
      processor({
        name: "unknown-job",
        data: { executionId: "execution-1" },
      })
    ).rejects.toThrow("Unsupported job type: unknown-job");

    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it("should propagate retry scheduling failures", async () => {
    const executeWorkflow = vi.fn().mockResolvedValue(5000);
    const addWorkflowJob = vi.fn().mockRejectedValue(
      new Error("Redis connection failed")
    );

    const processor = createWorkflowProcessor({
      executeWorkflow,
      addWorkflowJob,
    });

    await expect(
      processor({
        name: "execute-workflow",
        data: { executionId: "execution-1" },
      })
    ).rejects.toThrow("Redis connection failed");
  });
});