import type { StepHandler } from "../step-handler.js";

class HttpHandler implements StepHandler {
  async execute(config: Record<string, unknown>): Promise<unknown> {

    if (typeof config.url !== "string" || !config.url.trim()) {
      throw new Error("HTTP handler requires a valid URL");
    }

    const url = new URL(config.url);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported");
    }

    const method =
      typeof config.method === "string"
        ? config.method.toUpperCase()
        : "";

    const supportedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

    if (!supportedMethods.includes(method)) {
      throw new Error("Unsupported HTTP method");
    }

    const headers: Record<string, string> = {};

    if (config.headers !== undefined) {
      if (
        typeof config.headers !== "object" ||
        config.headers === null ||
        Array.isArray(config.headers)
      ) {
        throw new Error("Headers must be an object");
      }

      for (const [key, value] of Object.entries(config.headers)) {
        if (typeof value !== "string") {
          throw new Error("Header values must be strings");
        }

        headers[key] = value;
      }
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (config.body !== undefined) {
      if (method === "GET" || method === "DELETE") {
        throw new Error(`${method} requests cannot have a body`);
      }

      headers["Content-Type"] ??= "application/json";
      options.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, options);

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
      throw new Error(
        `HTTP request failed with status ${response.status}: ${responseText}`
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
