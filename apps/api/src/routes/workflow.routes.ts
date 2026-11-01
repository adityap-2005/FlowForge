import { Router } from "express";
import workflowController from "../controllers/workflow.controller.js";
import executionController from "../controllers/execution.controller.js";

const router = Router();

router.post("/", workflowController.createWorkflow);
router.get("/", workflowController.getWorkflows);
router.get("/:id", workflowController.getWorkflowById);
router.post("/:id/versions", workflowController.createWorkflowVersion);

router.post("/:id/execute", executionController.createExecution);

export default router;