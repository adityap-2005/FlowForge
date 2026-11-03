import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("GET /health", () => {
    it("should return API health status", async () => {
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: "ok",
            service: "flowforge-api",
        });
    });
});