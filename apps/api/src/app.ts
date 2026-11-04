import express from "express";
import dotenv from "dotenv";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/not-found.middleware.js";

import workflowRoutes from "./routes/workflow.routes.js";
import executionRoutes from "./routes/execution.routes.js";

dotenv.config();

const app = express();

let retryTestRequestCount = 0;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "flowforge-api",
    });
});

app.use("/api/workflows", workflowRoutes);
app.use("/api/executions", executionRoutes);

app.get("/test-error", (_req, _res, next) => {
    next(new Error("Test server error"));
});

app.get("/test-retry", (_req, res) => {
    retryTestRequestCount++;

    if (retryTestRequestCount === 1) {
        console.log("Retry test endpoint: returning 503");

        setTimeout(() => {
            res.status(503).json({
                message: "Temporary server failure",
            });
        }, 5000);

        return;
    }

    console.log("Retry test endpoint: returning 200");

    res.status(200).json({
        message: "Request successful",
    });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;