# 🏠 Workspaces MCP

**Intelligent workspace and context management for Claude Desktop**

A Model Context Protocol (MCP) server that automatically loads project context, manages workspaces, and provides shared instruction templates for enhanced Claude Desktop workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/nazq/workspaces_mcp/workflows/CI/badge.svg)](https://github.com/nazq/workspaces_mcp/actions)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Codecov](https://codecov.io/gh/nazq/workspaces_mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/nazq/workspaces_mcp)

## ✨ Features

- **🌍 Auto-Loading Global Context** - Global instructions automatically load in every Claude session
- **📁 Smart Workspace Management** - Organize projects with automatic resource discovery
- **🔄 Shared Instruction Templates** - Reusable instructions for different project types
- **🚀 DXT Distribution** - Official DXT packaging with one-click installation

## ⚡ Quick Start for Claude Desktop Users

**Just want to use this with Claude Desktop?** Follow these 3 simple steps:

### Step 1: Open Your Terminal

<details>
<summary><strong>🪟 Windows</strong></summary>

1. Press `Windows key + R`
2. Type `powershell` and press Enter
3. A blue terminal window will open

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

1. Press `Cmd + Space` to open Spotlight
2. Type `Terminal` and press Enter
3. A terminal window will open

</details>

<details>
<summary><strong>🐧 Linux</strong></summary>

1. Press `Ctrl + Alt + T`
2. Or search for "Terminal" in your applications
3. A terminal window will open

</details>

### Step 2: Run the Installation Script

Copy and paste the command for your operating system:

**Windows (PowerShell):**

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_windows.ps1" -OutFile "install.ps1"; PowerShell -ExecutionPolicy Bypass -File install.ps1
```

**macOS:**

```bash
curl -fsSL https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_mac.sh | bash
```

**Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_linux.sh | bash
```

This will:

- ✅ Install Node.js (if needed)
- ✅ Download and build the MCP server
- ✅ Configure Claude Desktop automatically
- ✅ Set up your workspace folders

### Step 3: Restart Claude Desktop

1. **Close Claude Desktop completely**
2. **Reopen Claude Desktop**
3. **Look for "🌍 Global Instructions"** in your resources panel
4. **Click it** to load your workspace context automatically

🎉 **Done!** You now have intelligent workspace management in Claude Desktop.

**What happens next?** Claude will automatically load context from your `~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md` file in every session. You can edit this file to customize your global instructions.

---

## 🛠️ Developer Quick Start

**Want to contribute or build from source?**

### Prerequisites

- [Node.js](https://nodejs.org/) ≥20.10.0
- [Claude Desktop](https://claude.ai/desktop) application

### Build from Source

```bash
git clone https://github.com/nazq/workspaces_mcp.git
cd workspaces_mcp
npm ci
npm run dxt:package
# Install the generated .dxt file in Claude Desktop
```

## 📖 Usage

### Global Instructions

Global context automatically loads in every Claude session:

```bash
# Edit your global instructions (created automatically)
code ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
```

### Workspace Management

Use Claude's built-in tools:

- **`create_workspace`** - Set up new project workspace
- **`list_workspaces`** - See all your workspaces
- **`get_workspace_info`** - Get workspace details
- **`create_shared_instruction`** - Create reusable templates
- **`update_global_instructions`** - Update global context

### Workspace Structure

```
~/Documents/workspaces/
├── SHARED_INSTRUCTIONS/
│   ├── GLOBAL.md              # Auto-loads in every session
│   ├── react-typescript.md    # Shared template
│   └── python-data.md         # Another template
├── my-react-app/              # Your workspace
│   ├── README.md
│   ├── src/
│   └── package.json
└── data-analysis-project/     # Another workspace
    ├── analysis.py
    └── data.csv
```

## 🛠️ Development

### Architecture

Built with a **5-layer architecture** for maintainability and testability. See [ARCH.md](ARCH.md) for detailed architecture documentation.

### Available Scripts

```bash
# Core workflow
npm run ci                    # Full CI pipeline (typecheck, lint, test, build)
npm run dxt:package          # Build + create DXT package
npm run dev                  # Development mode

# Quality checks
npm run typecheck            # TypeScript validation
npm run lint                 # ESLint validation
npm run format               # Prettier formatting
npm test                     # Run tests
```

### Building from Source

```bash
npm install
npm run build
npm test
```

## 🧪 Testing

Comprehensive test suite with 342 passing tests and 63.72% coverage:

- MCP Protocol Implementation
- Service Layer Business Logic
- File System Operations with Error Boundaries
- Transport Layer (STDIO/HTTP)
- CLI Functionality
- Security (Path traversal protection, input validation)

```bash
npm test                     # Run all tests
npm run test:coverage        # Coverage report
npm run test:integration     # Integration tests
```

## 📁 Configuration

### Environment Variables

- **`WORKSPACES_ROOT`** - Custom workspace directory (default: `~/Documents/workspaces`)
- **`WORKSPACES_LOG_LEVEL`** - Logging level (`debug`, `info`, `warn`, `error`, `fatal`)

### Claude Desktop Configuration

The DXT installer automatically configures Claude Desktop. Manual configuration example:

```json
{
  "mcpServers": {
    "workspaces-mcp": {
      "command": "node",
      "args": ["/path/to/server/dist/bin/server.js"],
      "env": {
        "WORKSPACES_ROOT": "/path/to/workspaces"
      }
    }
  }
}
```

**Config locations:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make changes and add tests
5. Run: `npm run ci`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push and open a Pull Request

## 🐛 Troubleshooting

### Common Issues

**Claude Desktop doesn't show resources:**

- Restart Claude Desktop after installation
- Check Node.js ≥20.10.0 is installed
- Verify MCP server path in config

**Permission errors:**

- Run with appropriate permissions for config directory
- Check workspace directory permissions

**MCP server not found:**

- Build project: `npm run build`
- Verify server exists at `dist/bin/server.js`

### Getting Help

- 📖 [Documentation](docs/)
- 💬 [Discussions](https://github.com/nazq/workspaces_mcp/discussions)
- 🐛 [Issues](https://github.com/nazq/workspaces_mcp/issues)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ for the Claude Desktop community**
