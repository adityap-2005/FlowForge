
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
}

const executionController = new ExecutionController();

export default executionController;
