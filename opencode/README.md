# OpenCode Installation

Copy these files to your OpenCode config directory:

```bash
cp commands/harden.md ~/.config/opencode/commands/
cp agents/*.md ~/.config/opencode/agents/
```

The harden command references these agents by name (`@recon`, `@debug-audit`, `@test-runner`, `@security-audit`, `@robustness-audit`, `@accessibility-audit`). Make sure all agent files are present in `~/.config/opencode/agents/`.

See the root [README.md](../README.md) for usage instructions.
