import { Router } from "express";
import workflowController from "../controllers/workflow.controller.js";

const router = Router();

router.post("/", workflowController.createWorkflow);
router.get("/", workflowController.getWorkflows);
router.get("/:id", workflowController.getWorkflowById);
router.post("/:id/versions", workflowController.createWorkflowVersion);

export default router;