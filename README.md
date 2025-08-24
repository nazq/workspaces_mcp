# 🏠 Workspaces MCP

**The Ultimate Developer Experience Toolkit for Claude Desktop**

Transform how you work with Claude by automatically loading project context, sharing instructions across sessions, and organizing your development workspaces with zero configuration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-148%20passing-success)](#testing)
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

### 🚀 **Zero Configuration Setup**

- **One-command installation** with `dxt-workspaces install`
- **Auto-configures Claude Desktop** - no manual JSON editing
- **Cross-platform support** (macOS, Windows, Linux)

## 🚀 Quick Start

### Prerequisites

- Node.js ≥18.0.0
- Claude Desktop application
- Git (for cloning)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/workspaces-mcp.git
cd workspaces-mcp

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Install and configure Workspaces MCP
node packages/dxt-workspaces/dist/index.js install

# 5. Restart Claude Desktop
# Look for "🌍 Global Instructions" in your resources!
```

### Custom Installation Path

```bash
# Install to a custom directory
node packages/dxt-workspaces/dist/index.js install --path ~/my-workspaces
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

Comprehensive test suite with **145 passing tests** covering:

- **MCP Protocol Implementation** - Resource and tool handlers
- **Service Layer** - Workspace and instruction management
- **File System Operations** - Safe file handling with security
- **CLI Functionality** - Installation and configuration
- **Error Handling** - Graceful failure modes
- **Security** - Path traversal protection

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Interactive test UI
npm run test:ui
```

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
