# Workspaces CLI

Command-line interface for testing and debugging workspace operations directly.

## Installation

After building the project, the CLI is available as:

```bash
node dist/bin/cli.js [command] [options]
```

Or if installed globally:

```bash
workspaces-cli [command] [options]
```

## Commands

### `list` - List all workspaces

```bash
workspaces-cli list [--verbose|-v]
```

Options:

- `--verbose, -v`: Show detailed information including creation dates and instruction status

### `create` - Create a new workspace

```bash
workspaces-cli create <name> [--description|-d <desc>] [--with-instructions|-i]
```

Options:

- `--description, -d <desc>`: Add a description to the workspace
- `--with-instructions, -i`: Initialize with INSTRUCTIONS.md template

### `delete` - Delete a workspace

```bash
workspaces-cli delete <name> [--force|-f]
```

Options:

- `--force, -f`: Confirm deletion (required for safety)

### `info` - Show workspace information

```bash
workspaces-cli info <name> [--json]
```

Options:

- `--json`: Output information in JSON format

### `test-tools` - Test MCP tool functionality

```bash
workspaces-cli test-tools [tool-name] [--list] [--verbose|-v]
```

Options:

- `--list`: List all available tools
- `--verbose, -v`: Show detailed tool information including schemas
- `tool-name`: Test a specific tool (limited support)

### `help` - Show help information

```bash
workspaces-cli help [command]
```

## Global Options

- `--verbose, -v`: Enable verbose output
- `--help, -h`: Show help information

## Environment Variables

- `WORKSPACES_ROOT`: Override default workspaces directory (default: `/tmp/test-workspaces`)

## Examples

```bash
# List all workspaces with details
workspaces-cli list --verbose

# Create a new workspace with description
workspaces-cli create my-project -d "My awesome project"

# Show detailed information about a workspace
workspaces-cli info my-project

# List all available MCP tools
workspaces-cli test-tools --list

# Get help for a specific command
workspaces-cli help create

# Delete a workspace (must use --force for safety)
workspaces-cli delete my-project --force
```

## Architecture

The CLI layer integrates directly with the 5-layer MCP architecture:

- **Transport Layer**: Not used (direct service calls)
- **Protocol Layer**: Not used (direct service calls)
- **Controllers Layer**: Not used (direct service calls)
- **Services Layer**: Direct integration with ToolService for testing
- **Data Layer**: Direct integration with WorkspaceRepository for operations

This design allows for comprehensive testing and debugging of the workspace operations without going through the full MCP protocol stack.
