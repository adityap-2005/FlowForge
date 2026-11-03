
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet } = vi.hoisted(() => ({
    mockGet: vi.fn(),
}));

vi.mock("../engine/custom-action.registry.js", () => ({
    default: {
        get: mockGet,
    },
}));

import customHandler from "../engine/handlers/custom.handler.js";

describe("CustomHandler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should execute a registered custom action", async () => {
        const mockAction = vi.fn().mockResolvedValue({
            result: "success",
        });

        mockGet.mockReturnValue(mockAction);

        const result = await customHandler.execute({
            action: "sendNotification",
            input: {
                userId: 123,
            },
        });

        expect(result).toEqual({
            result: "success",
        });

        expect(mockGet).toHaveBeenCalledWith("sendNotification");

        expect(mockAction).toHaveBeenCalledWith({
            userId: 123,
        });
    });

    it("should use an empty object when input is omitted", async () => {
        const mockAction = vi.fn().mockResolvedValue("done");

        mockGet.mockReturnValue(mockAction);

        await customHandler.execute({
            action: "sendNotification",
        });

        expect(mockAction).toHaveBeenCalledWith({});
    });

    it("should reject an invalid action name", async () => {
        await expect(
            customHandler.execute({
                action: "",
            })
        ).rejects.toThrow("A valid custom action name is required");

        expect(mockGet).not.toHaveBeenCalled();
    });

    it("should reject invalid action input", async () => {
        await expect(
            customHandler.execute({
                action: "sendNotification",
                input: [1, 2, 3],
            })
        ).rejects.toThrow("Custom action input must be an object");
    });

    it("should propagate custom action failures", async () => {
        const mockAction = vi.fn().mockRejectedValue(
            new Error("Custom action failed")
        );

        mockGet.mockReturnValue(mockAction);

        await expect(
            customHandler.execute({
                action: "sendNotification",
            })
        ).rejects.toThrow("Custom action failed");
    });
});
