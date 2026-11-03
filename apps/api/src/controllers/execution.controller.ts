
import { Request, Response } from "express";
import executionService from "../services/execution.service.js";
import AppError from "../utils/AppError.js";

class ExecutionController {
  async createExecution(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string") {
      throw new AppError("Invalid workflow ID", 400);
    }
    const body = req.body ?? {};

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new AppError("Invalid request body", 400);
    }

    const { input } = body;

    if (
      input !== undefined &&
      (typeof input !== "object" ||
        input === null ||
        Array.isArray(input))
    ) {
      throw new AppError("Input must be an object", 400);
    }

    const execution = await executionService.createExecution({
      workflowId: id,
      input,
    });

    res.status(201).json({
      message: "Workflow execution created successfully",
      data: execution,
    });
  }

  async getExecutionById(req: Request, res: Response) {
    const { id } = req.params;

    if (typeof id !== "string") {
      throw new AppError("Invalid execution ID", 400);
    }

    const execution = await executionService.getExecutionById(id);

    res.status(200).json({
      success: true,
      data: execution,
    });
  }

  async getExecutions(req: Request, res: Response) {
    const { workflowId, status } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    if (!Number.isInteger(page) || page < 1) {
      throw new AppError("Invalid page number", 400);
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError("Limit must be between 1 and 100", 400);
    }

    if (workflowId !== undefined && typeof workflowId !== "string") {
      throw new AppError("Invalid workflow ID", 400);
    }

    const validStatuses = [
      "PENDING",
      "RUNNING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ];

    if (
      status !== undefined &&
      (typeof status !== "string" || !validStatuses.includes(status))
    ) {
      throw new AppError("Invalid execution status", 400);
    }

    const result = await executionService.getExecutions({
      workflowId: workflowId as string | undefined,
      status: status as
        | "PENDING"
        | "RUNNING"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
        | undefined,
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: result.executions,
      pagination: result.pagination,
    });
  }
}

const executionController = new ExecutionController();

export default executionController;
