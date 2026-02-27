export const buildInlinePrompt = (codeBeforeCursor, language, contextChunks = []) => {
    const contextSection = contextChunks.length > 0
        ? `\nRelevant Project Context:\n${contextChunks.map(c => `<file: ${c.filename}>\n${c.text}\n<end file>`).join('\n')}\n`
        : "";

    return `System:
You are a professional ${language} developer.
Mode: Inline Completion.
${contextSection}
Rules:
- Predict the next valid tokens.
- Do not repeat existing code.
- Do not explain.
- Do not use markdown.
- Do not include comments unless necessary.
- Stop naturally when completion feels complete.

Code Before Cursor:
${codeBeforeCursor}`;
};
