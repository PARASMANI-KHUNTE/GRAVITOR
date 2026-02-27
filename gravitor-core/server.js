import express from "express";
import cors from "cors";
import generateRoute from "./routes/generate.js";
import indexRoute from "./routes/index.js";
import terminalRoute from "./routes/terminal.js";
import { validateGenerateReq } from "./guards/inputValidator.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/generate", validateGenerateReq, generateRoute);
app.use("/index", indexRoute);
app.use("/terminal", terminalRoute);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`🚀 Gravitor Orchestrator running on http://localhost:${PORT}`);
});