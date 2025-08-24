# 📚 Workspaces MCP Documentation

Welcome to the comprehensive documentation for Workspaces MCP - the ultimate developer experience toolkit for Claude Desktop.

## 🚀 Getting Started

New to Workspaces MCP? Start here:

1. **[Installation Guide](INSTALLATION.md)** - Get up and running quickly
2. **[Usage Guide](USAGE.md)** - Learn how to use all features effectively
3. **[Troubleshooting](TROUBLESHOOTING.md)** - Solve common issues

## 📖 Documentation Index

### For Users

| Document                                  | Description                                           |
| ----------------------------------------- | ----------------------------------------------------- |
| **[Installation Guide](INSTALLATION.md)** | Complete installation instructions for all platforms  |
| **[Usage Guide](USAGE.md)**               | Comprehensive usage guide with examples and workflows |
| **[API Reference](API.md)**               | Detailed reference for all MCP tools and resources    |
| **[Troubleshooting](TROUBLESHOOTING.md)** | Solutions to common problems and issues               |

### For Developers

| Document                                     | Description                                 |
| -------------------------------------------- | ------------------------------------------- |
| **[Contributing Guide](../CONTRIBUTING.md)** | How to contribute to the project            |
| **[Architecture](ARCHITECTURE.md)**          | Technical architecture and design decisions |
| **[Development Setup](DEVELOPMENT.md)**      | Setting up development environment          |

## 🎯 Quick Navigation

### I want to...

