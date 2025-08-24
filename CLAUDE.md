# Workspaces MCP Development Standards

**Repository**: https://github.com/nazq/workspaces_mcp.git  
**Main Branch**: `main` (production releases)

## Project Overview

A Model Context Protocol (MCP) server providing automatic context loading and workspace management for Claude Desktop with seamless DXT installation.

**⚠️ Architecture Documentation**: Keep `ARCH.md` updated when making structural changes to the codebase. It should reflect the current implementation, not planned features.

## Development Standards & Quality Gates

### Code Quality Requirements

- **TypeScript Strict Mode**: Full type safety
- **ESLint Clean**: Zero linting errors
- **Prettier Formatted**: Consistent code formatting
- **Test Coverage**: 95%+ coverage requirement
- **No TODOs in Main**: Clean production code
- **Documentation Complete**: All public APIs documented

### Git Workflow

- **Feature Branches**: All work in feature branches
- **PR Reviews**: Required code reviews
- **Conventional Commits**: Semantic commit messages
- **CI Passing**: All checks must pass
- **Linear History**: Clean git history

### Node.js Compatibility

- **Minimum Version**: Node.js 20.10+ (dropped 18.x support)
- **Test Matrix**: Node 20, 22, 24
- **Cross-Platform**: Windows, macOS, Linux

### Release Process

1. **Version Bump**: Semantic versioning
2. **Changelog Update**: Auto-generated release notes
3. **Testing**: Full test suite execution
4. **Build Verification**: Clean production build
5. **DXT Package**: Build `.dxt` extension via `dxt pack`
6. **NPM Publishing**: Automated package release
7. **GitHub Release**: Tagged release with assets

### Commands to Remember

```bash
# Core development workflow
npm run ci                    # Full CI pipeline (typecheck, lint, test, build)
npm run dxt:package          # Build + create DXT package
npm run test:coverage        # Test with coverage report

# Quality checks
npm run typecheck            # TypeScript type checking
npm run lint                 # ESLint validation
npm run format               # Prettier formatting

# Local development
npm run dev                  # Development mode
npm test                     # Watch mode testing
```

### Project Structure

- **Unified Package**: Single package structure (not monorepo)
- **Source**: `src/` - All TypeScript source code
- **Binaries**: `dist/bin/` - CLI and server executables
- **Tests**: `src/tests/` - Co-located with source
- **Build Output**: `dist/` - Compiled JavaScript
- **DXT Output**: `*.dxt` files in root for Claude Desktop

### Testing Strategy

- **Unit Tests**: 95%+ coverage using Vitest
- **Integration Tests**: Full MCP protocol testing
- **Error Handling**: Comprehensive error scenario coverage
- **Security Testing**: Path traversal and input validation

### Security Standards

- **Input Validation**: All user inputs sanitized
- **Path Traversal Protection**: File system access validation
- **Dependency Security**: Regular audit scans via `audit-ci`
- **Error Handling**: No sensitive data in error messages

### Performance Requirements

- **Resource Loading**: < 100ms response time
- **Memory Usage**: Efficient resource management
- **File Watching**: Optimized filesystem monitoring
- **Test Execution**: Fast feedback loops
