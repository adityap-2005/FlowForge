import { describe, it, expect } from "vitest";
import customActionRegistry from "../engine/custom-action.registry.js";

describe("CustomActionRegistry", () => {
    it("should register and retrieve a custom action", async () => {
        const mockAction = async (input: Record<string, unknown>) => ({
            message: "Success",
            userId: input.userId,
        });

        customActionRegistry.register("testAction1", mockAction);

        const registeredAction = customActionRegistry.get("testAction1");

        const result = await registeredAction({
            userId: 123,
        });

        expect(result).toEqual({
            message: "Success",
            userId: 123,
        });
    });

    it("should reject duplicate action registration", () => {
        const mockAction = async () => "success";

        customActionRegistry.register("testAction2", mockAction);

        expect(() => {
            customActionRegistry.register("testAction2", mockAction);
        }).toThrow('Action "testAction2" is already registered');
    });

    it("should reject an unregistered action", () => {
        expect(() => {
            customActionRegistry.get("unknownAction");
        }).toThrow('Action "unknownAction" is not registered');
    });
});
