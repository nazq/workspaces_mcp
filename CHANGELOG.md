# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive test coverage (280 tests, 71.74% coverage)
- Automated release pipeline with beta and production workflows
- Enterprise-grade error handling and validation
- Complete architectural layer testing (transport, protocol, server, CLI)

### Changed

- Enhanced MCP protocol compliance and validation
- Improved server architecture with proper dependency injection
- Strengthened filesystem operations with robust error boundaries

### Fixed

- All failing tests now pass (0 failures)
- Corrected logger implementation for STDIO protocol compliance
- Resolved edge cases in workspace and instructions repositories

## [1.0.0] - 2024-12-XX

### Added

- Professional 5-layer MCP server architecture
- Intelligent workspace management system
- Automatic context loading for Claude Desktop
- Shared instruction templates (React, Python, Node.js)
- Global configuration management
- CLI interface for direct testing and debugging
- Comprehensive TypeScript type safety
- Professional CI/CD pipeline with pre-commit hooks
- Security scanning and dependency auditing
- Code quality enforcement (ESLint, Prettier)

### Features

- **Workspace Organization**: Structured project management with templates
- **Context Loading**: Instant project context injection into Claude conversations
- **Instruction Templates**: Reusable templates for different project types
- **Global Settings**: Centralized configuration across all workspaces
- **CLI Tools**: Direct command-line interface for testing and automation
- **Type Safety**: Complete TypeScript coverage with zero warnings
- **Professional CI**: Automated testing, linting, building, and deployment

### Technical

- Built with TypeScript and modern Node.js (18+)
- MCP SDK integration for Claude Desktop compatibility
- Comprehensive testing with Vitest (280 tests)
- Professional logging with structured output
- Secure file system operations with proper validation
- Modular architecture with clear separation of concerns
- Zero-dependency core with minimal external dependencies

---

## Release Guidelines

### Version Numbering

- **Major (X.0.0)**: Breaking changes, new architecture, incompatible API changes
- **Minor (X.Y.0)**: New features, backward compatible functionality
- **Patch (X.Y.Z)**: Bug fixes, security updates, maintenance

### Release Process

1. **Development**: Work happens on feature branches
2. **Pull Requests**: Merge to `main` triggers beta releases
3. **Production**: Tags on `main` create production releases
4. **Artifacts**: NPM packages + GitHub releases with DXT files

### Beta Releases

- Automatic on every merge to `main`
- Format: `X.Y.Z-beta.YYYYMMDDHHMMSS`
- Published to NPM with `@beta` tag
- GitHub pre-releases with DXT artifacts

### Production Releases

- Manual tagging on `main` branch
- Format: `vX.Y.Z` (semantic versioning)
- Published to NPM with `@latest` tag
- GitHub releases with changelog-driven notes
