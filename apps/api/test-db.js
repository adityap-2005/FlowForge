
import "dotenv/config";
import prisma from "./db.js";

try {
  await prisma.$connect();

  const count = await prisma.workflow.count();

  console.log("Database connected successfully.");
  console.log("Workflow records:", count);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
