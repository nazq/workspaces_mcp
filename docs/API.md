# 🔌 API Reference

Complete reference for all Workspaces MCP tools, resources, and configuration options.

## 🛠️ MCP Tools

### `create_workspace`

Creates a new workspace for organizing project files.

#### Parameters

| Parameter     | Type     | Required | Description                                              |
| ------------- | -------- | -------- | -------------------------------------------------------- |
| `name`        | `string` | ✅       | Workspace name (alphanumeric, hyphens, underscores only) |
| `description` | `string` | ❌       | Optional description of the workspace                    |
| `template`    | `string` | ❌       | Template to use (see [Templates](#templates))            |

#### Examples

```javascript
// Basic workspace
create_workspace name="my-project"

// With description
create_workspace name="todo-app" description="Simple todo application"

// With template
create_workspace name="api-server" template="node-api" description="REST API server"
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Created workspace \"my-project\" successfully!\n\nWorkspace details:\n{\n  \"name\": \"my-project\",\n  \"path\": \"/path/to/workspaces/my-project\",\n  \"createdAt\": \"2024-01-01T00:00:00.000Z\",\n  \"updatedAt\": \"2024-01-01T00:00:00.000Z\",\n  \"files\": [\"README.md\"]\n}"
    }
  ]
}
```

#### Errors

- **Invalid workspace name**: Names must be alphanumeric with hyphens/underscores only
- **Workspace already exists**: Cannot create workspace with duplicate name
- **Permission denied**: Insufficient permissions to create directory

---

### `list_workspaces`

Lists all available workspaces with their metadata.

#### Parameters

_No parameters required._

#### Examples

```javascript
list_workspaces;
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "🏠 **Available Workspaces (3):**\n\n📁 **my-project** - 5 files\n📁 **todo-app** - 12 files - Simple todo application\n📁 **api-server** - 8 files - REST API server"
    }
  ]
}
```

#### Empty Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "📁 No workspaces found. Create your first workspace with the `create_workspace` tool!"
    }
  ]
}
```

---

### `get_workspace_info`

Gets detailed information about a specific workspace.

#### Parameters

| Parameter | Type     | Required | Description                      |
| --------- | -------- | -------- | -------------------------------- |
| `name`    | `string` | ✅       | Name of the workspace to inspect |

#### Examples

```javascript
get_workspace_info name="my-project"
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "📁 **Workspace: my-project**\n\n{\n  \"name\": \"my-project\",\n  \"path\": \"/path/to/workspaces/my-project\",\n  \"createdAt\": \"2024-01-01T00:00:00.000Z\",\n  \"updatedAt\": \"2024-01-15T10:30:00.000Z\",\n  \"files\": [\"README.md\", \"src/index.js\", \"package.json\", \"tests/test.js\"]\n}"
    }
  ]
}
```

#### Errors

- **Workspace not found**: No workspace exists with the specified name

---

### `create_shared_instruction`

Creates a new shared instruction file for reuse across projects.

#### Parameters

| Parameter     | Type     | Required | Description                                                       |
| ------------- | -------- | -------- | ----------------------------------------------------------------- |
| `name`        | `string` | ✅       | Name of the instruction (alphanumeric, hyphens, underscores only) |
| `content`     | `string` | ✅       | Content of the instruction file in Markdown format                |
| `description` | `string` | ❌       | Optional description of the instruction                           |

#### Examples

```javascript
// Basic shared instruction
create_shared_instruction;
name = 'coding-standards';
content =
  '# Coding Standards\n\n- Use TypeScript\n- Write tests\n- Document functions';

// With description
create_shared_instruction;
name = 'react-patterns';
content =
  '# React Patterns\n\n## Hooks\n- Use custom hooks for logic\n- Avoid prop drilling\n\n## Components\n- Keep components small\n- Use TypeScript interfaces';
description = 'Common React development patterns';
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Created shared instruction \"coding-standards\" successfully!\n\nThe instruction will now be available as a resource for loading into future sessions."
    }
  ]
}
```

#### Errors

- **Invalid instruction name**: Cannot use "GLOBAL" as name, must be alphanumeric
- **Content too large**: Content must be under 100KB
- **Permission denied**: Cannot write to shared instructions directory

---

### `update_global_instructions`

Updates the global instructions that load automatically in every session.

#### Parameters

| Parameter | Type     | Required | Description                                            |
| --------- | -------- | -------- | ------------------------------------------------------ |
| `content` | `string` | ✅       | New content for global instructions in Markdown format |

#### Examples

```javascript
update_global_instructions content="# My Global Instructions

