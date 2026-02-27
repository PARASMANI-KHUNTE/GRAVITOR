export const validateGenerateReq = (req, res, next) => {
    const { codeBeforeCursor, language } = req.body;

    if (!codeBeforeCursor || typeof codeBeforeCursor !== 'string') {
        return res.status(400).json({ error: "codeBeforeCursor is required and must be a string" });
    }

    if (!language || typeof language !== 'string') {
        return res.status(400).json({ error: "language is required" });
    }

    next();
};
