# 🤝 Contributing to Workspaces MCP

Thank you for considering contributing to Workspaces MCP! This guide will help you get started with development, testing, and submitting contributions.

## 🚀 Quick Start for Contributors

### Prerequisites

- **Node.js** ≥18.0.0
- **Git**
- **Claude Desktop** (for testing)
- **Code editor** (VS Code recommended)

### Development Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/your-username/workspaces-mcp.git
cd workspaces-mcp

# 3. Install dependencies (this also sets up git hooks)
npm install

# 4. Build the project
npm run build

# 5. Run tests
npm test

# 6. Start development mode
npm run dev
```

**Note**: The `npm install` command automatically sets up Husky git hooks for quality assurance. These hooks will run automatically when you commit or push code.

## 🏗️ Project Structure

```
workspaces-mcp/
├── packages/
│   ├── mcp-server/              # MCP protocol server
│   │   ├── src/
│   │   │   ├── server/          # MCP handlers (resources, tools)
│   │   │   ├── services/        # Business logic layer
│   │   │   ├── utils/           # Utilities (logger, validation, etc.)
│   │   │   ├── types/           # TypeScript type definitions
│   │   │   └── tests/           # Test files
│   │   └── dist/                # Built JavaScript
│   └── dxt-workspaces/          # CLI installer
│       ├── src/
│       │   ├── commands/        # CLI command implementations
│       │   ├── index.ts         # CLI entry point
│       │   └── tests/           # CLI tests
│       └── dist/                # Built JavaScript
├── scripts/                     # Build and utility scripts
├── docs/                        # Documentation
└── tests/                       # Integration tests
```

## 🔧 Development Workflow

### Available Scripts

```bash
# Development
npm run dev                      # Watch mode - rebuilds on changes
npm run dev:mcp                  # Watch MCP server only
npm run dev:dxt                  # Watch CLI only

# Building
npm run build                    # Build all packages
npm run clean                    # Clean build artifacts

# Testing
npm test                         # Run all tests
npm run test:coverage            # Run with coverage report
npm run test:ui                  # Interactive test UI
npm run test:integration         # Integration tests

# Code Quality
npm run lint                     # Lint code
npm run lint:fix                 # Fix linting issues
npm run format                   # Format code with Prettier
npm run typecheck                # TypeScript type checking

# CI Pipeline
npm run ci                       # Full CI pipeline (typecheck, lint, test, build)
```

### Development Cycle

1. **Create feature branch**:

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Start development mode**:

   ```bash
   npm run dev
   ```

3. **Make changes** and test automatically with watch mode

4. **Run tests**:

   ```bash
   npm test
   ```

5. **Lint and format**:

   ```bash
   npm run lint:fix
   npm run format
   ```

6. **Test your changes** with the CLI:
   ```bash
   node packages/dxt-workspaces/dist/index.js install --path /tmp/test
   ```

## 🧪 Testing Guidelines

### Test Structure

We use **Vitest** for testing with comprehensive coverage:

```bash
# Run specific test files
npm test -- workspace.test.ts

# Run tests matching pattern
npm test -- --grep="workspace creation"

# Run tests with coverage
npm run test:coverage
```

### Test Categories

1. **Unit Tests** (`src/tests/`) - Test individual functions and classes
2. **Integration Tests** - Test MCP protocol integration
3. **CLI Tests** - Test command-line interface
4. **Security Tests** - Test path validation and security

### Writing Tests

Example test structure:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { WorkspaceService } from '../services/workspace.js';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceService;
  let tempDir: string;

  beforeEach(async () => {
    // Setup test environment
    tempDir = await fs.mkdtemp(path.join(process.cwd(), 'test-'));
    workspaceService = new WorkspaceService(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(tempDir);
  });

  describe('createWorkspace', () => {
    it('should create workspace successfully', async () => {
      const workspace = await workspaceService.createWorkspace('test');

      expect(workspace.name).toBe('test');
      expect(workspace.files).toContain('README.md');
    });

    it('should handle invalid names', async () => {
      await expect(
        workspaceService.createWorkspace('invalid name')
      ).rejects.toThrow();
    });
  });
});
```

### Test Coverage Standards

- **Minimum coverage**: 90% for statements, branches, functions, lines
- **Critical paths**: 100% coverage for security-related code
- **Error handling**: All error paths must be tested

## 📝 Code Standards

### TypeScript Guidelines

- **Strict mode**: Always enabled
- **Explicit types**: Prefer explicit over inferred types for public APIs
- **No `any`**: Use proper typing instead of `any`
- **Interfaces**: Use interfaces for object shapes

