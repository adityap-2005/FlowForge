import { Redis } from "ioredis";

const redisConnection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
    console.log("Connected to Redis");
});

redisConnection.on("error", (error: Error) => {
    console.error("Redis connection error:", error);
});

export default redisConnection;
