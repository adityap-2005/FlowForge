import nodemailer from "nodemailer";
import type { StepHandler } from "../step-handler.js";

class EmailHandler implements StepHandler {
  async execute(config: Record<string, unknown>): Promise<unknown> {

    if (
      typeof config.to !== "string" ||
      !config.to.trim()
    ) {
      throw new Error("A valid recipient email is required");
    }

    if (
      typeof config.subject !== "string" ||
      !config.subject.trim()
    ) {
      throw new Error("Email subject is required");
    }

    if (
      typeof config.body !== "string" ||
      !config.body.trim()
    ) {
      throw new Error("Email body is required");
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
      throw new Error("SMTP configuration is incomplete");
    }

    const port = Number(SMTP_PORT || 587);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("Invalid SMTP port");
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
  }
}

const emailHandler = new EmailHandler();

export default emailHandler;
