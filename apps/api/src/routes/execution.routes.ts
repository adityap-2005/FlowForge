import { Router } from "express";
import executionController from "../controllers/execution.controller.js";

const router = Router();

router.get("/", executionController.getExecutions);
router.get("/:id", executionController.getExecutionById);

export default router;