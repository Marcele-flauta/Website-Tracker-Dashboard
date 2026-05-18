# Project Setup Troubleshooting

This guide addresses common issues encountered during project setup and their solutions.

## Common Issues and Solutions

### Git-Related Issues

#### Issue: "fatal: not a git repository"
**Cause**: Trying to run git commands in a directory that hasn't been initialized
**Solution**:
```bash
git init
```

#### Issue: "Permission denied (publickey)"
**Cause**: SSH key not properly configured for GitHub
**Solution**:
```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
cat ~/.ssh/id_ed25519.pub
# Copy output and add to GitHub Settings > SSH and GPG keys
```

#### Issue: "remote origin already exists"
**Cause**: Trying to add a remote when one already exists
**Solution**:
```bash
git remote remove origin
git remote add origin <your-repo-url>
```

### Node.js/NPM Issues

#### Issue: "npm ERR! code EACCES"
**Cause**: Permission errors with npm packages
**Solution**:
```bash
# Fix npm permissions
npm config fix

# Or use npx to avoid global installs
npx <package-name>
```

#### Issue: "Module not found" after installation
**Cause**: Node modules not properly installed or corrupted
**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "Port already in use"
**Cause**: Another process is using the development port
**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 <PID>

# Or use different port
npm run dev -- --port 3001
```

### Environment Variable Issues

#### Issue: Environment variables not loading
**Cause**: .env file not in correct location or format
**Solution**:
```bash
# Ensure .env is in project root
ls -la .env

# Check format (no spaces around =)
cat .env

# Restart development server after changes
```

#### Issue: Sensitive data in git history
**Cause**: Accidentally committed .env file or secrets
**Solution**:
```bash
# Remove from git history
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all

# Add to .gitignore if not already there
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

### Build Tool Issues

#### Issue: Vite build fails with module resolution errors
**Cause**: Incorrect import paths or missing dependencies
**Solution**:
```bash
# Check vite.config.js configuration
cat vite.config.js

# Verify all dependencies are installed
npm ls

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### Issue: Webpack compilation slow
**Cause**: Large node_modules or inefficient configuration
**Solution**:
```bash
# Use webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Add to webpack config
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// Add to plugins array
new BundleAnalyzerPlugin()
```

### Testing Issues

#### Issue: Tests fail with "document not defined"
**Cause**: Testing environment not configured for DOM
**Solution**:
```bash
# Install jsdom for testing environment
npm install --save-dev jsdom

# Configure vitest.config.js
export default defineConfig({
  test: {
    environment: 'jsdom'
  }
})
```

#### Issue: Test coverage not generating
**Cause**: Coverage tool not properly configured
**Solution**:
```bash
# Configure coverage in vitest
export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.js'
      ]
    }
  }
})
```

### Docker Issues

#### Issue: "docker: command not found"
**Cause**: Docker not installed or not in PATH
**Solution**:
```bash
# Install Docker Desktop (Windows/Mac)
# Or install Docker Engine (Linux)

# Verify installation
docker --version
```

#### Issue: Container can't access host files
**Cause**: Volume mounting issues
**Solution**:
```bash
# Check Docker daemon is running
docker info

# Verify volume mount paths
docker run -v "$(pwd)":/app -it ubuntu ls /app
```

### IDE/Editor Issues

#### Issue: ESLint not working in VS Code
**Cause**: ESLint extension not installed or configured
**Solution**:
```bash
# Install ESLint extension
code --install-extension dbaeumer.vscode-eslint

# Create .vscode/settings.json
mkdir .vscode
cat > .vscode/settings.json << EOF
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
EOF
```

#### Issue: Prettier formatting conflicts
**Cause**: Prettier and ESLint rules conflict
**Solution**:
```bash
# Install eslint-config-prettier
npm install --save-dev eslint-config-prettier

# Update .eslintrc.js
extends: [
  'eslint:recommended',
  'plugin:react/recommended',
  'prettier'
]
```

### CI/CD Issues

#### Issue: GitHub Actions failing
**Cause**: Missing secrets or incorrect permissions
**Solution**:
```bash
# Add required secrets in GitHub repo settings
# Settings > Secrets and variables > Actions

# Common secrets:
# - NODE_AUTH_TOKEN (for private packages)
# - API keys for external services
# - Deployment credentials
```

#### Issue: Tests passing locally but failing in CI
**Cause**: Environment differences
**Solution**:
```bash
# Ensure consistent Node.js version
# Use .nvmrc or engines in package.json

# Check for OS-specific behavior
# Use cross-platform libraries

# Verify all dependencies are in package.json
npm ci --only=production
```

## Debugging Strategies

### 1. Check the Basics
```bash
# Verify Node.js version
node --version
npm --version

# Check git status
git status

# List files in directory
ls -la
```

### 2. Clean and Reinstall
```bash
# Remove all generated files
rm -rf node_modules dist build .nuxt .next

# Clear package manager cache
npm cache clean --force

# Fresh install
npm install
```

### 3. Check Configuration Files
```bash
# Verify package.json syntax
cat package.json | python -m json.tool

# Check configuration files
cat vite.config.js
cat .eslintrc.js
cat tailwind.config.js
```

### 4. Run with Verbose Output
```bash
# npm with verbose output
npm install --verbose

# Build with verbose output
npm run build -- --verbose

# Test with verbose output
npm test -- --verbose
```

## Getting Help

### Community Resources
- Stack Overflow: Search for your specific error message
- GitHub Issues: Check project's issue tracker
- Discord/Slack: Join relevant developer communities

### Official Documentation
- Node.js: https://nodejs.org/docs/
- npm: https://docs.npmjs.com/
- Vite: https://vitejs.dev/guide/
- React: https://react.dev/

### Template-Specific Help
If you're having issues with this specific template:
1. Check the template's GitHub repository
2. Look for existing issues
3. Create a new issue with detailed information
4. Include your OS, Node.js version, and exact error messages

## Prevention Tips

1. **Always read error messages completely** - They often contain the solution
2. **Keep dependencies updated** - Use `npm outdated` to check
3. **Use version locking** - Commit package-lock.json
4. **Test in clean environment** - Use Docker for consistency
5. **Document your setup** - Keep track of what works
6. **Use git branches** - Isolate experimental changes
7. **Regular maintenance** - Clean up unused dependencies and files
