
export type CustomAction = (
  input: Record<string, unknown>
) => Promise<unknown>;

class CustomActionRegistry {
  private actions = new Map<string, CustomAction>();

  register(name: string, action: CustomAction): void {
    if (this.actions.has(name)) {
      throw new Error(`Action "${name}" is already registered`);
    }

    this.actions.set(name, action);
  }

  get(name: string): CustomAction {
    const action = this.actions.get(name);

    if (!action) {
      throw new Error(`Action "${name}" is not registered`);
    }

    return action;
  }
}

const customActionRegistry = new CustomActionRegistry();

export default customActionRegistry;
