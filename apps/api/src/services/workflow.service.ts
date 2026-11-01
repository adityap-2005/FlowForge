import { prisma } from "@flowforge/backend-core";
import { Prisma } from "../generated/prisma/client.js";

import AppError from "../utils/AppError.js";
import validateWorkflowDefinition from "../validators/workflow.validator.js";

interface CreateWorkflowInput {
    name: string,
    description?: string,
    definition: Record<string, unknown>
}

class WorkflowService {

    async createWorkflow(input: CreateWorkflowInput) {
        if (!validateWorkflowDefinition(input.definition)) {
            throw new AppError("Invalid workflow definition", 400);
        }

        return prisma.workflow.create({
            data: {
                name: input.name,
                description: input.description,
                versions: {
                    create: {
                        version: 1,
                        definition: input.definition as Prisma.InputJsonValue,
                    },
                },
            },
            include: {
                versions: true,
            },
        });
    }

    async getWorkflows() {
        return prisma.workflow.findMany();
    }

    async getWorkflowById(id: string) {
        return prisma.workflow.findUnique({
            where: { id },
            include: {
                versions: {
                    orderBy: {
                        version: "desc",
                    },
                },
            },
        });
    }

    async createWorkflowVersion(
        workflowId: string,
        definition: Record<string, unknown>
    ) {
        if (!validateWorkflowDefinition(definition)) {
            throw new AppError("Invalid workflow definition", 400);
        }
        
        const workflow = await prisma.workflow.findUnique({
            where: {
                id: workflowId
            }
        });

        if (!workflow) {
            throw new AppError("Workflow not found", 404);
        }

        const latestVersion = await prisma.workflowVersion.findFirst({
            where: {
                workflowId,
            },
            orderBy: {
                version: "desc",
            },
        });

        const nextVersion = (latestVersion?.version ?? 0) + 1;

        const newVersion = await prisma.workflowVersion.create({
            data: {
                workflowId,
                version: nextVersion,
                definition: definition as Prisma.InputJsonValue,
            },
        });

        return newVersion;
    }
}

const workflowService = new WorkflowService();

export default workflowService;