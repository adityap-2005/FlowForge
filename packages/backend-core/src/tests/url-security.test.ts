import { describe, it, expect, vi, afterEach } from "vitest";
import { validateExternalUrl } from "../utils/url-security.js";
import { lookup } from "node:dns/promises";

vi.mock("node:dns/promises", () => ({
    lookup: vi.fn(),
}));

const mockedLookup = vi.mocked(lookup);

describe("URL Security", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should reject localhost", async () => {
        await expect(
            validateExternalUrl(new URL("http://localhost:3000"))
        ).rejects.toThrow("localhost");
    });

    it("should reject loopback IPv4", async () => {
        await expect(
            validateExternalUrl(new URL("http://127.0.0.1"))
        ).rejects.toThrow();
    });

    it("should reject private IPv4", async () => {
        await expect(
            validateExternalUrl(new URL("http://192.168.1.1"))
        ).rejects.toThrow();
    });

    it("should reject private IPv6", async () => {
        await expect(
            validateExternalUrl(new URL("http://[::1]"))
        ).rejects.toThrow();
    });

    it("should reject reserved IP addresses", async () => {
        await expect(
            validateExternalUrl(new URL("http://169.254.169.254"))
        ).rejects.toThrow();
    });

    it("should accept a public IPv4 address", async () => {
        await expect(
            validateExternalUrl(new URL("http://8.8.8.8"))
        ).resolves.toBeUndefined();
    });

    it("should accept a public hostname", async () => {
        mockedLookup.mockResolvedValue([
            { address: "8.8.8.8", family: 4 },
        ] as never);
    
        await expect(
            validateExternalUrl(new URL("https://example.com"))
        ).resolves.toBeUndefined();
    });

    it("should reject a hostname resolving to a private IP", async () => {
        mockedLookup.mockResolvedValue([
            { address: "192.168.1.10", family: 4 },
        ] as never);
    
        await expect(
            validateExternalUrl(new URL("https://internal.example.com"))
        ).rejects.toThrow();
    });
});
