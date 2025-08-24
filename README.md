# 🏠 Workspaces MCP

**Intelligent workspace and context management for Claude Desktop**

A Model Context Protocol (MCP) server that automatically loads project context, manages workspaces, and provides shared instruction templates for enhanced Claude Desktop workflows.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/nazq/workspaces_mcp/workflows/CI/badge.svg)](https://github.com/nazq/workspaces_mcp/actions)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.10.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/coverage-71.74%25-green)](#testing)

## ✨ Features

- **🌍 Auto-Loading Global Context** - Global instructions automatically load in every Claude session
- **📁 Smart Workspace Management** - Organize projects with automatic resource discovery
- **🔄 Shared Instruction Templates** - Reusable instructions for different project types
- **🚀 DXT Distribution** - Official DXT packaging with one-click installation

## 🚀 Quick Start

### Prerequisites

- [Claude Desktop](https://claude.ai/desktop) application
- [Node.js](https://nodejs.org/) ≥20.10.0 (for development)

**Need to install development tools?** Use our [MCP Core Tools](https://github.com/nazq/mcp-core-tools) for automated cross-platform setup:

```bash
# Linux/macOS - installs Node.js, npm, and configures Claude Desktop paths
curl -fsSL https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_linux.sh | bash   # Linux
curl -fsSL https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_mac.sh | bash     # macOS
```

```powershell
# Windows - PowerShell script for complete setup
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nazq/mcp-core-tools/main/scripts/install_windows.ps1" -OutFile "install.ps1"
PowerShell -ExecutionPolicy Bypass -File install.ps1
```

### Installation

#### 📥 Direct Installation (Recommended)

1. **Download the latest release:**
   - [Latest Release](https://github.com/nazq/workspaces_mcp/releases/latest)
   - Download the `workspaces-mcp-X.X.X.dxt` file

2. **Install in Claude Desktop:**
   - Open Claude Desktop
   - Go to **Settings** → **Extensions**
   - Click **"Install from file"**
   - Select the downloaded `.dxt` file
   - Restart Claude Desktop

3. **Verify installation:**
   - Look for **"🌍 Global Instructions"** in your resources panel
   - New tools available: `create_workspace`, `list_workspaces`, etc.

#### 🛠️ Build from Source

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

Comprehensive test suite with 258 passing tests and 71.74% coverage:

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
