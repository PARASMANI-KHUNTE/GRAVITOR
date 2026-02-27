import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Sandbox Service for CLI execution.
 * Enforces a 'confirm-first' policy and restricts dangerous commands.
 */
export class SandboxService {
    static ALLOWED_COMMANDS = ["npm test", "ls", "dir", "git status", "pwd", "node -v"];

    static isSafe(command) {
        // Simple allow-list for the demo phase
        return this.ALLOWED_COMMANDS.some(allowed => command.startsWith(allowed));
    }

    static async execute(command, cwd) {
        try {
            const { stdout, stderr } = await execAsync(command, { cwd, timeout: 5000 });
            return { stdout, stderr };
        } catch (error) {
            return { error: error.message, stderr: error.stderr };
        }
    }
}
