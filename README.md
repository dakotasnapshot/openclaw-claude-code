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
openclaw models use claude-code/claude-opus-4-7
```

## Available models

Models follow the `claude-code/<model-id>` naming convention, matching whatever models your Claude Code install supports:

| Model ref | Description |
|---|---|
| `claude-code/claude-opus-4-7` | Opus 4.7 (default) |
| `claude-code/claude-sonnet-4-6` | Sonnet 4.6 |
| `claude-code/claude-opus-4-6` | Opus 4.6 |
| `claude-code/claude-opus-4-5` | Opus 4.5 |
| `claude-code/claude-sonnet-4-5` | Sonnet 4.5 |
| `claude-code/claude-haiku-4-5` | Haiku 4.5 |

You can also use short aliases: `opus`, `sonnet`, `haiku`.

## Security model

This plugin is intentionally minimal on the auth side:

- **Setup**: checks that the `claude` binary is present in PATH (`claude --version`). That's it.
- **Runtime**: OpenClaw spawns `claude -p --output-format stream-json` as a subprocess. The subprocess uses its own persisted auth — no tokens are ever passed through this plugin.
- **`resolveSyntheticAuth` is not implemented** — OpenClaw cannot fall back to making direct Anthropic API calls through this provider.
- Environment variables that could redirect the subprocess to a different provider or endpoint are cleared before each spawn (see `CLAUDE_CODE_CLEAR_ENV` in `src/cli-shared.ts`).

## License

MIT
