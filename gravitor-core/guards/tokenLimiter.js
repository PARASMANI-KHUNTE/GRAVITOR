export const limitContext = (code, maxChars = 8000, maxLines = 300) => {
    if (!code) return "";

    let result = code;

    // 1. Line-based tail cutting
    const lines = result.split('\n');
    if (lines.length > maxLines) {
        result = lines.slice(-maxLines).join('\n');
    }

    // 2. Character-based hard cap (Safety First)
    if (result.length > maxChars) {
        result = result.slice(-maxChars);
    }

    return result;
};
