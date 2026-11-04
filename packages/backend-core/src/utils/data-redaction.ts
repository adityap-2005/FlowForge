
const SENSITIVE_KEYS = [
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "password",
    "secret",
    "token",
    "api-key",
    "apikey",
    "access-key",
    "private-key",
    "client-secret",
];

function isSensitiveKey(key: string): boolean {
    const normalized = key.toLowerCase().replace(/_/g, "-");

    return SENSITIVE_KEYS.some((sensitiveKey) =>
        normalized.includes(sensitiveKey)
    );
}

export function redactSensitiveData(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactSensitiveData);
    }

    if (typeof value !== "object" || value === null) {
        return value;
    }

    const redacted: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
        redacted[key] = isSensitiveKey(key)
            ? "[REDACTED]"
            : redactSensitiveData(item);
    }

    return redacted;
}

export function sanitizeErrorMessage(
    message: string,
    config: Record<string, unknown>
): string {
    const redactedConfig = redactSensitiveData(config);

    const originalSecrets: string[] = [];

    function collectSecrets(
        original: unknown,
        redacted: unknown
    ): void {
        if (
            typeof original !== "object" ||
            original === null ||
            typeof redacted !== "object" ||
            redacted === null
        ) {
            return;
        }

        for (const [key, value] of Object.entries(original)) {
            const safeValue = (redacted as Record<string, unknown>)[key];

            if (safeValue === "[REDACTED]" && typeof value === "string" && value) {
                originalSecrets.push(value);
            } else {
                collectSecrets(value, safeValue);
            }
        }
    }

    collectSecrets(config, redactedConfig);

    let sanitized = message;

    for (const secret of originalSecrets) {
        sanitized = sanitized.split(secret).join("[REDACTED]");
    }

    return sanitized;
}
