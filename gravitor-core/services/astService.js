/**
 * Lightweight AST-like heuristic service.
 * Instead of a full parser, we use regex and bracket matching
 * to find the current function/block context.
 */
export class AstService {
    /**
     * Extracts the current function or class block surrounding the cursor.
     */
    static extractCurrentBlock(code, cursorIndex) {
        if (!code) return "";

        // 1. Look backwards for common function/class patterns
        const patterns = [
            /function\s+\w+\s*\(.*?\)\s*\{/g,
            /\w+\s*\(.*?\)\s*\{/g, // Anonymous or method
            /class\s+\w+\s*\{/g,
            /const\s+\w+\s*=\s*\(.*?\)\s*=>\s*\{/g
        ];

        let startPos = 0;
        let lastMatch = null;

        // Simple search for the last open brace/declaration before cursor
        const textBefore = code.slice(0, cursorIndex);

        // Find the 'start' of what looks like a block
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(textBefore)) !== null) {
                if (match.index > startPos) {
                    startPos = match.index;
                    lastMatch = match[0];
                }
            }
        }

        if (startPos === 0 && !lastMatch) return "";

        // 2. Return the block from start to the end of the file (model will see the prefix)
        // Or we could try to find the balancing brace, but for 'Prediction Mode', 
        // the model just needs to know it's inside 'function add(a, b) { ...'
        return code.slice(startPos);
    }
}
