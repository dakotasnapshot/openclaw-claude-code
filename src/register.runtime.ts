import type {
  OpenClawPluginApi,
  ProviderAuthContext,
  ProviderAuthMethodNonInteractiveContext,
} from "openclaw/plugin-sdk/plugin-entry";
import type { ProviderPlugin } from "openclaw/plugin-sdk/provider-model-shared";
import { formatCliCommand } from "openclaw/plugin-sdk/cli-runtime";
import type { ProviderAuthResult } from "openclaw/plugin-sdk/provider-auth";

import { buildClaudeCodeCliBackend } from "./cli-backend.js";
import {
  CLAUDE_CODE_DEFAULT_ALLOWLIST_REFS,
  CLAUDE_CODE_DEFAULT_MODEL_REF,
  isClaudeCliAvailable,
} from "./cli-shared.js";

const PROVIDER_ID = "claude-code";
type OpenClawConfigLike = ProviderAuthMethodNonInteractiveContext["config"];

const NOT_FOUND_MESSAGE = [
  "Claude Code / Cowork is not installed or not in PATH.",
  `Install it from https://claude.ai/download, then run ${formatCliCommand("claude auth login")}.`,
].join("\n");

// ---------------------------------------------------------------------------
// Auth handlers
//
// IMPORTANT: This plugin deliberately stores NO credentials in OpenClaw's
// auth profile store. We never read tokens from the keychain and never hand
// them to the provider layer — that would allow OpenClaw to make direct HTTP
// calls to Anthropic, bypassing the local CLI entirely.
//
// All we do here is verify the `claude` binary is reachable. The subprocess
// spawned by cli-backend.ts handles its own auth via its persisted login state.
// ---------------------------------------------------------------------------

async function runCliAuth(ctx: ProviderAuthContext): Promise<ProviderAuthResult> {
  if (!isClaudeCliAvailable()) {
    throw new Error(NOT_FOUND_MESSAGE);
  }

  return {
    // No credentials — OpenClaw's provider layer gets nothing it could use
    // to open a direct connection to Anthropic.
    profiles: [],
    defaultModel: CLAUDE_CODE_DEFAULT_MODEL_REF,
    notes: [
      "Claude Code detected — all inference will be routed through your local claude CLI.",
      "No API key is required. Billing runs through your existing Claude subscription.",
      "OpenClaw will never make direct calls to Anthropic on your behalf.",
    ],
  };
}

async function runCliAuthNonInteractive(
  ctx: ProviderAuthMethodNonInteractiveContext,
): Promise<OpenClawConfigLike | null> {
  if (!isClaudeCliAvailable()) {
    ctx.runtime.error(NOT_FOUND_MESSAGE);
    ctx.runtime.exit(1);
    return null;
  }
  return ctx.config;
}

// ---------------------------------------------------------------------------
// Provider definition
// ---------------------------------------------------------------------------

function buildClaudeCodeProvider(): ProviderPlugin {
  return {
    id: PROVIDER_ID,
    label: "Claude Code",
    docsPath: "/providers/claude-code",
    // No hookAliases — we don't piggyback on the anthropic provider's auth.
    // No envVars — we never read API keys or tokens from the environment.
    envVars: [],
    auth: [
      {
        id: "cli",
        label: "Claude Code / Cowork (local)",
        hint: "Route through your local Claude Code install — no API key, no direct Anthropic calls",
        kind: "custom",
        wizard: {
          choiceId: "claude-code-cli",
          choiceLabel: "Claude Code / Cowork",
          choiceHint: "Use your local Claude Code install — no API key needed",
          assistantPriority: 0,
          groupId: "claude-code",
          groupLabel: "Claude Code",
          groupHint: "Local claude CLI — all inference stays on your machine",
          modelAllowlist: {
            allowedKeys: [...CLAUDE_CODE_DEFAULT_ALLOWLIST_REFS],
            initialSelections: [CLAUDE_CODE_DEFAULT_MODEL_REF],
            message: "Claude Code models (routed via local CLI)",
          },
        },
        run: runCliAuth,
        runNonInteractive: runCliAuthNonInteractive,
      },
    ],
    // Explicitly omitting resolveSyntheticAuth — if implemented, OpenClaw
    // could convert a stored token into a direct Anthropic API credential.
    // We never want that path to exist for this provider.
  };
}

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export function registerClaudeCodePlugin(api: OpenClawPluginApi): void {
  api.registerCliBackend(buildClaudeCodeCliBackend());
  api.registerProvider(buildClaudeCodeProvider());
}
