import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";
import {
  CLI_FRESH_WATCHDOG_DEFAULTS,
  CLI_RESUME_WATCHDOG_DEFAULTS,
} from "openclaw/plugin-sdk/cli-backend";

import {
  CLAUDE_CODE_BACKEND_ID,
  CLAUDE_CODE_CLEAR_ENV,
  CLAUDE_CODE_DEFAULT_MODEL_REF,
  CLAUDE_CODE_MODEL_ALIASES,
  CLAUDE_CODE_SESSION_ID_FIELDS,
  normalizeClaudeCodeBackendConfig,
} from "./cli-shared.js";

/**
 * Registers the claude-code CLI backend with OpenClaw.
 *
 * ALL inference goes through the local `claude` subprocess — this plugin
 * never opens a direct HTTP connection to Anthropic's API. Auth is handled
 * entirely by the claude binary using its own persisted login state.
 */
export function buildClaudeCodeCliBackend(): CliBackendPlugin {
  return {
    id: CLAUDE_CODE_BACKEND_ID,
    liveTest: {
      defaultModelRef: CLAUDE_CODE_DEFAULT_MODEL_REF,
      defaultImageProbe: false,
      defaultMcpProbe: true,
      docker: {
        npmPackage: "@anthropic-ai/claude-code",
        binaryName: "claude",
      },
    },
    bundleMcp: true,
    bundleMcpMode: "claude-config-file",
    config: {
      command: "claude",
      args: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--permission-mode",
        "bypassPermissions",
      ],
      resumeArgs: [
        "-p",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--verbose",
        "--setting-sources",
        "user",
        "--permission-mode",
        "bypassPermissions",
        "--resume",
        "{sessionId}",
      ],
      output: "jsonl",
      input: "stdin",
      modelArg: "--model",
      modelAliases: CLAUDE_CODE_MODEL_ALIASES,
      sessionArg: "--session-id",
      sessionMode: "always",
      sessionIdFields: [...CLAUDE_CODE_SESSION_ID_FIELDS],
      systemPromptArg: "--append-system-prompt",
      systemPromptMode: "append",
      systemPromptWhen: "first",
      clearEnv: [...CLAUDE_CODE_CLEAR_ENV],
      reliability: {
        watchdog: {
          fresh: { ...CLI_FRESH_WATCHDOG_DEFAULTS },
          resume: { ...CLI_RESUME_WATCHDOG_DEFAULTS },
        },
      },
      serialize: true,
    },
    normalizeConfig: normalizeClaudeCodeBackendConfig,
  };
}
