# 🚀 Deployment Guide

This guide covers the deployment and release process for Workspaces MCP.

## 📋 Prerequisites

### Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

- **`NPM_TOKEN`**: NPM authentication token for publishing packages
  - Go to [npmjs.com](https://www.npmjs.com/settings/tokens)
  - Create a new "Automation" token with "Read and write" permissions
  - Add it to GitHub secrets

- **`CODECOV_TOKEN`** (optional): For code coverage reporting
  - Sign up at [codecov.io](https://codecov.io)
  - Add your repository and copy the token

### Local Development Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run comprehensive test suite
npm run test:all

# Validate release readiness
npm run validate:release
```

## 🎯 Release Process

### 1. Pre-Release Validation

Before creating a release, run the complete validation suite:

```bash
# Run all tests, linting, type checking
npm run test:all

# Validate the release package
npm run validate:release
```

Both commands should pass with no errors.

### 2. Version Management

We use semantic versioning (semver):

- **Patch** (1.0.1): Bug fixes, documentation updates
- **Minor** (1.1.0): New features, backwards compatible
- **Major** (2.0.0): Breaking changes

```bash
# Update version in packages
npm version patch|minor|major

# Or manually edit package.json files
```

### 3. Create Release

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will automatically trigger the GitHub Actions release workflow.

### 4. Monitor Release

1. Go to **Actions** tab in your GitHub repository
2. Monitor the "Release" workflow
3. Check that all jobs pass:
   - Build and test on multiple platforms
   - Security audit
   - Package creation
   - NPM publishing
   - GitHub release creation

## 🔄 Continuous Integration

### Automated Testing

Every push and PR triggers comprehensive testing:

- **Multi-platform testing**: Ubuntu, Windows, macOS
- **Multi-Node.js versions**: 18.x, 20.x, 22.x
- **Full test suite**: Unit, integration, security
- **Code quality**: TypeScript, ESLint, Prettier
- **Build verification**: All packages build successfully

### Security Monitoring

- **Dependency auditing**: `npm audit` with high severity threshold
- **Vulnerability scanning**: `audit-ci` for CI/CD pipeline
- **Dependabot**: Automated dependency updates

### Quality Gates

All checks must pass before code can be merged:

- ✅ TypeScript compilation
- ✅ ESLint rules (no warnings)
- ✅ Prettier formatting
- ✅ 90%+ test coverage
- ✅ All tests passing
- ✅ Security audit clean
- ✅ Successful build

## 📦 Package Distribution

### NPM Publishing

Packages are automatically published to NPM when:

- A version tag is pushed (e.g., `v1.0.0`)
- All tests pass
- It's not a pre-release version (alpha, beta, rc)

### GitHub Releases

Each release creates:

- **Release notes**: Auto-generated from commits
- **Packaged binaries**: Cross-platform CLI packages
- **Source code**: Automatic GitHub archive

### Distribution Channels

1. **NPM Registry**: `npm install -g dxt-workspaces`
2. **GitHub Releases**: Download platform-specific packages
3. **Direct Install**: `npx dxt-workspaces install`

## 🔧 Troubleshooting

### Common Issues

**NPM Token Issues**

```bash
# Verify token permissions
npm whoami
npm access ls-packages
```

**Build Failures**

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Test Failures**

```bash
# Run specific test suites
npm run test:coverage
npm run test:integration

# Debug individual tests
npm test -- --reporter=verbose workspace.test.ts
```

### Debug Commands

```bash
# Check package structure
npm run validate:release

# Test CLI manually
node packages/dxt-workspaces/dist/index.js --help
node packages/dxt-workspaces/dist/index.js install --path /tmp/test

# Test MCP server
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | node packages/mcp-server/dist/index.js
```

## 📊 Monitoring

### Release Health

Monitor these metrics after releases:

- NPM download statistics
- GitHub release download counts
- Issue reports and bug fixes
- Performance metrics

### Success Criteria

A successful release should:

- ✅ Pass all CI/CD checks
- ✅ Install successfully on all platforms
- ✅ Create workspace structure correctly
- ✅ Integrate with Claude Desktop
- ✅ Have no critical security vulnerabilities
- ✅ Maintain backwards compatibility (minor releases)

## 🏷️ Release Checklist

- [ ] All tests passing locally (`npm run test:all`)
- [ ] Release validation successful (`npm run validate:release`)
- [ ] Version bumped appropriately
- [ ] CHANGELOG.md updated
- [ ] NPM token configured in GitHub secrets
- [ ] Tag created and pushed
- [ ] CI/CD pipeline completes successfully
- [ ] NPM package published
- [ ] GitHub release created
- [ ] Documentation updated
- [ ] Community notified (if applicable)

## 📞 Support

For deployment issues:

- **GitHub Issues**: Report problems and bugs
- **Discussions**: Ask questions and get help
- **Documentation**: Check troubleshooting guides

---

**Happy deploying!** 🚀
