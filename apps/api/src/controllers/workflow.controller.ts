import type { Request, Response, NextFunction } from "express";
import workflowService from "../services/workflow.service.js";

class WorkflowController {
    async createWorkflow(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { name, description, definition } = req.body;
            if (typeof name !== "string" || !name.trim()) {
                res.status(400).json({
                    error: "Workflow name is required",
                });
                return;
            }

            if (
                definition === null ||
                typeof definition !== "object" ||
                Array.isArray(definition)
            ) {
                res.status(400).json({
                    error: "Workflow definition must be a JSON object",
                });
                return;
            }

            if (description !== undefined && typeof description !== "string") {
                res.status(400).json({
                    error: "Description must be a string",
                });
                return;
            }

            const workflow = await workflowService.createWorkflow({
                name: name.trim(),
                description,
                definition,
            });

            res.status(201).json({
                message: "Workflow created successfully",
                data: workflow,
            });
        } catch (error) {
            next(error);
        }
    }

    async getWorkflows(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const workflows = await workflowService.getWorkflows();

            res.status(200).json({
                data: workflows
            })
        } catch (error) {
            next(error);
        }
    }

    async getWorkflowById(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const id = req.params.id;

            if (typeof id !== "string") {
                res.status(400).json({
                    error: "Invalid workflow ID",
                });
                return;
            }
            
            const workflow = await workflowService.getWorkflowById(id);

            if (!workflow) {
                res.status(404).json({
                    error: "Workflow not found",
                });
                return;
            }

            res.status(200).json({
                data: workflow,
            });
        } catch (error) {
            next(error);
        }
    }

    async createWorkflowVersion(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const workflowId = req.params.id;
            const { definition } = req.body;
    
            if (typeof workflowId !== "string") {
                res.status(400).json({
                    error: "Invalid workflow ID",
                });
                return;
            }
    
            if (
                !definition ||
                typeof definition !== "object" ||
                Array.isArray(definition)
            ) {
                res.status(400).json({
                    error: "Valid workflow definition is required",
                });
                return;
            }
    
            const version = await workflowService.createWorkflowVersion(
                workflowId,
                definition
            );
    
            res.status(201).json({
                message: "Workflow version created successfully",
                data: version,
            });
        } catch (error) {
            next(error);
        }
    }
}

const workflowController = new WorkflowController();

export default workflowController;