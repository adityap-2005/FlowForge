
import nodemailer from "nodemailer";
import type { StepHandler } from "../step-handler.js";
import StepExecutionError from "../../errors/step-execution.error.js";

class EmailHandler implements StepHandler {
    async execute(config: Record<string, unknown>): Promise<unknown> {

        if (
            typeof config.to !== "string" ||
            !config.to.trim()
        ) {
            throw new StepExecutionError(
                "A valid recipient email is required",
                false
            );
        }

        if (
            typeof config.subject !== "string" ||
            !config.subject.trim()
        ) {
            throw new StepExecutionError(
                "Email subject is required",
                false
            );
        }

        if (
            typeof config.body !== "string" ||
            !config.body.trim()
        ) {
            throw new StepExecutionError(
                "Email body is required",
                false
            );
        }

        const {
            SMTP_HOST,
            SMTP_PORT,
            SMTP_USER,
            SMTP_PASS,
            SMTP_FROM,
            SMTP_SECURE,
        } = process.env;

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
            throw new StepExecutionError(
                "SMTP configuration is incomplete",
                false
            );
        }

        const port = Number(SMTP_PORT || 587);

        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
            throw new StepExecutionError(
                "Invalid SMTP port",
                false
            );
        }

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port,
            secure: SMTP_SECURE === "true",
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        try {
            const result = await transporter.sendMail({
                from: SMTP_FROM,
                to: config.to,
                subject: config.subject,
                text: config.body,
            });

            return {
                messageId: result.messageId,
                accepted: result.accepted,
                rejected: result.rejected,
                response: result.response,
            };
        } catch (error) {
            const smtpError = error as {
                code?: string;
                responseCode?: number;
                message?: string;
            };

            const permanentCodes = [
                "EAUTH",
                "EENVELOPE",
                "EMESSAGE",
            ];

            const responseCode = smtpError.responseCode;

            const retryable =
                !permanentCodes.includes(smtpError.code ?? "") &&
                (
                    responseCode === undefined ||
                    responseCode === 421 ||
                    responseCode === 450 ||
                    responseCode === 451 ||
                    responseCode === 452 ||
                    responseCode >= 500
                );

            throw new StepExecutionError(
                `Email delivery failed: ${smtpError.message ?? "Unknown SMTP error"}`,
                retryable
            );
        }
    }
}

const emailHandler = new EmailHandler();

export default emailHandler;
