
import type { StepHandler } from "./step-handler.js";
import httpHandler from "./handlers/http.handler.js";
import emailHandler from "./handlers/email.handler.js";
import customHandler from "./handlers/custom.handler.js";

class HandlerRegistry {
  private handlers = new Map<string, StepHandler>();

  constructor() {
    this.register("http", httpHandler);
    this.register("email", emailHandler);
    this.register("custom", customHandler);
  }

  register(type: string, handler: StepHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler for "${type}" is already registered`);
    }

    this.handlers.set(type, handler);
  }

  get(type: string): StepHandler {
    const handler = this.handlers.get(type);

    if (!handler) {
      throw new Error(`No handler registered for type "${type}"`);
    }

    return handler;
  }
}

const handlerRegistry = new HandlerRegistry();

export default handlerRegistry;
