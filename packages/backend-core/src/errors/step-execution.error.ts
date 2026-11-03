
class StepExecutionError extends Error {
    retryable: boolean;

    constructor(message: string, retryable: boolean) {
        super(message);

        this.name = "StepExecutionError";
        this.retryable = retryable;
    }
}

export default StepExecutionError;
