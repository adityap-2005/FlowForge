
import { describe, it, expect, vi, afterEach } from "vitest";
import httpHandler from "../engine/handlers/http.handler.js";
import StepExecutionError from "../errors/step-execution.error.js";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("HttpHandler", () => {

    it("should classify HTTP 400 as a permanent error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("Bad Request", { status: 400 })
            )
        );

        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
            })
        ).rejects.toMatchObject({
            retryable: false,
        });
    });

    it("should classify invalid URLs as permanent errors", async () => {
        await expect(
            httpHandler.execute({
                url: "invalid-url",
                method: "GET",
            })
        ).rejects.toBeInstanceOf(StepExecutionError);
    });

    it("should classify unsupported HTTP methods as permanent errors", async () => {
        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "INVALID",
            })
        ).rejects.toMatchObject({
            retryable: false,
        });
    });

    it("should classify HTTP 429 as a retryable error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("Too Many Requests", { status: 429 })
            )
        );

        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
            })
        ).rejects.toMatchObject({
            retryable: true,
        });
    });

    it("should classify HTTP 500 as a retryable error", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("Internal Server Error", { status: 500 })
            )
        );

        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
            })
        ).rejects.toMatchObject({
            retryable: true,
        });
    });

    it("should classify network failures as retryable errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new Error("Connection refused"))
        );

        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
            })
        ).rejects.toMatchObject({
            retryable: true,
        });
    });

    it("should classify request timeouts as retryable errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((_url: URL, options: RequestInit) => {
                return new Promise((_resolve, reject) => {
                    options.signal?.addEventListener(
                        "abort",
                        () => reject(options.signal?.reason),
                        { once: true }
                    );
                });
            })
        );

        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
                timeoutMs: 10,
            })
        ).rejects.toMatchObject({
            retryable: true,
            message: "HTTP request timed out after 10ms",
        });
    });

    it("should reject invalid timeout configuration", async () => {
        await expect(
            httpHandler.execute({
                url: "https://example.com",
                method: "GET",
                timeoutMs: -100,
            })
        ).rejects.toMatchObject({
            retryable: false,
            message: "Timeout must be an integer between 1 and 120000 milliseconds",
        });
    });

});