## Coding Preferences
- Always use TypeScript
- Prefer functional programming
- Write comprehensive tests

## Code Style
- Use 2-space indentation
- Prefer const over let
- Use meaningful variable names

## Documentation
- Comment complex logic
- Keep README files updated
- Write API documentation"
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Updated global instructions successfully!\n\nThe new instructions will be available in the \"🌍 Global Instructions\" resource for automatic loading."
    }
  ]
}
```

#### Errors

- **Content too large**: Global instructions must be under 100KB
- **Permission denied**: Cannot write to global instructions file

---

### `list_shared_instructions`

Lists all shared instruction files.

#### Parameters

_No parameters required._

#### Examples

```javascript
list_shared_instructions;
```

#### Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "📚 **Shared Instructions (4):**\n\n📋 **coding-standards** - Updated 1/15/2024\n📋 **react-patterns** - Updated 1/10/2024\n📋 **api-guidelines** - Updated 1/5/2024\n📋 **testing-strategy** - Updated 1/1/2024"
    }
  ]
}
```

#### Empty Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 No shared instructions found. Create your first shared instruction with the `create_shared_instruction` tool!"
    }
  ]
}
```

---

## 📄 MCP Resources

Resources appear automatically in Claude Desktop's sidebar and can be loaded to provide context.

### Global Instructions

**URI**: `file://shared/GLOBAL.md`  
**Name**: 🌍 Global Instructions  
**Description**: Essential global instructions - loads automatically for all sessions  
**MIME Type**: `text/markdown`

**Auto-loads**: Yes - provides consistent context in every Claude session.

### Shared Instructions

**URI Pattern**: `file://shared/{name}.md`  
**Name Pattern**: 📋 {name}  
**Description Pattern**: Shared instructions for {name} projects  
**MIME Type**: `text/markdown`

**Examples**:

- `file://shared/react-typescript.md` → 📋 react-typescript
- `file://shared/python-data.md` → 📋 python-data
- `file://shared/custom-api.md` → 📋 custom-api

### Workspace Resources

**URI Pattern**: `file://workspace/{workspace-name}`  
**Name Pattern**: 📁 {workspace-name}  
**Description**: Workspace metadata and overview  
**MIME Type**: `application/json`

**Content**: JSON object with workspace metadata:

```json
{
  "name": "my-project",
  "path": "/path/to/workspaces/my-project",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "files": ["README.md", "src/index.js", "package.json"]
}
```

### Workspace File Resources

**URI Pattern**: `file://workspace/{workspace-name}/{file-path}`  
**Name Pattern**: 📄 {workspace-name}/{file-path}  
**MIME Type**: Detected based on file extension (`text/markdown`, `text/plain`, etc.)

**Examples**:

- `file://workspace/my-project/README.md` → 📄 my-project/README.md
- `file://workspace/my-project/src/index.js` → 📄 my-project/src/index.js
- `file://workspace/api-server/package.json` → 📄 api-server/package.json

---

## 🎨 Templates

Built-in templates for common project types.

### `react-typescript`

**Name**: React TypeScript Project  
**Description**: Instructions for React projects using TypeScript

**Includes**:

- Functional components with hooks
- TypeScript type definitions
- ESLint and Prettier configuration
- React Testing Library patterns
- Component composition strategies

### `python-data`

**Name**: Python Data Science  
**Description**: Instructions for Python data science projects

**Includes**:

- Virtual environment setup
- Jupyter notebook workflows
- Pandas data manipulation patterns
- Data validation strategies
- Analysis documentation standards

### `node-api`

**Name**: Node.js API  
**Description**: Instructions for Node.js API development

**Includes**:

- Express.js server setup
- RESTful API conventions
- Middleware patterns
- Error handling strategies
- Security best practices

### Custom Templates

Create your own templates with `create_shared_instruction`:

