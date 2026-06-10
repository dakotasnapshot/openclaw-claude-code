# openclaw-claude-code

An [OpenClaw](https://github.com/openclaw/openclaw) plugin that routes all inference through your **local Claude Code / Cowork install**.

- ✅ No API key required
- ✅ No direct calls to Anthropic's API — ever
- ✅ Uses your existing Claude subscription
- ✅ All requests proxy through the `claude` CLI on your machine

## How it works

OpenClaw spawns your local `claude` binary as a subprocess for every conversation. The `claude` process handles its own authentication using its persisted login state (keychain / `~/.claude`). This plugin never reads your tokens, never stores credentials in OpenClaw's profile store, and never opens a direct HTTP connection to Anthropic on your behalf.

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running
- [Claude Code](https://claude.ai/download) (the `claude` CLI) installed and authenticated
  ```sh
  claude auth login
  ```

## Installation

### Via OpenClaw plugin manager
```sh
openclaw plugin install openclaw-claude-code
```

### Via npm (manual)
```sh
npm install -g openclaw-claude-code
openclaw plugin link openclaw-claude-code
```

### From this repo
```sh
git clone https://github.com/dakotasnapshot/openclaw-claude-code
cd openclaw-claude-code
npm install
npm run build
openclaw plugin install --path .
```

## Setup

After installing, run OpenClaw's setup wizard and choose **"Claude Code / Cowork"** when prompted to select an AI backend.

```sh
openclaw setup
```

Or set it as the default model directly:
```sh
openclaw models use claude-code/claude-fable-5
```

## Available models

Models follow the `claude-code/<model-id>` naming convention, matching whatever models your Claude Code install supports:

| Model ref | Description |
|---|---|
| `claude-code/claude-fable-5` | Fable 5 (default) — Anthropic's most capable widely released model |
| `claude-code/claude-mythos-5` | Mythos 5 — requires Project Glasswing access on your Claude account |
| `claude-code/claude-opus-4-8` | Opus 4.8 |
| `claude-code/claude-opus-4-7` | Opus 4.7 |
| `claude-code/claude-sonnet-4-6` | Sonnet 4.6 |
| `claude-code/claude-opus-4-6` | Opus 4.6 |
| `claude-code/claude-haiku-4-5` | Haiku 4.5 |

You can also use short aliases: `fable`, `mythos`, `opus`, `sonnet`, `haiku`.

> **Note on Mythos:** `claude-mythos-5` and `claude-mythos-preview` are limited-availability models offered to approved organizations through Project Glasswing. The plugin will pass the model through to your local CLI, but the request only succeeds if the account your CLI is logged into has been granted access. Everyone else should use `claude-fable-5`, the generally available Mythos-class model.

## Long-running responses and timeouts

Fable 5 and Mythos 5 run with adaptive thinking always on, and the raw chain of thought is never streamed back. That means the `claude` subprocess can legitimately produce **no output for several minutes** while the model thinks. Earlier versions of this plugin used OpenClaw's stock no-output watchdog, which could kill the subprocess mid-thought with errors like:

```
CLI produced no output for 60s and was terminated.
```

This plugin now ships watchdog profiles tuned for thinking models: up to 30 minutes of silence is tolerated on both fresh and resumed runs. The watchdog is still capped by your overall run timeout, so a genuinely hung process is still reaped.

## Security model

This plugin is intentionally minimal on the auth side:

- **Setup**: checks that the `claude` binary is present in PATH (`claude --version`). That's it.
- **Runtime**: OpenClaw spawns `claude -p --output-format stream-json` as a subprocess. The subprocess uses its own persisted auth — no tokens are ever passed through this plugin.
- **`resolveSyntheticAuth` is not implemented** — OpenClaw cannot fall back to making direct Anthropic API calls through this provider.
- Environment variables that could redirect the subprocess to a different provider or endpoint are cleared before each spawn (see `CLAUDE_CODE_CLEAR_ENV` in `src/cli-shared.ts`).

## License

MIT
