import { execFileSync } from "node:child_process";
import type { CliBackendConfig } from "openclaw/plugin-sdk/cli-backend";

export const CLAUDE_CODE_BACKEND_ID = "claude-code";
export const CLAUDE_CODE_DEFAULT_MODEL_REF = `${CLAUDE_CODE_BACKEND_ID}/claude-fable-5`;

export const CLAUDE_CODE_DEFAULT_ALLOWLIST_REFS = [
  `${CLAUDE_CODE_BACKEND_ID}/claude-fable-5`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-mythos-5`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-opus-4-8`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-opus-4-7`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-sonnet-4-6`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-opus-4-6`,
  `${CLAUDE_CODE_BACKEND_ID}/claude-haiku-4-5`,
] as const;

/**
 * Maps config model ids to the model string passed to `claude --model`.
 *
 * Versioned ids map to their exact CLI model id so a pinned model stays
 * pinned. Bare family names (opus/sonnet/haiku) pass through and let the CLI
 * resolve its current default for that family.
 *
 * Mythos models (claude-mythos-5, claude-mythos-preview) only work if the
 * Claude account behind the local CLI has Project Glasswing access.
 */
export const CLAUDE_CODE_MODEL_ALIASES: Record<string, string> = {
  fable: "claude-fable-5",
  "fable-5": "claude-fable-5",
  "claude-fable-5": "claude-fable-5",
  mythos: "claude-mythos-5",
  "mythos-5": "claude-mythos-5",
  "claude-mythos-5": "claude-mythos-5",
  "mythos-preview": "claude-mythos-preview",
  "claude-mythos-preview": "claude-mythos-preview",
  opus: "opus",
  "opus-4.8": "claude-opus-4-8",
  "opus-4.7": "claude-opus-4-7",
  "opus-4.6": "claude-opus-4-6",
  "opus-4.5": "claude-opus-4-5",
  "claude-opus-4-8": "claude-opus-4-8",
  "claude-opus-4-7": "claude-opus-4-7",
  "claude-opus-4-6": "claude-opus-4-6",
  "claude-opus-4-5": "claude-opus-4-5",
  sonnet: "sonnet",
  "sonnet-4.6": "claude-sonnet-4-6",
  "sonnet-4.5": "claude-sonnet-4-5",
  "claude-sonnet-4-6": "claude-sonnet-4-6",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  haiku: "haiku",
  "haiku-4.5": "claude-haiku-4-5",
  "claude-haiku-4-5": "claude-haiku-4-5",
};

/**
 * No-output watchdog tuning for Fable/Mythos-era models.
 *
 * Fable 5 and Mythos 5 can think silently for minutes at a time. OpenClaw's
 * stock watchdog defaults are too aggressive for resumed sessions in
 * particular, so this gives the CLI a longer silence window while still
 * allowing the overall run timeout to reap truly hung processes.
 */
export const CLAUDE_CODE_FRESH_WATCHDOG = {
  noOutputTimeoutRatio: 0.9,
  minMs: 600_000,
  maxMs: 1_800_000,
} as const;

export const CLAUDE_CODE_RESUME_WATCHDOG = {
  noOutputTimeoutRatio: 0.9,
  minMs: 600_000,
  maxMs: 1_800_000,
} as const;

export const CLAUDE_CODE_SESSION_ID_FIELDS = [
  "session_id",
  "sessionId",
  "conversation_id",
  "conversationId",
] as const;

/**
 * Env vars to scrub before spawning the claude CLI subprocess.
 *
 * These vars could redirect the claude process to a different provider,
 * endpoint, or token source — defeating the point of routing through the
 * local install. Clearing them ensures the subprocess uses only its own
 * persisted login state (keychain / ~/.claude).
 */
export const CLAUDE_CODE_CLEAR_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_API_KEY_OLD",
  "ANTHROPIC_API_TOKEN",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_CUSTOM_HEADERS",
  "ANTHROPIC_OAUTH_TOKEN",
  "ANTHROPIC_UNIX_SOCKET",
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_OAUTH_REFRESH_TOKEN",
  "CLAUDE_CODE_OAUTH_SCOPES",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR",
  "CLAUDE_CODE_PLUGIN_CACHE_DIR",
  "CLAUDE_CODE_PLUGIN_SEED_DIR",
  "CLAUDE_CODE_REMOTE",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_COWORK_PLUGINS",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_LOGS_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
  "OTEL_EXPORTER_OTLP_METRICS_HEADERS",
  "OTEL_EXPORTER_OTLP_METRICS_PROTOCOL",
  "OTEL_EXPORTER_OTLP_PROTOCOL",
  "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
  "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
  "OTEL_LOGS_EXPORTER",
  "OTEL_METRICS_EXPORTER",
  "OTEL_SDK_DISABLED",
  "OTEL_TRACES_EXPORTER",
] as const;

/**
 * Startup env overrides for the local `claude` process.
 *
 * These are based on observed launch-time stalls in the host GUI session:
 * - `DISABLE_AUTOUPDATER=1` skips Claude Code's auto-updater and plugin
 *   auto-update path, which otherwise introduces a large pre-request delay.
 * - `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` suppresses startup fetches
 *   like bootstrap/Grove notice traffic that are unrelated to the user's turn.
 * - `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL=1` prevents extra
 *   marketplace/plugin install chatter during headless print-mode launches.
 *
 * None of these alter inference auth or the model request itself; they only
 * trim background startup work before the real prompt is sent.
 */
export const CLAUDE_CODE_STARTUP_ENV: Record<string, string> = {
  DISABLE_AUTOUPDATER: "1",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: "1",
};

// ---------------------------------------------------------------------------
// Arg normalization (keeps permission + setting-sources flags safe)
// ---------------------------------------------------------------------------

const PERMISSION_MODE_ARG = "--permission-mode";
const BYPASS_PERMISSIONS_MODE = "bypassPermissions";
const SETTING_SOURCES_ARG = "--setting-sources";
const SAFE_SETTING_SOURCES = "user";
const LEGACY_SKIP_PERMISSIONS_ARG = "--dangerously-skip-permissions";

function normalizePermissionArgs(args?: string[]): string[] | undefined {
  if (!args) return args;
  const out: string[] = [];
  let seen = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === LEGACY_SKIP_PERMISSIONS_ARG) continue;
    if (arg === PERMISSION_MODE_ARG) {
      const val = args[i + 1];
      if (typeof val === "string" && val.trim().length > 0 && !val.startsWith("-")) {
        seen = true;
        out.push(arg, val);
        i++;
      }
      continue;
    }
    if (arg.startsWith(`${PERMISSION_MODE_ARG}=`)) seen = true;
    out.push(arg);
  }
  if (!seen) out.push(PERMISSION_MODE_ARG, BYPASS_PERMISSIONS_MODE);
  return out;
}

function normalizeSettingSourcesArgs(args?: string[]): string[] | undefined {
  if (!args) return args;
  const out: string[] = [];
  let seen = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === SETTING_SOURCES_ARG) {
      const val = args[i + 1];
      if (typeof val === "string" && val.trim().length > 0 && !val.startsWith("-")) {
        seen = true;
        out.push(arg, SAFE_SETTING_SOURCES);
        i++;
      }
      continue;
    }
    if (arg.startsWith(`${SETTING_SOURCES_ARG}=`)) {
      seen = true;
      out.push(`${SETTING_SOURCES_ARG}=${SAFE_SETTING_SOURCES}`);
      continue;
    }
    out.push(arg);
  }
  if (!seen) out.push(SETTING_SOURCES_ARG, SAFE_SETTING_SOURCES);
  return out;
}

export function normalizeClaudeCodeBackendConfig(config: CliBackendConfig): CliBackendConfig {
  return {
    ...config,
    args: normalizePermissionArgs(normalizeSettingSourcesArgs(config.args)),
    resumeArgs: normalizePermissionArgs(normalizeSettingSourcesArgs(config.resumeArgs)),
  };
}

// ---------------------------------------------------------------------------
// Local CLI availability check — no credential reading
// ---------------------------------------------------------------------------

/**
 * Returns true if the `claude` binary is present and responsive.
 * This is a binary existence check only — we never read or store tokens.
 * The subprocess that handles inference uses its own persisted auth.
 */
export function isClaudeCliAvailable(): boolean {
  try {
    execFileSync("claude", ["--version"], { timeout: 30_000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
