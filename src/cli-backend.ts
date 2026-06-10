import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CliBackendPlugin } from "openclaw/plugin-sdk/cli-backend";

import {
  CLAUDE_CODE_BACKEND_ID,
  CLAUDE_CODE_CLEAR_ENV,
  CLAUDE_CODE_DEFAULT_MODEL_REF,
  CLAUDE_CODE_FRESH_WATCHDOG,
  CLAUDE_CODE_MODEL_ALIASES,
  CLAUDE_CODE_RESUME_WATCHDOG,
  CLAUDE_CODE_SESSION_ID_FIELDS,
  CLAUDE_CODE_STARTUP_ENV,
  normalizeClaudeCodeBackendConfig,
} from "./cli-shared.js";

/**
 * Path to an empty MCP config file (zero servers).
 *
 * Why a file and not bundleMcp / an inline string:
 *  - With `bundleMcp: true`, OpenClaw injects its gateway MCP server and claude
 *    blocks ~3–4 minutes on that handshake before its first request.
 *  - With `bundleMcp: false` and NO `--mcp-config`, claude falls back to the
 *    host's user/project MCP servers and can stall with no output until the
 *    no-output watchdog kills it (cli_no_output_timeout).
 *  - An inline `--mcp-config '{"mcpServers":{}}'` string is not honored the way
 *    a real file is, and produced the same no-output stall.
 *
 * Pointing `--mcp-config` at a real, empty config file with `--strict-mcp-config`
 * makes claude load ZERO MCP servers from a valid source: it starts immediately,
 * produces output right away, and keeps all of Claude Code's native tools.
 */
const EMPTY_MCP_CONFIG_PATH = join(tmpdir(), "openclaw-claude-code-empty-mcp.json");
try {
  writeFileSync(EMPTY_MCP_CONFIG_PATH, '{"mcpServers":{}}\n');
} catch {
  // Best-effort: if we can't write it, the backend still launches; claude will
  // just fall back to its default MCP discovery.
}

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
      defaultMcpProbe: false,
      docker: {
        npmPackage: "@anthropic-ai/claude-code",
        binaryName: "claude",
      },
    },
    // OFF on purpose. OpenClaw's bundled gateway MCP makes claude block for
    // minutes on a handshake before replying. We supply our own empty MCP
    // config file instead (see EMPTY_MCP_CONFIG_PATH) for fast startup.
    bundleMcp: false,
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
        // Zero MCP servers from a valid file → fast start, no handshake stall.
        "--strict-mcp-config",
        "--mcp-config",
        EMPTY_MCP_CONFIG_PATH,
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
        "--strict-mcp-config",
        "--mcp-config",
        EMPTY_MCP_CONFIG_PATH,
        "--resume",
        "{sessionId}",
      ],
      output: "jsonl",
      // Claude Code emits provider-specific stream-json events. OpenClaw only
      // parses them into clean assistant text when this dialect is set OR when
      // the backend id is literally "claude-cli". Since our id is "claude-code",
      // we MUST declare the dialect — otherwise the raw JSONL leaks to the channel.
      jsonlDialect: "claude-stream-json",
      resumeOutput: "jsonl",
      input: "stdin",
      modelArg: "--model",
      modelAliases: CLAUDE_CODE_MODEL_ALIASES,
      sessionArg: "--session-id",
      sessionMode: "always",
      sessionIdFields: [...CLAUDE_CODE_SESSION_ID_FIELDS],
      systemPromptArg: "--append-system-prompt",
      systemPromptMode: "append",
      systemPromptWhen: "first",
      env: { ...CLAUDE_CODE_STARTUP_ENV },
      clearEnv: [...CLAUDE_CODE_CLEAR_ENV],
      reliability: {
        watchdog: {
          fresh: { ...CLAUDE_CODE_FRESH_WATCHDOG },
          resume: { ...CLAUDE_CODE_RESUME_WATCHDOG },
        },
      },
      serialize: true,
    },
    normalizeConfig: normalizeClaudeCodeBackendConfig,
  };
}
