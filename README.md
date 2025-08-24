# 🏠 Workspaces MCP

**The Ultimate Developer Experience Toolkit for Claude Desktop**

Transform how you work with Claude by automatically loading project context, sharing instructions across sessions, and organizing your development workspaces with zero configuration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/nazq/workspaces_mcp/workflows/CI/badge.svg)](https://github.com/nazq/workspaces_mcp/actions)
[![Release](https://github.com/nazq/workspaces_mcp/workflows/Production%20Release/badge.svg)](https://github.com/nazq/workspaces_mcp/actions)
[![Version](https://img.shields.io/github/v/release/nazq/workspaces_mcp)](https://github.com/nazq/workspaces_mcp/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/nazq/workspaces_mcp/total)](https://github.com/nazq/workspaces_mcp/releases)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-280%20passing-success)](#testing)
[![Coverage](https://img.shields.io/badge/coverage-71.74%25-green)](#testing)
[![codecov](https://codecov.io/gh/nazq/workspaces_mcp/graph/badge.svg)](https://codecov.io/gh/nazq/workspaces_mcp)

## ✨ Features

### 🌍 **Auto-Loading Global Context**

- **Global instructions** automatically load in every Claude session
- Edit once, available everywhere
- Perfect for coding standards, preferences, and common patterns

### 📁 **Smart Workspace Management**

- **Organize projects** in dedicated workspace folders
- **Automatic resource discovery** - Claude sees your project structure
- **Template system** for different project types (React, Python, Node.js, etc.)

### 🔄 **Shared Instruction Templates**

- **Reusable instructions** for different project types
- **Template library** with React TypeScript, Python Data Science, Node.js API patterns
- **Custom templates** - create your own instruction sets

### 🚀 **DXT Distribution**

- **Official DXT packaging** - follows Anthropic's distribution standard
- **One-command installation** with `dxt install workspaces-mcp.dxt`
- **Auto-configures Claude Desktop** - no manual JSON editing
- **Cross-platform support** (macOS, Windows, Linux)

## 🚀 Quick Start

### Prerequisites

- [Claude Desktop](https://claude.ai/desktop) application
- [Node.js](https://nodejs.org/) ≥18.0.0 (for development or building from source)

### Installation

#### 📥 **Option 1: Direct Installation (Recommended)**

1. **Download the latest release:**
   - 🔗 **[Latest Release](https://github.com/nazq/workspaces_mcp/releases/latest)**
   - Download the `workspaces-mcp-X.X.X.dxt` file

2. **Install in Claude Desktop:**
   - Open Claude Desktop
   - Go to **Settings** → **Extensions**
   - Click **"Install from file"**
   - Select the downloaded `.dxt` file
   - Restart Claude Desktop

3. **Verify installation:**
   - Look for **"🌍 Global Instructions"** in your resources panel
   - You should see new tools available: `create_workspace`, `list_workspaces`, etc.

#### 🛠️ **Option 2: Build from Source**

```bash
# 1. Clone and setup
git clone https://github.com/nazq/workspaces_mcp.git
cd workspaces_mcp
npm ci

# 2. Build the DXT package
npm run dxt:package

# 3. Install the generated .dxt file in Claude Desktop
# Follow the same steps as Option 1 above
```

#### 📦 **Option 3: NPM Package**

For developers integrating into other projects:

```bash
# Install as dependency
npm install workspaces-mcp

# Or install globally for CLI usage
npm install -g workspaces-mcp
```

### Configuration

After installation, you can configure Workspaces MCP through DXT:

```bash
# View current configuration
dxt config workspaces-mcp

# Set custom workspaces directory
dxt config workspaces-mcp --set workspaces_root=~/my-workspaces

# Set logging level
dxt config workspaces-mcp --set log_level=debug
```

## 📖 Usage

### 1. **Global Instructions**

Edit your global context that loads automatically:

```bash
# Edit your global instructions
code ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
```

### 2. **Create Workspaces**

Use Claude's built-in tools or create manually:

```markdown
In Claude Desktop, you can now use these tools:
• create_workspace - Set up new project workspace
• list_workspaces - See all your workspaces  
• get_workspace_info - Get workspace details
• create_shared_instruction - Create reusable templates
• update_global_instructions - Update global context
```

### 3. **Workspace Structure**

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

### 4. **Resource Loading**

In Claude Desktop, you'll see resources like:

- 🌍 **Global Instructions** (auto-loads)
- 📋 **react-typescript** (shared template)
- 📁 **my-react-app** (workspace)
- 📄 **my-react-app/README.md** (workspace file)

## 🛠️ Development

### Project Structure

```
workspaces-mcp/
├── packages/
│   ├── mcp-server/           # MCP protocol server
│   │   ├── src/
│   │   │   ├── server/       # MCP handlers
│   │   │   ├── services/     # Business logic
│   │   │   ├── utils/        # Utilities
│   │   │   └── types/        # TypeScript types
│   │   └── dist/             # Built server
│   └── dxt-workspaces/       # CLI installer
│       ├── src/
│       │   ├── commands/     # CLI commands
│       │   └── index.ts      # CLI entry point
│       └── dist/             # Built CLI
├── scripts/                  # Build scripts
└── docs/                     # Documentation
```

### Available Scripts

```bash
# Development
npm run dev                   # Development mode
npm run build                 # Build all packages
npm run test                  # Run tests
npm run test:coverage         # Test with coverage

# Code Quality
npm run lint                  # Lint code
npm run format                # Format code
npm run typecheck             # Type checking

# Testing
npm run test:integration      # Integration tests
npm run test:ui               # Test UI dashboard
```

### Building from Source

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Development mode with auto-rebuild
npm run dev
```

## 🧪 Testing

Enterprise-grade test suite with **280 passing tests** and **71.74% coverage** covering:

- **MCP Protocol Implementation** - Request handling, validation, rate limiting
- **Service Layer** - Workspace and instruction management
- **File System Operations** - Safe file handling with comprehensive error boundaries
- **Transport Layer** - STDIO/HTTP with environment detection
- **CLI Functionality** - Command processing and output formatting
- **Server Architecture** - 5-layer architecture with dependency injection
- **Error Handling** - Complete custom error class coverage
- **Security** - Path traversal protection and input validation

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Interactive test UI
npm run test:ui

# Integration tests
npm run test:integration
```

## 📦 Releases

### Release Channels

- **🚀 Production**: Stable releases for production use
  - **Install**: Download from [Latest Release](https://github.com/nazq/workspaces_mcp/releases/latest)
  - **NPM**: `npm install workspaces-mcp@latest`
  - **Versioning**: Semantic versioning (v1.0.0, v1.1.0, v2.0.0)

- **🚧 Beta**: Latest development builds for testing
  - **Install**: Check [Pre-releases](https://github.com/nazq/workspaces_mcp/releases?q=prerelease%3Atrue)
  - **NPM**: `npm install workspaces-mcp@beta`
  - **Versioning**: `1.0.0-beta.YYYYMMDDHHMMSS`

### Release Process

1. **Development**: Feature branches → PRs to `main`
2. **Beta Release**: Automatic on merge to `main`
3. **Production Release**: Manual tagging (`git tag v1.0.0`)
4. **Distribution**: NPM package + GitHub release with DXT file

### Changelog

All changes are documented in [CHANGELOG.md](./CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com/) format.

## 📁 Configuration

### Claude Desktop Configuration

The installer automatically configures Claude Desktop at:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

Example configuration:

```json
{
  "mcpServers": {
    "workspaces-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "WORKSPACES_ROOT": "/path/to/workspaces"
      }
    }
  }
}
```

### Environment Variables

- `WORKSPACES_ROOT` - Custom workspace directory path
- `WORKSPACES_LOG_LEVEL` - Logging level (debug, info, warn, error, fatal)

## 🔧 Advanced Usage

### Custom Templates

Create your own instruction templates:

```bash
# In Claude Desktop, use:
create_shared_instruction name="my-template" content="# My Custom Template..."
```

### Workspace Templates

The system includes built-in templates:

- **react-typescript** - React + TypeScript projects
- **python-data** - Data science projects
- **node-api** - Node.js API projects

### Logging

Configure logging levels:

```bash
# Debug level logging
WORKSPACES_LOG_LEVEL=debug node packages/mcp-server/dist/index.js

# Production logging (default: info)
WORKSPACES_LOG_LEVEL=error node packages/mcp-server/dist/index.js
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Create a branch: `git checkout -b feature/amazing-feature`
4. Make changes and add tests
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

### Common Issues

**Claude Desktop doesn't show resources:**

- Ensure Claude Desktop is restarted after installation
- Check that MCP server path is correct in config
- Verify Node.js ≥18.0.0 is installed

**Permission errors during installation:**

- Run with appropriate permissions for config directory
- Check file system permissions on workspace directory

**MCP server not found:**

- Ensure project is built: `npm run build`
- Verify MCP server exists at expected path
- Check that Node.js can execute the server binary

### Getting Help

- 📖 [Documentation](docs/)
- 💬 [Discussions](https://github.com/your-org/workspaces-mcp/discussions)
- 🐛 [Issues](https://github.com/your-org/workspaces-mcp/issues)
- 📧 Email: support@workspaces-mcp.dev

## 🗺️ Roadmap

- [ ] NPM package distribution
- [ ] VS Code extension integration
- [ ] Git integration for workspace templates
- [ ] Cloud workspace synchronization
- [ ] Plugin system for custom tools
- [ ] Workspace sharing and collaboration

---

**Made with ❤️ for the Claude Desktop community**

_Transform your development workflow with intelligent context management_
