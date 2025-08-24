# 📦 Installation Guide

Complete installation guide for Workspaces MCP on all platforms.

## Prerequisites

- **Node.js** ≥18.0.0 ([Download](https://nodejs.org/))
- **Claude Desktop** ([Download](https://claude.ai/download))
- **Git** (for cloning repository)

## 🚀 Quick Installation

### Method 1: From Source (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/workspaces-mcp.git
cd workspaces-mcp

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Install Workspaces MCP
node packages/dxt-workspaces/dist/index.js install

# 5. Restart Claude Desktop
```

### Method 2: NPM Global Install (Coming Soon)

```bash
# Install globally via NPM (when published)
npm install -g dxt-workspaces

# Run installation
dxt-workspaces install
```

## 🖥️ Platform-Specific Instructions

### macOS

```bash
# Standard installation
node packages/dxt-workspaces/dist/index.js install

# Custom workspace location
node packages/dxt-workspaces/dist/index.js install --path ~/my-workspaces
```

**Claude Config Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows

```powershell
# Standard installation (PowerShell/Command Prompt)
node packages/dxt-workspaces/dist/index.js install

# Custom workspace location
node packages/dxt-workspaces/dist/index.js install --path C:\Users\%USERNAME%\my-workspaces
```

**Claude Config Location**: `%APPDATA%\Claude\claude_desktop_config.json`

### Linux

```bash
# Standard installation
node packages/dxt-workspaces/dist/index.js install

# Custom workspace location
node packages/dxt-workspaces/dist/index.js install --path ~/my-workspaces
```

**Claude Config Location**: `~/.config/Claude/claude_desktop_config.json`

## 🔧 Installation Options

### Standard Installation

Creates workspaces in the default location:

- **macOS/Linux**: `~/Documents/workspaces`
- **Windows**: `%USERPROFILE%\Documents\workspaces`

```bash
node packages/dxt-workspaces/dist/index.js install
```

### Custom Installation Path

Install to a specific directory:

```bash
# Absolute path
node packages/dxt-workspaces/dist/index.js install --path /path/to/my/workspaces

# Relative to home directory
node packages/dxt-workspaces/dist/index.js install --path ~/dev/workspaces

# Windows paths
node packages/dxt-workspaces/dist/index.js install --path C:\dev\workspaces
```

## 📁 What Gets Installed

The installation process:

1. **Creates workspace directory structure**:

   ```
   workspaces/
   ├── SHARED_INSTRUCTIONS/
   │   └── GLOBAL.md          # Default global instructions
   └── (your workspaces will be created here)
   ```

2. **Configures Claude Desktop**:
   - Adds MCP server to Claude's configuration
   - Sets up environment variables
   - Preserves existing Claude config

3. **Validates installation**:
   - Checks for MCP server binary
   - Verifies Node.js compatibility
   - Tests file permissions

## ✅ Post-Installation Verification

### 1. Restart Claude Desktop

**Important**: You must restart Claude Desktop completely after installation.

### 2. Check for Resources

In Claude Desktop, look for these resources in the sidebar:

- 🌍 **Global Instructions** (should appear automatically)

### 3. Test MCP Tools

Try using these tools in Claude:

```
list_workspaces
```

### 4. Verify Configuration

Check that your Claude config was updated:

**macOS/Linux**:

```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
# or
cat ~/.config/Claude/claude_desktop_config.json
```

**Windows**:

```powershell
type %APPDATA%\Claude\claude_desktop_config.json
```

Should contain something like:

```json
{
  "mcpServers": {
    "workspaces-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "WORKSPACES_ROOT": "/path/to/your/workspaces"
      }
    }
  }
}
```

## 🐛 Troubleshooting Installation

### Common Issues

#### "MCP server not found" Error

**Problem**: The installer can't find the built MCP server.

**Solution**:

```bash
# Ensure the project is built
npm run build

# Check if MCP server exists
ls packages/mcp-server/dist/index.js

# If not, rebuild
npm run build --workspace=@workspaces-mcp/server
```

#### Permission Denied Errors

**Problem**: Can't write to Claude config directory.

**Solutions**:

**macOS/Linux**:

```bash
# Fix Claude config directory permissions
chmod 755 ~/Library/Application\ Support/Claude/
# or
chmod 755 ~/.config/Claude/

# Run with sudo if needed (not recommended)
sudo node packages/dxt-workspaces/dist/index.js install
```

**Windows**:

- Run Command Prompt as Administrator
- Or check antivirus software blocking file writes

#### Claude Desktop Not Showing Resources

**Problem**: Resources don't appear after installation.

**Solutions**:

1. **Restart Claude Desktop completely** (not just refresh)
2. Check Claude Desktop logs for MCP connection errors
3. Verify MCP server is executable:
   ```bash
   node packages/mcp-server/dist/index.js
   ```
4. Check Node.js version: `node --version` (must be ≥18.0.0)

#### Node.js Version Issues

**Problem**: "Unsupported Node.js version" or module errors.

**Solution**:

```bash
# Check Node.js version
node --version

# If too old, update Node.js from nodejs.org
# Or use version manager:

# Using nvm (recommended)
nvm install 18
nvm use 18

# Using n
n 18
```

### Workspace Directory Issues

#### Can't Create Workspace Directory

**Problem**: Permission denied creating workspace directory.

**Solution**:

```bash
# Create directory manually with correct permissions
mkdir -p ~/Documents/workspaces
chmod 755 ~/Documents/workspaces

# Or choose different location
node packages/dxt-workspaces/dist/index.js install --path ~/my-workspaces
```

#### Workspace Not Loading in Claude

**Problem**: Workspace directory exists but Claude doesn't see resources.

**Solution**:

1. Check `WORKSPACES_ROOT` in Claude config
2. Verify workspace has proper structure
3. Test MCP server directly:
   ```bash
   WORKSPACES_ROOT=/path/to/workspaces node packages/mcp-server/dist/index.js
   ```

## 🔄 Reinstallation

### Clean Reinstall

To completely reinstall Workspaces MCP:

```bash
# 1. Remove from Claude config (optional - installer will overwrite)
# Edit claude_desktop_config.json and remove workspaces-mcp entry

# 2. Remove workspace directory (optional - keeps your data)
rm -rf ~/Documents/workspaces

# 3. Reinstall
node packages/dxt-workspaces/dist/index.js install
```

### Update Installation

To update to a new version:

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Rebuild
npm run build

# 4. Reinstall (will update configuration)
node packages/dxt-workspaces/dist/index.js install
```

## 🛠️ Development Installation

For developers wanting to modify Workspaces MCP:

```bash
# 1. Fork and clone
git clone https://github.com/your-username/workspaces-mcp.git
cd workspaces-mcp

# 2. Install development dependencies
npm install

# 3. Build in development mode
npm run dev

# 4. Install with local changes
node packages/dxt-workspaces/dist/index.js install

# 5. Test changes
npm test
```

## 📞 Getting Help

If you encounter issues not covered here:

1. **Check the logs**: MCP server logs appear in Claude Desktop console
2. **Search existing issues**: [GitHub Issues](https://github.com/your-org/workspaces-mcp/issues)
3. **Create new issue**: Include:
   - Operating system and version
   - Node.js version (`node --version`)
   - Complete error message
   - Steps to reproduce
4. **Join discussions**: [GitHub Discussions](https://github.com/your-org/workspaces-mcp/discussions)

---

**Next Steps**: After successful installation, see the [Usage Guide](USAGE.md) to start creating workspaces and managing your development context.
