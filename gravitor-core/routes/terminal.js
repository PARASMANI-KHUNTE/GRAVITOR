import express from "express";
import { SandboxService } from "../services/sandboxService.js";

const router = express.Router();

router.post("/execute", async (req, res) => {
    const { command, cwd } = req.body;

    if (!command) {
        return res.status(400).json({ error: "Command required" });
    }

    // In a real production IDE, the 'confirmation' happens on the UX side.
    // The backend just enforces policy.
    if (!SandboxService.isSafe(command)) {
        return res.status(403).json({
            error: "Command not allowed in sandbox",
            suggestion: "Only npm test, git status, and basic info commands are pre-approved."
        });
    }

    console.log(`[Sandbox] Executing: ${command}`);
    const result = await SandboxService.execute(command, cwd || ".");
    res.json(result);
});

export default router;
