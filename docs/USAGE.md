# 📚 Usage Guide

Complete guide to using Workspaces MCP for maximum productivity with Claude Desktop.

## 🏁 Getting Started

After [installation](INSTALLATION.md), you'll have access to powerful workspace management tools directly in Claude Desktop.

### First Steps

1. **Restart Claude Desktop** (required after installation)
2. **Look for resources** in the sidebar - you should see "🌍 Global Instructions"
3. **Click to load** your global context automatically
4. **Start using MCP tools** by typing commands like `create_workspace`

## 🌍 Global Instructions

Your global instructions automatically load in every Claude session, providing consistent context and preferences.

### Editing Global Instructions

**Location**: `~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md`

```bash
# Open in your favorite editor
code ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
vim ~/Documents/workspaces/SHARED_INSTRUCTIONS/GLOBAL.md
```

### Example Global Instructions

```markdown
# Global Instructions

## My Coding Preferences

- Always use TypeScript for new projects
- Follow functional programming patterns
- Write comprehensive tests for all features
- Use meaningful variable and function names

## Code Style

- 2 spaces for indentation
- Use const/let instead of var
- Prefer arrow functions for callbacks
- Always handle errors explicitly

## Documentation Standards

- Write clear, concise comments
- Include usage examples in README files
- Document all public APIs
- Keep changelogs updated
```

### Auto-Loading in Claude

Once configured, Claude will automatically:

- Load your global instructions at the start of every session
- Apply your preferences to all coding tasks
- Remember your standards across different projects

## 📁 Workspace Management

Workspaces help you organize projects and provide focused context for Claude.

### Available MCP Tools

Use these tools directly in Claude Desktop:

#### `create_workspace`

Creates a new workspace for organizing project files.

```
create_workspace name="my-react-app" description="New React TypeScript project" template="react-typescript"
```

**Parameters**:

- `name` (required): Workspace name (alphanumeric, hyphens, underscores only)
- `description` (optional): Description of the workspace
- `template` (optional): Template to use (`react-typescript`, `python-data`, `node-api`)

#### `list_workspaces`

Lists all available workspaces.

```
list_workspaces
```

**Output**: Shows workspace names, file counts, and descriptions.

#### `get_workspace_info`

Gets detailed information about a specific workspace.

```
get_workspace_info name="my-react-app"
```

**Output**: Complete workspace metadata including files, creation date, etc.

#### `create_shared_instruction`

Creates reusable instruction templates.

```
create_shared_instruction name="api-standards" content="# API Development Standards

## REST API Guidelines
- Use semantic HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Include proper error messages
- Version your APIs (/v1/, /v2/)

## Authentication
- Use JWT tokens for stateless auth
- Implement proper session management
- Always validate permissions" description="Standards for API development"
```

#### `update_global_instructions`

Updates global instructions that load automatically.

```
update_global_instructions content="# Updated Global Instructions

## New Coding Standards
- Use ESLint and Prettier
- Write unit tests first (TDD)
- Document all functions"
```

#### `list_shared_instructions`

Lists all shared instruction templates.

```
list_shared_instructions
```

## 🏗️ Workspace Structure

Understanding the workspace directory structure:

```
~/Documents/workspaces/
├── SHARED_INSTRUCTIONS/           # Shared templates and global config
│   ├── GLOBAL.md                 # Auto-loads in every session
│   ├── react-typescript.md       # Shared template
│   ├── python-data.md            # Another shared template
│   └── api-standards.md          # Your custom template
├── my-react-app/                 # Individual workspace
│   ├── README.md                 # Project documentation
│   ├── package.json              # Project config
│   ├── src/                      # Source code
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── tests/                    # Test files
├── data-analysis-project/        # Another workspace
│   ├── analysis.py
│   ├── data.csv
│   ├── results/
│   └── README.md
└── api-backend/                  # API workspace
    ├── src/
    ├── tests/
    ├── docs/
    └── package.json
```

## 🎯 Workflow Examples

### Example 1: React TypeScript Project

1. **Create workspace**:

   ```
   create_workspace name="todo-app" description="React TypeScript todo application" template="react-typescript"
   ```

2. **Navigate to workspace** (in file system):

   ```bash
   cd ~/Documents/workspaces/todo-app
   ```

3. **Add project files** and work on your project

4. **In Claude**, the workspace automatically appears as resources:
   - 📁 **todo-app** (workspace overview)
   - 📄 **todo-app/README.md** (individual files)
   - 📄 **todo-app/package.json**
   - 📋 **react-typescript** (shared template)

### Example 2: Data Science Workflow

1. **Create data workspace**:

   ```
   create_workspace name="sales-analysis" description="Q4 sales data analysis" template="python-data"
   ```

2. **Load shared template**:
   - Click on 📋 **python-data** resource to load data science best practices

3. **Load workspace context**:
   - Click on 📁 **sales-analysis** to see project structure
   - Click on specific files to load their content

### Example 3: API Development

