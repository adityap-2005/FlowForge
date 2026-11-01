export interface StepHandler {
  execute(config: Record<string, unknown>): Promise<unknown>;
}
