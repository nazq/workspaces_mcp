# 🛠️ Troubleshooting Guide

Complete troubleshooting guide for common Workspaces MCP issues with solutions and prevention tips.

## 🚨 Quick Diagnostics

### Check System Status

Run these commands to quickly diagnose issues:

```bash
# 1. Check Node.js version (must be ≥18.0.0)
node --version

# 2. Check if MCP server exists and is executable
ls -la packages/mcp-server/dist/index.js
node packages/mcp-server/dist/index.js --version

# 3. Check workspace directory
ls -la ~/Documents/workspaces/

# 4. Check Claude Desktop configuration
cat ~/.config/Claude/claude_desktop_config.json
# macOS: cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
# Windows: type %APPDATA%\Claude\claude_desktop_config.json
```

## 📦 Installation Issues

### "MCP server not found" Error

**Symptoms**:

```
❌ Installation failed
MCP server not found at /path/to/mcp-server/dist/index.js. Please build the project first with 'npm run build'.
```

**Causes & Solutions**:

1. **Project not built**:

   ```bash
   # Build the entire project
   npm run build

   # Or build just the MCP server
   npm run build --workspace=@workspaces-mcp/server
   ```

2. **Wrong working directory**:

   ```bash
   # Make sure you're in the project root
   cd workspaces-mcp
   ls -la packages/  # Should show mcp-server and dxt-workspaces
   ```