**🏃‍♂️ Get started quickly**
→ [Quick Start](../README.md#quick-start)

**📦 Install Workspaces MCP**
→ [Installation Guide](INSTALLATION.md)

**🛠️ Use MCP tools in Claude**
→ [Usage Guide](USAGE.md#available-mcp-tools)

**🌍 Set up global instructions**
→ [Global Instructions Guide](USAGE.md#global-instructions)

**📁 Create and manage workspaces**
→ [Workspace Management](USAGE.md#workspace-management)

**🎨 Create custom templates**
→ [Custom Templates](USAGE.md#custom-templates)

**🔧 Configure advanced settings**
→ [Configuration Reference](API.md#configuration)

**🐛 Fix problems**
→ [Troubleshooting Guide](TROUBLESHOOTING.md)

**💻 Contribute to development**
→ [Contributing Guide](../CONTRIBUTING.md)

## 📋 Feature Overview

### ✨ Key Features

- **🌍 Auto-loading Global Context** - Your preferences load in every Claude session
- **📁 Smart Workspace Management** - Organize projects with automatic resource discovery
- **🎨 Shared Instruction Templates** - Reusable templates for different project types
- **🚀 Zero Configuration Setup** - One-command installation with auto-configuration
- **🔒 Security Built-in** - Path validation and secure file operations
- **🧪 Comprehensive Testing** - 145+ tests covering all functionality

### 🛠️ Available MCP Tools

| Tool                         | Purpose                                 |
| ---------------------------- | --------------------------------------- |
| `create_workspace`           | Create new project workspace            |
| `list_workspaces`            | List all available workspaces           |
| `get_workspace_info`         | Get detailed workspace information      |
| `create_shared_instruction`  | Create reusable instruction templates   |
| `update_global_instructions` | Update global auto-loading instructions |
| `list_shared_instructions`   | List all shared instruction templates   |

### 📄 Resource Types

| Resource Type              | Description                     |
| -------------------------- | ------------------------------- |
| 🌍 **Global Instructions** | Auto-loads in every session     |
| 📋 **Shared Instructions** | Reusable templates for projects |
| 📁 **Workspace Overview**  | Project structure and metadata  |
| 📄 **Workspace Files**     | Individual files in workspaces  |

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude        │    │   MCP Server    │    │   File System  │
│   Desktop       │◄──►│                 │◄──►│                 │
│                 │    │   • Resources   │    │   • Workspaces  │
│   • Resources   │    │   • Tools       │    │   • Templates   │
│   • Tools       │    │   • Security    │    │   • Config      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Breakdown

- **MCP Server**: Implements Model Context Protocol for Claude integration
- **Resource Handler**: Manages workspace and instruction resources
- **Tool Handler**: Executes workspace management tools
- **Service Layer**: Business logic for workspaces and instructions
- **Security Layer**: Input validation and path security
- **File System**: Safe file operations with proper error handling

## 🌟 Use Cases

### For Individual Developers

- **Personal coding standards** in global instructions
- **Project organization** with dedicated workspaces
- **Template reuse** for consistent project patterns
- **Context management** for focused development

### For Development Teams

- **Shared coding standards** via instruction templates
- **Project templates** for consistent team practices
- **Workspace organization** for team collaboration
- **Documentation templates** for consistent docs

### For Educational Use

- **Course materials** organized in workspaces
- **Coding standards** for students in global instructions
- **Assignment templates** for consistent requirements
- **Project scaffolding** with pre-configured templates

## 🎨 Customization

### Global Instructions Examples

```markdown
# My Global Instructions

## Code Style Preferences

- Use TypeScript for all new projects
- Prefer functional programming patterns
- Write tests first (TDD approach)
- Use meaningful variable names

## Documentation Standards

- Write clear README files
- Include usage examples
- Document all public APIs
- Keep changelogs updated
```

### Custom Template Examples

```markdown
# Vue TypeScript Template

## Project Setup

- Vue 3 with Composition API
- TypeScript in strict mode
- Pinia for state management
- Vitest for testing

## Development Patterns

- Use `<script setup>` syntax
- Define props with interfaces
- Create composables for reusable logic
- Implement proper error boundaries
```

## 🔧 Advanced Configuration

### Environment Variables

```bash
# Custom workspace directory
export WORKSPACES_ROOT=~/dev/projects

# Debug logging for development
export WORKSPACES_LOG_LEVEL=debug

# Production logging
export WORKSPACES_LOG_LEVEL=error
```

### Multiple Workspace Roots

Set up different workspace environments:

```bash
# Development projects
dxt-workspaces install --path ~/dev/workspaces

# Personal projects
dxt-workspaces install --path ~/personal/projects

# Client work
dxt-workspaces install --path ~/client/workspaces
```

## 📊 Performance & Limits

### Resource Limits

- **Shared instructions**: 100KB maximum file size
- **Workspace files**: Automatically handled, large files truncated
- **Directory depth**: Unlimited, but deeply nested structures may impact performance
- **Number of workspaces**: No hard limit, performance scales well

### Performance Optimization

- **Lazy loading**: Resources loaded only when requested
- **Caching**: File metadata cached to reduce filesystem calls
- **Efficient scanning**: Optimized directory traversal
- **Memory management**: Automatic cleanup of temporary resources

## 🛡️ Security Features

- **Path traversal protection**: Prevents `../` directory escapes
- **Workspace isolation**: Each workspace contained in its directory
- **Input validation**: All inputs validated and sanitized
- **File type restrictions**: Only safe file types served as resources
- **Size limits**: Prevents resource exhaustion attacks

## 🧪 Testing Information

- **145+ tests** covering all functionality
- **90%+ code coverage** across all components
- **Security testing** for path validation
- **Integration testing** with MCP protocol
- **Cross-platform testing** on macOS, Windows, Linux

## 📈 Roadmap

### Upcoming Features

- **NPM package distribution** for easier installation
- **VS Code extension** integration
- **Git integration** for workspace templates
- **Cloud workspace synchronization**
- **Plugin system** for custom tools
- **Workspace sharing** and collaboration features

### Community Requests

See our [GitHub Issues](https://github.com/your-org/workspaces-mcp/issues) for requested features and vote on what you'd like to see next!

## 🤝 Community

- **💬 Discussions**: [GitHub Discussions](https://github.com/your-org/workspaces-mcp/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-org/workspaces-mcp/issues)
- **📧 Email**: support@workspaces-mcp.dev
- **🐦 Twitter**: [@WorkspacesMCP](https://twitter.com/WorkspacesMCP)

## 📄 License

This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Ready to get started?** Begin with the [Installation Guide](INSTALLATION.md) and transform your Claude Desktop experience!
