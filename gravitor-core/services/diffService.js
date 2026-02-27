/**
 * Simple diff parser to handle model outputs in diff format.
 * Format expected:
 * <<<<<< REPLACE
 * old code
 * ======
 * new code
 * >>>>>>
 */
export class DiffService {
    static applyDiff(originalCode, diff) {
        const marker = "<<<<<< REPLACE";
        if (!diff.includes(marker)) return diff; // Return raw if no markers

        const parts = diff.split("<<<<<< REPLACE");
        let result = originalCode;

        for (const part of parts) {
            if (!part.includes("======") || !part.includes(">>>>>>")) continue;

            const [content, rest] = part.split(">>>>>>");
            const [oldCode, newCode] = content.split("======");

            result = result.replace(oldCode.trim(), newCode.trim());
        }

        return result;
    }
}
