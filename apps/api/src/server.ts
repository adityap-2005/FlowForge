import express from "express";
import dotenv from "dotenv";
import errorHandler from "./middlewares/error.middleware.js";
import notFoundHandler from "./middlewares/not-found.middleware.js";

import workflowRoutes from "../src/routes/workflow.routes.js"

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "flowforge-api",
  });
});

app.use("/api/workflows", workflowRoutes);

app.get("/test-error", (_req, _res, next) => {
  next(new Error("Test server error"));
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`FlowForge API running on port ${PORT}`);
});