1. **Create API workspace**:

   ```
   create_workspace name="user-api" template="node-api"
   ```

2. **Create custom API standards**:

   ```
   create_shared_instruction name="our-api-standards" content="# Our API Standards

   ## Response Format
   - Always return JSON
   - Include status field
   - Consistent error format

   ## Security
   - API key authentication
   - Rate limiting
   - Input validation"
   ```

3. **Load context** as you work on API endpoints

## 🎨 Custom Templates

Create your own instruction templates for recurring project patterns.

### Creating Custom Templates

```
create_shared_instruction name="vue-typescript" content="# Vue TypeScript Project

## Project Setup
- Use Vue 3 with Composition API
- Implement TypeScript strict mode
- Use Pinia for state management
- Follow Vue style guide

## Component Structure
- Use `<script setup>` syntax
- Define props with TypeScript interfaces
- Implement proper event emissions
- Use composables for reusable logic

## Testing Strategy
- Unit tests with Vitest
- Component testing with Vue Test Utils
- E2E tests with Playwright" description="Standards for Vue TypeScript projects"
```

### Using Custom Templates

```
create_workspace name="my-vue-app" template="vue-typescript"
```

## 🔄 Resource Loading Workflow

Understanding how Claude loads your workspace context:

### Automatic Loading

- **🌍 Global Instructions** - Loads automatically in every session
- Provides consistent context and preferences

### Manual Loading

- **📁 Workspace Resources** - Click to load project overview
- **📄 File Resources** - Click to load specific file content
- **📋 Shared Templates** - Click to load template instructions

### Best Practices

1. **Start with global context** - Always loads automatically
2. **Load workspace overview** first for project structure
3. **Load specific files** as needed for focused work
4. **Use shared templates** to maintain consistency
5. **Keep workspaces organized** with clear naming and structure

## 🛠️ Advanced Usage

### Environment Variables

Configure workspace behavior with environment variables:

```bash
# Custom workspace root
export WORKSPACES_ROOT=~/dev/projects

# Enable debug logging
export WORKSPACES_LOG_LEVEL=debug
```

### Multiple Workspace Roots

You can have multiple workspace installations for different purposes:

```bash
# Development workspaces
node packages/dxt-workspaces/dist/index.js install --path ~/dev/workspaces

# Personal projects
node packages/dxt-workspaces/dist/index.js install --path ~/personal/workspaces

# Client work
node packages/dxt-workspaces/dist/index.js install --path ~/clients/workspaces
```

### Integration with Git

Workspaces work great with Git repositories:

```bash
# Create workspace for existing repo
create_workspace name="existing-project"
cd ~/Documents/workspaces/existing-project

# Clone your repo here
git clone https://github.com/user/repo.git .

# Or initialize new repo
git init
```

### Workspace Maintenance

Regular maintenance tasks:

```bash
# List all workspaces to review
list_workspaces

# Check specific workspace details
get_workspace_info name="old-project"

# Archive unused workspaces (manual)
mv ~/Documents/workspaces/old-project ~/Documents/archived-workspaces/
```

## 💡 Tips & Best Practices

### Workspace Organization

1. **Use descriptive names**: `user-auth-api` instead of `project1`
2. **Group related workspaces**: Use prefixes like `client-acme-*`
3. **Keep workspaces focused**: One workspace per project/feature
4. **Regular cleanup**: Archive completed projects

### Global Instructions

1. **Keep them concise**: Focus on most important preferences
2. **Update regularly**: Refine based on your workflow changes
3. **Include examples**: Show Claude exactly what you want
4. **Version control**: Keep backups of your global instructions

### Shared Templates

1. **Create templates for common patterns**: React, Python, API, etc.
2. **Keep templates specific**: Don't try to cover everything in one template
3. **Share with team**: Export and share effective templates
4. **Iterate and improve**: Refine templates based on actual usage

### Resource Loading Strategy

1. **Always start with global context** (automatic)
2. **Load workspace overview** for project understanding
3. **Load specific files** only when needed
4. **Use shared templates** for consistent patterns
5. **Reload resources** when files change significantly

## 🐛 Troubleshooting Usage

### Common Issues

**Resources not appearing in Claude**:

- Restart Claude Desktop completely
- Check workspace directory exists and has files
- Verify MCP server is running (check Claude Desktop logs)

**Workspace tools not working**:

- Ensure MCP server connection is active
- Check workspace names don't have spaces or special characters
- Verify permissions on workspace directory

**Global instructions not loading**:

- Check `GLOBAL.md` exists in `SHARED_INSTRUCTIONS/`
- Restart Claude Desktop after editing
- Verify file permissions are readable

### Getting More Help

- 📖 [API Reference](API.md) - Detailed MCP tool documentation
- 🐛 [Issues](https://github.com/your-org/workspaces-mcp/issues) - Report bugs
- 💬 [Discussions](https://github.com/your-org/workspaces-mcp/discussions) - Ask questions

---

**Next**: Explore the [API Reference](API.md) for detailed documentation of all MCP tools and capabilities.
