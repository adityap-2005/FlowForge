
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from "vitest";

const { mockSendMail, mockCreateTransport } = vi.hoisted(() => ({
    mockSendMail: vi.fn(),
    mockCreateTransport: vi.fn(),
}));

vi.mock("nodemailer", () => ({
    default: {
        createTransport: mockCreateTransport,
    },
}));

import emailHandler from "../engine/handlers/email.handler.js";

describe("EmailHandler", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.stubEnv("SMTP_HOST", "smtp.example.com");
        vi.stubEnv("SMTP_PORT", "587");
        vi.stubEnv("SMTP_USER", "test@example.com");
        vi.stubEnv("SMTP_PASS", "test-password");
        vi.stubEnv("SMTP_FROM", "noreply@example.com");
        vi.stubEnv("SMTP_SECURE", "false");

        mockCreateTransport.mockReturnValue({
            sendMail: mockSendMail,
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });


    it("should send an email successfully", async () => {
        const mockResult = {
            messageId: "message-123",
            accepted: ["user@example.com"],
            rejected: [],
            response: "250 Message accepted",
        };

        mockSendMail.mockResolvedValue(mockResult);

        const result = await emailHandler.execute({
            to: "user@example.com",
            subject: "Welcome",
            body: "Welcome to FlowForge",
        });

        expect(result).toEqual(mockResult);

        expect(mockCreateTransport).toHaveBeenCalledWith({
            host: "smtp.example.com",
            port: 587,
            secure: false,
            auth: {
                user: "test@example.com",
                pass: "test-password",
            },
        });

        expect(mockSendMail).toHaveBeenCalledWith({
            from: "noreply@example.com",
            to: "user@example.com",
            subject: "Welcome",
            text: "Welcome to FlowForge",
        });
    });

    it("should reject a missing recipient", async () => {
        await expect(
            emailHandler.execute({
                subject: "Welcome",
                body: "Hello",
            })
        ).rejects.toThrow("A valid recipient email is required");
    
        expect(mockCreateTransport).not.toHaveBeenCalled();
    });
    
    it("should reject a missing subject", async () => {
        await expect(
            emailHandler.execute({
                to: "user@example.com",
                body: "Hello",
            })
        ).rejects.toThrow("Email subject is required");
    });
    
    it("should reject a missing email body", async () => {
        await expect(
            emailHandler.execute({
                to: "user@example.com",
                subject: "Welcome",
            })
        ).rejects.toThrow("Email body is required");
    });

    it("should reject incomplete SMTP configuration", async () => {
        vi.stubEnv("SMTP_HOST", "");
    
        await expect(
            emailHandler.execute({
                to: "user@example.com",
                subject: "Welcome",
                body: "Hello",
            })
        ).rejects.toThrow("SMTP configuration is incomplete");
    
        expect(mockCreateTransport).not.toHaveBeenCalled();
    });
    
    it("should reject an invalid SMTP port", async () => {
        vi.stubEnv("SMTP_PORT", "70000");
    
        await expect(
            emailHandler.execute({
                to: "user@example.com",
                subject: "Welcome",
                body: "Hello",
            })
        ).rejects.toThrow("Invalid SMTP port");
    
        expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("should propagate SMTP delivery errors", async () => {
        mockSendMail.mockRejectedValue(
            new Error("SMTP connection failed")
        );
    
        await expect(
            emailHandler.execute({
                to: "user@example.com",
                subject: "Welcome",
                body: "Hello",
            })
        ).rejects.toThrow("SMTP connection failed");
    });

});
