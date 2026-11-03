
import { prisma } from "@flowforge/backend-core";
import { Prisma } from "../generated/prisma/client.js";
import AppError from "../utils/AppError.js";
import { addWorkflowJob } from "@flowforge/backend-core";
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

interface GetExecutionsInput {
  workflowId?: string;
  status?: Prisma.WorkflowExecutionWhereInput["status"];
  page: number;
  limit: number;
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

  async getExecutionById(executionId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: {
        id: executionId,
      },
      include: {
        steps: true,
      },
    });

    if (!execution) {
      throw new AppError("Execution not found", 404);
    }

    return execution;
  }

  async getExecutions({
    workflowId,
    status,
    page,
    limit,
  }: GetExecutionsInput) {
    const where: Prisma.WorkflowExecutionWhereInput = {};

    if (workflowId) {
      where.workflowId = workflowId;
    }

    if (status) {
      where.status = status;
    }

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              steps: true,
            },
          },
        },
      }),

      prisma.workflowExecution.count({ where }),
    ]);

    return {
      executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}


const executionService = new ExecutionService();

export default executionService;
