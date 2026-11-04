import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import {
    prisma,
    closeWorkflowQueue,
} from "@flowforge/backend-core";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
    console.log(`FlowForge API running on port ${PORT}`);
});

let isShuttingDown = false;

async function shutdown() {
    if (isShuttingDown) return;

    isShuttingDown = true;
    console.log("Shutting down API...");

    try {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        });

        await closeWorkflowQueue();

        await prisma.$disconnect();

        console.log("API shut down successfully");
        process.exit(0);
    } catch (error) {
        console.error("Error during API shutdown:", error);
        process.exit(1);
    }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);