```typescript
// Good
interface WorkspaceCreateOptions {
  name: string;
  description?: string;
  template?: string;
}

async function createWorkspace(
  options: WorkspaceCreateOptions
): Promise<Workspace> {
  // Implementation
}

// Bad
async function createWorkspace(options: any): Promise<any> {
  // Implementation
}
```

### Code Style

We use **ESLint** and **Prettier** with these key rules:

- **2 spaces** for indentation
- **Single quotes** for strings
- **Semicolons** required
- **Trailing commas** in multiline structures
- **Arrow functions** preferred for callbacks

### Error Handling

- **Custom error classes** for different error types
- **Meaningful error messages** with context
- **Proper error propagation** through service layers

```typescript
// Good
class WorkspaceNotFoundError extends Error {
  constructor(name: string) {
    super(`Workspace '${name}' not found`);
    this.name = 'WorkspaceNotFoundError';
  }
}

if (!workspace) {
  throw new WorkspaceNotFoundError(name);
}

// Bad
if (!workspace) {
  throw new Error('Not found');
}
```

## 🎯 Contribution Areas

### High-Impact Areas

1. **MCP Protocol Enhancement**
   - New tool implementations
   - Resource optimization
   - Protocol compliance

2. **CLI Improvements**
   - Additional commands
   - Better error handling
   - Cross-platform compatibility

3. **Template System**
   - New project templates
   - Template customization
   - Template sharing

4. **Developer Experience**
   - Better debugging tools
   - Improved logging
   - Development utilities

### Good First Issues

Look for issues labeled:

- `good first issue` - Perfect for newcomers
- `help wanted` - Community contributions welcome
- `documentation` - Documentation improvements
- `testing` - Test coverage improvements

## 📋 Submission Process

### Before Submitting

1. **Run the full test suite**: `npm run ci`
2. **Test manually** with real Claude Desktop
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Follow commit message conventions**

### Pre-commit Hooks

We use Husky for automated quality checks:

- **Pre-commit**: Runs TypeScript check, linting, formatting, and tests
- **Pre-push**: Runs full CI pipeline (typecheck, lint, test, build)
- **Commit-msg**: Validates conventional commit message format

The hooks will automatically run when you commit/push. If any check fails, the commit/push will be blocked until you fix the issues.

### Commit Message Format

We use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

Examples:

```bash
git commit -m "feat(tools): add delete_workspace tool"
git commit -m "fix(cli): resolve path resolution on Windows"
git commit -m "docs(api): update MCP tools documentation"
git commit -m "test(workspace): add edge case tests for workspace creation"
```

### Pull Request Process

1. **Create descriptive PR title**:

   ```
   feat(workspace): Add workspace templates and auto-initialization
   ```

2. **Fill out PR template** completely

3. **Link related issues**: `Fixes #123` or `Closes #456`

4. **Request reviews** from maintainers

5. **Address feedback** promptly

6. **Ensure CI passes** before requesting final review

### PR Description Template

```markdown
## Description

Brief description of changes and motivation.

## Changes

- List specific changes made
- Include any breaking changes
- Note new dependencies

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] CLI tested on multiple platforms

## Documentation

- [ ] README updated if needed
- [ ] API docs updated
- [ ] Inline code comments added

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added for new functionality
- [ ] All tests pass
- [ ] Documentation updated
```

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Try latest version** to see if already fixed
3. **Reproduce consistently** with minimal example
4. **Check logs** for error details

### Bug Report Template

```markdown
## Bug Description

Clear description of the bug and expected behavior.

## Reproduction Steps

1. Step one
2. Step two
3. Step three

## Environment

- OS: macOS 14.0 / Windows 11 / Ubuntu 22.04
- Node.js: v18.17.0
- Claude Desktop: v1.2.3
- Workspaces MCP: v1.0.0

## Logs
```

Paste relevant logs here

```

## Additional Context
Any other context about the problem.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Problem Description

What problem does this feature solve?

## Proposed Solution

Describe your proposed solution.

## Alternatives Considered

What alternatives did you consider?

## Implementation Ideas

Any thoughts on implementation approach?

## Use Cases

Who would benefit from this feature?
```

## 🏆 Recognition

Contributors are recognized in:

- **README.md** contributor section
- **CHANGELOG.md** for significant contributions
- **GitHub** contributor graphs and stats
- **Releases** mention notable contributors

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/workspaces-mcp)
- **GitHub Discussions**: [Ask questions](https://github.com/your-org/workspaces-mcp/discussions)
- **Email**: dev@workspaces-mcp.dev

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

### Summary

- **Be respectful** and inclusive
- **Collaborate constructively** with others
- **Focus on the project** goals and community benefit
- **Welcome newcomers** and help them learn

## 🎉 Thank You!

Thank you for contributing to Workspaces MCP! Your contributions help make Claude Desktop more powerful for developers worldwide.

---

**Happy coding!** 🚀
