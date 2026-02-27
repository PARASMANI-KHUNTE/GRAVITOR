export const MODEL_CONFIG = {
    model: "deepseek-coder:6.7b",
    options: {
        num_predict: 128,
        temperature: 0.2,
        top_p: 0.95,
        stop: ["\n\n\n", "```", "System:", "User:"] // Stop tokens for stability
    }
};
