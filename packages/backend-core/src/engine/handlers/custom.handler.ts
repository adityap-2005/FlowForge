import type { StepHandler } from "../step-handler.js";
import customActionRegistry from "../custom-action.registry.js";

class CustomHandler implements StepHandler {
  async execute(config: Record<string, unknown>): Promise<unknown> {

    if (
      typeof config.action !== "string" ||
      !config.action.trim()
    ) {
      throw new Error("A valid custom action name is required");
    }

    let input: Record<string, unknown> = {};

    if (config.input !== undefined) {
      if (
        typeof config.input !== "object" ||
        config.input === null ||
        Array.isArray(config.input)
      ) {
        throw new Error("Custom action input must be an object");
      }

      input = config.input as Record<string, unknown>;
    }

    const action = customActionRegistry.get(config.action);

    return await action(input);
  }
}

const customHandler = new CustomHandler();

export default customHandler;
