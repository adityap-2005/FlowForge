const ENV_REFERENCE_REGEX = /\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function resolveSecrets(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(resolveSecrets);
    }

    if (typeof value === "object" && value !== null) {
        const resolved: Record<string, unknown> = {};

        for (const [key, item] of Object.entries(value)) {
            resolved[key] = resolveSecrets(item);
        }

        return resolved;
    }

    if (typeof value === "string") {
        return value.replace(ENV_REFERENCE_REGEX, (_, variableName: string) => {
            const secret = process.env[variableName];

            if (secret === undefined || secret.length === 0) {
                throw new Error(
                    `Environment variable "${variableName}" is missing or empty`
                );
            }

            return secret;
        });
    }

    return value;
}
