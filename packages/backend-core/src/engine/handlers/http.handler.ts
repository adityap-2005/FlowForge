import type { StepHandler } from "../step-handler.js";
import StepExecutionError from "../../errors/step-execution.error.js";
import { validateExternalUrl } from "../../utils/url-security.js";

class HttpHandler implements StepHandler {
  async execute(config: Record<string, unknown>): Promise<unknown> {

    if (typeof config.url !== "string" || !config.url.trim()) {
      throw new StepExecutionError(
        "HTTP handler requires a valid URL",
        false
      );
    }

    let url: URL;

    try {
      url = new URL(config.url);
    } catch {
      throw new StepExecutionError("Invalid URL", false);
    }

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new StepExecutionError(
        "Only HTTP and HTTPS URLs are supported",
        false
      );
    }

    try {
      await validateExternalUrl(url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Destination URL validation failed";

      throw new StepExecutionError(message, false);
    }

    const method =
      typeof config.method === "string"
        ? config.method.toUpperCase()
        : "";

    const supportedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

    if (!supportedMethods.includes(method)) {
      throw new StepExecutionError("Unsupported HTTP method", false);
    }

    const timeoutMs =
      config.timeoutMs === undefined ? 10000 : config.timeoutMs;

    if (
      typeof timeoutMs !== "number" ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs <= 0 ||
      timeoutMs > 120000
    ) {
      throw new StepExecutionError(
        "Timeout must be an integer between 1 and 120000 milliseconds",
        false
      );
    }

    const headers: Record<string, string> = {};

    if (config.headers !== undefined) {
      if (
        typeof config.headers !== "object" ||
        config.headers === null ||
        Array.isArray(config.headers)
      ) {
        throw new StepExecutionError(
          "Headers must be an object",
          false
        );
      }

      for (const [key, value] of Object.entries(config.headers)) {
        if (typeof value !== "string") {
          throw new StepExecutionError(
            "Header values must be strings",
            false
          );
        }

        headers[key] = value;
      }
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "manual",
    };

    if (config.body !== undefined) {
      if (method === "GET" || method === "DELETE") {
        throw new StepExecutionError(
          `${method} requests cannot have a body`,
          false
        );
      }

      headers["Content-Type"] ??= "application/json";
      options.body = JSON.stringify(config.body);
    }

    let response: Response;

    try {
      response = await fetch(url, options);
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new StepExecutionError(
          `HTTP request timed out after ${timeoutMs}ms`,
          true
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "Network request failed";

      throw new StepExecutionError(
        `HTTP network error: ${message}`,
        true
      );
    }

    if (response.status >= 300 && response.status < 400) {
      throw new StepExecutionError(
        "HTTP redirects are not supported",
        false
      );
    }

    const responseText = await response.text();

    let data: unknown = null;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
    }

    if (!response.ok) {
      const retryable =
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500;

      throw new StepExecutionError(
        `HTTP request failed with status ${response.status}: ${responseText}`,
        retryable
      );
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data,
    };
  }
}

const httpHandler = new HttpHandler();

export default httpHandler;