3. **Build failed silently**:

   ```bash
   # Check for TypeScript errors
   npm run typecheck

   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

### Permission Denied During Installation

**Symptoms**:

```
❌ Installation failed
EACCES: permission denied, mkdir '/path/to/workspaces'
```

**Solutions**:

1. **Fix directory permissions**:

   ```bash
   # Create directory with proper permissions
   mkdir -p ~/Documents/workspaces
   chmod 755 ~/Documents/workspaces
   ```

2. **Use custom path with writable location**:

   ```bash
   node packages/dxt-workspaces/dist/index.js install --path ~/my-workspaces
   ```

3. **Fix Claude config directory permissions**:

   ```bash
   # macOS
   chmod 755 ~/Library/Application\ Support/Claude/

   # Linux
   chmod 755 ~/.config/Claude/

   # Windows (run as Administrator)
   icacls %APPDATA%\Claude /grant %USERNAME%:F
   ```

### Can't Write Claude Configuration

**Symptoms**:

```
❌ Installation failed
EACCES: permission denied, open '/path/to/claude_desktop_config.json'
```

**Solutions**:

1. **Create Claude config directory**:

   ```bash
   # macOS
   mkdir -p ~/Library/Application\ Support/Claude/

   # Linux
   mkdir -p ~/.config/Claude/

   # Windows
   mkdir %APPDATA%\Claude
   ```

2. **Check Claude Desktop is not running**:
   - Completely quit Claude Desktop before installation
   - Check task manager/activity monitor for Claude processes

3. **Run with elevated permissions** (last resort):

   ```bash
   # macOS/Linux (not recommended)
   sudo node packages/dxt-workspaces/dist/index.js install

   # Windows - run Command Prompt as Administrator
   node packages/dxt-workspaces/dist/index.js install
   ```

## 🖥️ Claude Desktop Integration Issues

### Resources Not Appearing

**Symptoms**:

- No "🌍 Global Instructions" resource in Claude Desktop
- Workspace resources missing
- MCP tools not available

**Solutions**:

1. **Restart Claude Desktop completely**:
   - Quit Claude Desktop entirely (not just close window)
   - Wait 5 seconds
   - Reopen Claude Desktop
   - Check resources sidebar

2. **Verify MCP server connection**:

   ```bash
   # Test MCP server directly
   echo '{"method":"resources/list","id":1}' | node packages/mcp-server/dist/index.js
   ```

3. **Check Claude configuration**:

   ```bash
   # Verify configuration exists and is valid JSON
   cat ~/.config/Claude/claude_desktop_config.json | jq .
   ```

4. **Check MCP server path in config**:
   ```json
   {
     "mcpServers": {
       "workspaces-mcp": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server/dist/index.js"],
         "env": {
           "WORKSPACES_ROOT": "/absolute/path/to/workspaces"
         }
       }
     }
   }
   ```

### "Unknown tool" Errors in Claude

**Symptoms**:

```
Error: Unknown tool: create_workspace
```

**Solutions**:

1. **Verify MCP server is connected**:
   - Check Claude Desktop shows MCP connection status
   - Look for connection indicators in Claude interface

2. **Check tool availability**:

   ```bash
   # List available tools
   echo '{"method":"tools/list","id":1}' | node packages/mcp-server/dist/index.js
   ```

3. **Restart Claude Desktop after configuration changes**

4. **Check logs** in Claude Desktop console for MCP errors

### Resource Loading Fails

**Symptoms**:

- Resources appear but can't be loaded
- "Failed to load resource" errors
- Empty resource content

**Solutions**:

1. **Check file permissions**:

   ```bash
   # Ensure workspace files are readable
   chmod -R 644 ~/Documents/workspaces/
   chmod 755 ~/Documents/workspaces/
   chmod 755 ~/Documents/workspaces/*/
   ```

2. **Verify file exists**:

   ```bash
   # Check global instructions exist
   ls -la ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
   ```

3. **Check file content encoding**:

   ```bash
   # Ensure UTF-8 encoding
   file ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
   ```

4. **Test resource reading**:
   ```bash
   # Test resource access directly
   WORKSPACES_ROOT=~/Documents/workspaces node -e "
     console.log(require('fs').readFileSync('~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md', 'utf8'))
   "
   ```

## 🔧 MCP Server Issues

### Server Won't Start

**Symptoms**:

```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Solutions**:

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Check Node.js version**:

   ```bash
   node --version  # Must be ≥18.0.0
   ```

3. **Rebuild project**:
   ```bash
   npm run clean
   npm install
   npm run build
   ```

### Module Resolution Errors

**Symptoms**:

```
Error: Cannot resolve module './config/constants.js'
```

**Solutions**:

1. **Check TypeScript compilation**:

   ```bash
   npm run typecheck
   ```

2. **Verify build output**:

   ```bash
   ls -la packages/mcp-server/dist/
   ```

3. **Check import paths** use `.js` extensions:

   ```typescript
   // Correct
   import { constant } from './config/constants.js';

   // Incorrect
   import { constant } from './config/constants';
   ```

### Environment Variable Issues

**Symptoms**:

- Wrong workspace directory used
- Logging not working as expected

**Solutions**:

1. **Check environment variables**:

   ```bash
   # In MCP server config
   echo $WORKSPACES_ROOT
   echo $WORKSPACES_LOG_LEVEL
   ```

2. **Set environment variables explicitly**:

   ```bash
   WORKSPACES_ROOT=/custom/path node packages/mcp-server/dist/index.js
   ```

3. **Update Claude config** with correct environment:
   ```json
   {
     "mcpServers": {
       "workspaces-mcp": {
         "env": {
           "WORKSPACES_ROOT": "/correct/absolute/path",
           "WORKSPACES_LOG_LEVEL": "debug"
         }
       }
     }
   }
   ```

## 📁 Workspace Issues

### Can't Create Workspaces

**Symptoms**:

```
Error: EACCES: permission denied, mkdir '/path/to/workspaces/new-workspace'
```

**Solutions**:

1. **Fix workspace root permissions**:

   ```bash
   chmod 755 ~/Documents/workspaces/
   ```

2. **Check disk space**:

   ```bash
   df -h ~/Documents/workspaces/
   ```

3. **Verify workspace name is valid**:
   - Only alphanumeric, hyphens, and underscores
   - No spaces or special characters
   - Not empty

### Workspace Files Not Showing

**Symptoms**:

- Workspace created but files not visible in Claude
- Empty workspace resources

**Solutions**:

1. **Check workspace structure**:

   ```bash
   ls -la ~/Documents/workspaces/workspace-name/
   ```

2. **Verify README.md was created**:

   ```bash
   cat ~/Documents/workspaces/workspace-name/README.md
   ```

3. **Check file permissions**:
   ```bash
   chmod 644 ~/Documents/workspaces/workspace-name/*
   ```

### Global Instructions Not Loading

**Symptoms**:

- Global instructions resource appears but doesn't load automatically
- Content appears empty

**Solutions**:

1. **Check file exists and has content**:

   ```bash
   ls -la ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
   cat ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
   ```

2. **Recreate global instructions**:

   ```bash
   node packages/dxt-workspaces/dist/index.js install --path ~/Documents/workspaces
   ```

3. **Verify file encoding**:
   ```bash
   file ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
   # Should show: UTF-8 Unicode text
   ```

## 🖱️ CLI Issues

### Command Not Found

**Symptoms**:

```
command not found: dxt-workspaces
```

**Solutions**:

1. **Use full path to CLI**:

   ```bash
   node packages/dxt-workspaces/dist/index.js install
   ```

2. **Check CLI was built**:

   ```bash
   ls -la packages/dxt-workspaces/dist/index.js
   ```

3. **Create alias** for convenience:
   ```bash
   alias dxt-workspaces="node $(pwd)/packages/dxt-workspaces/dist/index.js"
   ```

### Path Resolution Errors

**Symptoms**:

- CLI can't find MCP server
- Wrong paths in configuration

**Solutions**:

1. **Use absolute paths**:

   ```bash
   cd /absolute/path/to/workspaces-mcp
   node packages/dxt-workspaces/dist/index.js install
   ```

2. **Check working directory**:
   ```bash
   pwd  # Should be in workspaces-mcp root
   ls   # Should see packages/, docs/, etc.
   ```

## 🌐 Platform-Specific Issues

### macOS Issues

**Claude config not found**:

```bash
# Try both locations
ls ~/Library/Application\ Support/Claude/
ls ~/.claude/
```

**Permission issues with Application Support**:

```bash
sudo chown -R $USER ~/Library/Application\ Support/Claude/
```

### Windows Issues

**Path separator issues**:

- Use forward slashes `/` in configuration
- Or escape backslashes: `C:\\Users\\...`

**PowerShell execution policy**:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Antivirus blocking file creation**:

- Temporarily disable real-time protection
- Add workspace directory to exclusions

### Linux Issues

**Snap package Claude Desktop**:

- Config location may differ: `~/snap/claude/current/.config/Claude/`

**WSL (Windows Subsystem for Linux)**:

- Use Windows paths for Claude Desktop config
- Use Linux paths for workspaces

## 📊 Performance Issues

### Slow Resource Loading

**Solutions**:

1. **Reduce workspace size**:
   - Archive old workspaces
   - Remove large binary files

2. **Optimize file structure**:
   - Avoid deeply nested directories
   - Keep workspace files organized

3. **Enable debug logging** to identify bottlenecks:
   ```bash
   WORKSPACES_LOG_LEVEL=debug node packages/mcp-server/dist/index.js
   ```

### High Memory Usage

**Solutions**:

1. **Check for large files**:

   ```bash
   find ~/Documents/workspaces/ -type f -size +10M
   ```

2. **Restart MCP server** periodically:
   - Restart Claude Desktop to reset MCP connections

## 🔍 Advanced Debugging

### Enable Debug Logging

```bash
# Set debug logging in Claude config
{
  "mcpServers": {
    "workspaces-mcp": {
      "env": {
        "WORKSPACES_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Test MCP Protocol Directly

```bash
# Test tool listing
echo '{"method":"tools/list","id":1}' | \
  WORKSPACES_ROOT=~/Documents/workspaces \
  node packages/mcp-server/dist/index.js

# Test resource listing
echo '{"method":"resources/list","id":1}' | \
  WORKSPACES_ROOT=~/Documents/workspaces \
  node packages/mcp-server/dist/index.js
```

### Check Claude Desktop Logs

**macOS**:

```bash
tail -f ~/Library/Logs/Claude/claude.log
```

**Linux**:

```bash
journalctl --user -u claude-desktop -f
```

**Windows**:

- Check Event Viewer for Claude Desktop entries

## 📞 Getting Help

### Before Asking for Help

1. **Search existing issues**: [GitHub Issues](https://github.com/your-org/workspaces-mcp/issues)
2. **Check discussions**: [GitHub Discussions](https://github.com/your-org/workspaces-mcp/discussions)
3. **Try latest version**: Update to latest version
4. **Gather information**:
   - Operating system and version
   - Node.js version (`node --version`)
   - Error messages (complete text)
   - Steps to reproduce

### Create Issue Template

```markdown
## Problem Description

Brief description of the issue.

## Environment

- OS: macOS 14.0 / Windows 11 / Ubuntu 22.04
- Node.js: v18.17.0
- Claude Desktop: v1.2.3
- Workspaces MCP: v1.0.0

## Steps to Reproduce

1. Step one
2. Step two
3. Step three

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Error Messages
```

Paste complete error messages here

```

## Additional Context
Any other relevant information.
```

### Community Support

- **💬 GitHub Discussions**: General questions and community help
- **🐛 GitHub Issues**: Bug reports and feature requests
- **📧 Email**: support@workspaces-mcp.dev
- **🐦 Twitter**: [@WorkspacesMCP](https://twitter.com/WorkspacesMCP)

---

**Still having issues?** Don't hesitate to [create an issue](https://github.com/your-org/workspaces-mcp/issues/new) - we're here to help!
