import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerClaudeCodePlugin } from "./register.runtime.js";

export default definePluginEntry({
  id: "claude-code",
  name: "Claude Code",
  description:
    "Routes all OpenClaw inference through your local Claude Code / Cowork install. " +
    "No API key required. No direct Anthropic calls — your existing subscription handles everything.",
  register(api) {
    return registerClaudeCodePlugin(api);
  },
});
