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

        const patterns = [
            /function\s+\w+\s*\(.*?\)\s*\{/g,
            /\w+\s*\(.*?\)\s*\{/g,
            /class\s+\w+\s*\{/g,
            /const\s+\w+\s*=\s*(async\s+)?\(.*?\)\s*=>\s*\{/g,
            /export\s+const\s+\w+\s*=\s*(async\s+)?\(.*?\)\s*=>\s*\{/g
        ];

        let startPos = 0;
        let lastMatch = null;
        const textBefore = code.slice(0, cursorIndex);

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(textBefore)) !== null) {
                if (match.index >= startPos) {
                    startPos = match.index;
                    lastMatch = match[0];
                }
            }
        }

        if (startPos === 0 && !lastMatch) return "";
        return code.slice(startPos);
    }

    /**
     * Extracts all major code blocks (functions, classes) from a file for indexing.
     */
    static extractSymbols(code) {
        const symbols = [];
        const patterns = [
            /async\s+function\s+[\w$]+\s*\(.*?\)\s*\{/g,
            /function\s+[\w$]+\s*\(.*?\)\s*\{/g,
            /class\s+[\w$]+\s*\{/g,
            /const\s+[\w$]+\s*=\s*(async\s+)?\(.*?\)\s*=>\s*\{/g,
            /export\s+const\s+[\w$]+\s*=\s*(async\s+)?\(.*?\)\s*=>\s*\{/g
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const start = match.index;
                // Get the block text starting from this symbol
                const block = this.extractCurrentBlock(code, start + match[0].length);
                if (block) {
                    symbols.push(block);
                }
            }
        }
        return symbols;
    }
}