```javascript
create_shared_instruction;
name = 'vue-typescript';
content =
  '# Vue TypeScript Template\n\n## Setup\n- Vue 3 + Composition API\n- TypeScript strict mode\n- Pinia state management\n\n## Patterns\n- Use `<script setup>` syntax\n- Define typed props\n- Implement composables';
```

---

## ⚙️ Configuration

### Environment Variables

| Variable               | Default                  | Description                                               |
| ---------------------- | ------------------------ | --------------------------------------------------------- |
| `WORKSPACES_ROOT`      | `~/Documents/workspaces` | Root directory for workspaces                             |
| `WORKSPACES_LOG_LEVEL` | `info`                   | Logging level (`debug`, `info`, `warn`, `error`, `fatal`) |

#### Examples

```bash
# Custom workspace root
WORKSPACES_ROOT=~/dev/projects

# Debug logging
WORKSPACES_LOG_LEVEL=debug

# Combined
WORKSPACES_ROOT=~/projects WORKSPACES_LOG_LEVEL=warn
```

### Claude Desktop Configuration

Located at platform-specific paths:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Configuration Structure

```json
{
  "mcpServers": {
    "workspaces-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "WORKSPACES_ROOT": "/path/to/workspaces",
        "WORKSPACES_LOG_LEVEL": "info"
      }
    }
  }
}
```

---

## 🔒 Security & Validation

### Path Validation

All file operations include security validation:

- **Path traversal protection**: Prevents `../` directory traversal
- **Absolute path restriction**: Blocks absolute path access outside workspace
- **Workspace isolation**: Each workspace isolated to its directory
- **Safe file extensions**: Only safe file types are served as resources

### Input Validation

- **Workspace names**: Must match `^[a-zA-Z0-9_-]+$` pattern
- **Instruction names**: Same pattern, excluding "GLOBAL" reserved name
- **File content size**: Limited to 100KB for shared instructions
- **Character encoding**: UTF-8 only

### Error Handling

All tools provide consistent error responses:

```json
{
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "Workspace 'invalid-name' does not exist"
  }
}
```

---

## 🏗️ Architecture

### MCP Server Components

- **Resource Handler**: Manages workspace and instruction resources
- **Tool Handler**: Implements MCP tool execution
- **Workspace Service**: Core workspace management logic
- **Instructions Service**: Shared instruction management
- **File System Service**: Safe file operations with validation

### Data Flow

1. **Claude Desktop** → MCP Protocol → **MCP Server**
2. **MCP Server** → Service Layer → **File System**
3. **File System** → Service Layer → **MCP Server**
4. **MCP Server** → MCP Protocol → **Claude Desktop**

### File Structure

```
workspaces-root/
├── SHARED_INSTRUCTIONS/     # Managed by InstructionsService
│   ├── GLOBAL.md            # Auto-loaded global context
│   └── {template}.md        # Shared instruction templates
└── {workspace-name}/        # Managed by WorkspaceService
    ├── README.md            # Auto-created workspace readme
    └── (user files)         # User-managed project files
```

---

## 🧪 Testing & Development

### Running MCP Server Standalone

```bash
# Start MCP server with custom root
WORKSPACES_ROOT=/tmp/test-workspaces node packages/mcp-server/dist/index.js

# With debug logging
WORKSPACES_LOG_LEVEL=debug node packages/mcp-server/dist/index.js
```

### Testing Tools

```bash
# Run MCP protocol tests
npm test

# Test specific tool functionality
npm test -- tools.test.ts

# Test with coverage
npm run test:coverage
```

### Development Mode

```bash
# Development with auto-rebuild
npm run dev

# Watch mode for MCP server
npm run dev:mcp
```

---

## 📈 Performance Considerations

### Resource Loading

- **Lazy loading**: Resources loaded only when requested
- **File size limits**: Large files automatically truncated
- **Caching**: File stats cached to reduce filesystem calls
- **Efficient scanning**: Directory traversal optimized

### Memory Usage

- **Streaming**: Large file operations use streams
- **Bounded operations**: All operations have size/time limits
- **Cleanup**: Temporary resources automatically cleaned up

---

This API reference covers all available tools, resources, and configuration options for Workspaces MCP. For usage examples and workflows, see the [Usage Guide](USAGE.md).
