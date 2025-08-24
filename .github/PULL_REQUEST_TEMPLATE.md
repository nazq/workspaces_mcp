## 📋 Pull Request

### Description

<!-- Provide a brief description of the changes in this PR -->

### Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 **Bug fix** (non-breaking change which fixes an issue)
- [ ] ✨ **New feature** (non-breaking change which adds functionality)
- [ ] 💥 **Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 **Documentation** (changes to documentation only)
- [ ] 🔧 **Maintenance** (code refactoring, dependency updates, etc.)
- [ ] 🚀 **Performance** (changes that improve performance)
- [ ] 🔒 **Security** (changes that improve security)

### Changes Made

<!-- List the specific changes made in this PR -->

-
-
-

### Testing

<!-- Describe how you tested your changes -->

- [ ] All existing tests pass (`npm test`)
- [ ] Added new tests for new functionality
- [ ] Tested manually in development environment
- [ ] Integration tests pass if applicable

### Changelog Entry

<!-- This is important! Choose one: -->

- [ ] ✅ **I have added an entry to the changelog** using `npm run changelog add <type> "<description>"`
- [ ] 🚫 **No changelog entry needed** (documentation, tests, or internal changes only)

**Changelog command used:**

```bash
npm run changelog add <Added|Changed|Fixed|Security> "Description of change"
```

### Checklist

<!-- Mark completed items with an "x" -->

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

### Related Issues

<!-- Link any related issues -->

Closes #
Related to #

### Additional Context

<!-- Add any other context, screenshots, or relevant information about the PR -->

---

### For Reviewers

This PR will trigger a **beta release** when merged to `main`. The beta will be available at:

- NPM: `npm install workspaces-mcp@beta`
- GitHub: Pre-release with `.dxt` file for Claude Desktop

### Post-Merge

After merging, this will automatically:

- ✅ Trigger a beta release (`1.0.0-beta.YYYYMMDDHHMMSS`)
- ✅ Publish to NPM with `@beta` tag
- ✅ Create GitHub pre-release with DXT file
- ✅ Update development status in repository

---

**Happy coding! 🚀**
