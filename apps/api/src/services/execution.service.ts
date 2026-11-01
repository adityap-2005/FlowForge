
import { prisma } from "@flowforge/backend-core";
import { Prisma } from "../generated/prisma/client.js";
import AppError from "../utils/AppError.js";
import { addWorkflowJob } from "../queues/workflow.queue.js";

interface CreateExecutionInput {
  workflowId: string;
  input?: Record<string, unknown>;
}

interface WorkflowStep {
  id: string;
  type: string;
}

interface WorkflowDefinition {
  steps: WorkflowStep[];
}


class ExecutionService {
  async createExecution({ workflowId, input }: CreateExecutionInput) {
    const execution = await prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.findUnique({
        where: { id: workflowId },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      if (!workflow) {
        throw new AppError("Workflow not found", 404);
      }

      const latestVersion = workflow.versions[0];

      if (!latestVersion) {
        throw new AppError("Workflow has no versions", 400);
      }

      const definition =
        latestVersion.definition as unknown as WorkflowDefinition;

      return tx.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: latestVersion.id,
          input: input as Prisma.InputJsonValue | undefined,
          steps: {
            create: definition.steps.map((step) => ({
              stepId: step.id,
              stepType: step.type,
              status: "PENDING",
            })),
          },
        },
        include: {
          steps: true,
        },
      });
    });

    await addWorkflowJob(execution.id);

    return execution;
  }
}


const executionService = new ExecutionService();

export default executionService;
