
import { afterEach, describe, expect, it } from "vitest";
import { resolveSecrets } from "../utils/secret-resolver.js";

describe("resolveSecrets", () => {
    afterEach(() => {
        delete process.env.API_TOKEN;
        delete process.env.DB_PASSWORD;
    });

    it("resolves an environment variable reference", () => {
        process.env.API_TOKEN = "test-token";

        expect(resolveSecrets("{{env.API_TOKEN}}")).toBe("test-token");
    });

    it("resolves references inside larger strings", () => {
        process.env.API_TOKEN = "test-token";

        expect(
            resolveSecrets("Bearer {{env.API_TOKEN}}")
        ).toBe("Bearer test-token");
    });

    it("resolves nested objects", () => {
        process.env.API_TOKEN = "test-token";

        expect(
            resolveSecrets({
                headers: {
                    Authorization: "Bearer {{env.API_TOKEN}}",
                },
            })
        ).toEqual({
            headers: {
                Authorization: "Bearer test-token",
            },
        });
    });

    it("resolves arrays", () => {
        process.env.API_TOKEN = "test-token";

        expect(
            resolveSecrets(["{{env.API_TOKEN}}", "normal"])
        ).toEqual(["test-token", "normal"]);
    });

    it("preserves ordinary values", () => {
        expect(
            resolveSecrets({
                name: "FlowForge",
                enabled: true,
                count: 10,
            })
        ).toEqual({
            name: "FlowForge",
            enabled: true,
            count: 10,
        });
    });

    it("throws when an environment variable is missing", () => {
        expect(() => resolveSecrets("{{env.API_TOKEN}}")).toThrow(
            'Environment variable "API_TOKEN" is missing or empty'
        );
    });

    it("resolves multiple environment variables", () => {
        process.env.API_TOKEN = "token";
        process.env.DB_PASSWORD = "password";

        expect(
            resolveSecrets({
                token: "{{env.API_TOKEN}}",
                password: "{{env.DB_PASSWORD}}",
            })
        ).toEqual({
            token: "token",
            password: "password",
        });
    });
});
