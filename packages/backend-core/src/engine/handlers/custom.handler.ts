import type { StepHandler } from "../step-handler.js";
import customActionRegistry from "../custom-action.registry.js";
import StepExecutionError from "../../errors/step-execution.error.js";

class CustomHandler implements StepHandler {
  async execute(config: Record<string, unknown>): Promise<unknown> {

    if (
      typeof config.action !== "string" ||
      !config.action.trim()
    ) {
      throw new StepExecutionError(
        "A valid custom action name is required",
        false
      );
    }

    let input: Record<string, unknown> = {};

    if (config.input !== undefined) {
      if (
        typeof config.input !== "object" ||
        config.input === null ||
        Array.isArray(config.input)
      ) {
        throw new StepExecutionError(
          "Custom action input must be an object",
          false
        );
      }

      input = config.input as Record<string, unknown>;
    }

    const action = customActionRegistry.get(config.action);

    return await action(input);
  }
}

const customHandler = new CustomHandler();

export default customHandler;
