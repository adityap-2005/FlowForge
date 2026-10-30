interface WorkflowDefinition {
    steps: unknown[];
}

const validateHttpConfig = (config: Record<string, unknown>): boolean => {
    if (
        typeof config.url !== "string" ||
        config.url.trim() === ""
    ) {
        return false;
    }

    try {
        new URL(config.url);
    } catch {
        return false;
    }

    const supportedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

    if (
        typeof config.method !== "string" ||
        !supportedMethods.includes(config.method.toUpperCase())
    ) {
        return false;
    }

    return true;
};

const validateEmailConfig = (
    config: Record<string, unknown>
): boolean => {
    if (
        typeof config.to !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.to)
    ) {
        return false;
    }

    if (
        typeof config.subject !== "string" ||
        config.subject.trim() === ""
    ) {
        return false;
    }

    if (
        typeof config.body !== "string" ||
        config.body.trim() === ""
    ) {
        return false;
    }

    return true;
};

const validateCustomConfig = (
    config: Record<string, unknown>
): boolean => {
    if (
        typeof config.action !== "string" ||
        config.action.trim() === ""
    ) {
        return false;
    }

    if (
        config.input !== undefined &&
        (
            config.input === null ||
            typeof config.input !== "object" ||
            Array.isArray(config.input)
        )
    ) {
        return false;
    }

    return true;
};

const validateStep = (step: unknown): boolean => {
    if (
        !step ||
        typeof step !== "object" ||
        Array.isArray(step)
    ) {
        return false;
    }

    const workflowStep = step as Record<string, unknown>;

    if (
        typeof workflowStep.id !== "string" ||
        workflowStep.id.trim() === ""
    ) {
        return false;
    }

    const supportedTypes = ["http", "email", "custom"];

    if (
        typeof workflowStep.type !== "string" ||
        !supportedTypes.includes(workflowStep.type)
    ) {
        return false;
    }

    if (
        !workflowStep.config ||
        typeof workflowStep.config !== "object" ||
        Array.isArray(workflowStep.config)
    ) {
        return false;
    }

    if (workflowStep.type === "http") {
        return validateHttpConfig(
            workflowStep.config as Record<string, unknown>
        );
    }

    if (workflowStep.type === "email") {
        return validateEmailConfig(
            workflowStep.config as Record<string, unknown>
        );
    }

    if (workflowStep.type === "custom") {
        return validateCustomConfig(
            workflowStep.config as Record<string, unknown>
        );
    }

    return true;
};

const validateWorkflowDefinition = (
    definition: unknown
): definition is WorkflowDefinition => {
    if (
        !definition ||
        typeof definition !== "object" ||
        Array.isArray(definition)
    ) {
        return false;
    }

    const workflow = definition as Record<string, unknown>;

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
        return false;
    }

    const steps = workflow.steps;

    if (!steps.every(validateStep)) {
        return false;
    }

    const stepIds = steps.map((step) => {
        return (step as Record<string, unknown>).id;
    });

    if (new Set(stepIds).size !== stepIds.length) {
        return false;
    }

    return true;
};

export default validateWorkflowDefinition;