# New Project Command

Creates a new project with the Skills Development Template and initializes live project tracking.

## Usage

```bash
/new-project "project description" [options]
```

## Examples

```bash
# Basic web application
/new-project "create a React web app with authentication"

# API service with database
/new-project "build a REST API with PostgreSQL and user management"

# CLI tool
/new-project "create a command-line tool for data processing"

# With specific template
/new-project "create an e-commerce website" --template=web-app
```

## Options

- `--template=<type>`: Specify project template (web-app, api-service, cli-tool, library)
- `--database=<type>`: Include database (postgresql, mongodb, sqlite)
- `--auth=<type>`: Include authentication (jwt, oauth, none)
- `--testing=<framework>`: Testing framework (vitest, jest, none)
- `--ci-cd`: Include CI/CD pipeline
- `--docs`: Include documentation setup

## Project Templates

### Web Application
- React + Vite
- Tailwind CSS
- PostgreSQL (optional)
- JWT Authentication (optional)
- Vitest Testing
- GitHub Actions

### API Service
- Node.js + Express
- PostgreSQL/MongoDB
- JWT Authentication
- API Documentation
- Docker Support

### CLI Tool
- Commander.js
- TypeScript
- Jest Testing
- Package Publishing

### Library/Package
- TypeScript
- Rollup Bundling
- Unit Tests
- Documentation

## Live Project Tracker

Each project created with `/new-project` includes a live project tracker in the README.md:

```markdown
## 🚀 Live Project Status
**Status**: 🚧 In Development  
**Version**: 0.1.0  
**Last Updated**: 2026-04-27  
**Compatible**: Claude Code, Cursor, Windsurf  
**Created By**: [Staff Name]  
**Project Type**: Web Application  

---

### Progress Tracking
- [x] Project initialized
- [ ] Core structure created
- [ ] Features implemented
- [ ] Testing completed
- [ ] Documentation updated
- [ ] Ready for review

### Current Sprint
**Sprint**: 1 - Foundation  
**Start Date**: 2026-04-27  
**End Date**: 2026-05-04  

**Goals**:
- Set up basic project structure
- Implement core features
- Add authentication
- Create basic tests

### Issues & Blockers
- **None currently**

### Next Steps
1. Complete project setup
2. Implement user authentication
3. Create database schema
4. Add basic UI components

---

*Last updated: 2026-04-27 by Claude Code*
```

## Implementation

When `/new-project` is executed:

1. **Parse the project description** and determine project type
2. **Create project structure** based on template
3. **Initialize live tracker** in README.md
4. **Set up development environment** (package.json, dependencies)
5. **Create initial files** (app structure, configs)
6. **Initialize git repository**
7. **Create first commit** with project setup

## Command Flow

```bash
/new-project "create a React web app with authentication"
```

### Step 1: Analysis
- Parse description: "React web app with authentication"
- Determine template: web-app
- Identify features: authentication, React

### Step 2: Setup
- Create project directories
- Set up package.json with React dependencies
- Configure Vite, Tailwind CSS
- Set up testing with Vitest

### Step 3: Initialization
- Create README.md with live tracker
- Set up .gitignore
- Initialize git repository
- Create initial commit

### Step 4: Configuration
- Set up environment variables
- Configure development scripts
- Create basic component structure

### Step 5: Documentation
- Update project tracker status
- Create setup documentation
- Add usage examples

## Live Tracker Updates

The tracker updates automatically during development:

### Status Changes
- **🚧 In Development** - Initial creation
- **🧪 Testing Phase** - When tests are added
- **⚠️ Known Issues** - When issues are identified
- **✅ Ready for Review** - When development is complete
- **🔄 Maintenance Mode** - During updates

### Automatic Updates
- **Last Updated** - Changes with each action
- **Version** - Increments with releases
- **Progress** - Updates as tasks complete
- **Next Steps** - Updates based on current state

## Integration with Other Commands

The `/new-project` command integrates with existing workflow commands:

```bash
# After creating project
/new-project "create a React web app"

# Continue with workflow
/EA-plan "implement user authentication"
/EA-build specs/todo/user-auth.md
/EA-validate
/EA-commit

# Update tracker automatically
```

## Error Handling

The command handles common issues:

### Invalid Descriptions
```
Error: Project description too vague. Please specify:
- Project type (web app, API, CLI tool, etc.)
- Key features or technologies
- Any specific requirements

Example: /new-project "create a React web app with user authentication and PostgreSQL database"
```

### Template Not Found
```
Error: Template 'mobile-app' not found. Available templates:
- web-app
- api-service
- cli-tool
- library
```

### Permission Issues
```
Error: Cannot create project directory. Please check permissions and try again.
```

## Best Practices

### Project Descriptions
Be specific in your project descriptions:

```bash
# Good
/new-project "create a React web app with TypeScript, Tailwind CSS, PostgreSQL, and JWT authentication"

# Less effective
/new-project "make a website"
```

### Template Selection
Use the `--template` option for specific project types:

```bash
/new-project "user management system" --template=api-service --database=postgresql --auth=jwt
```

### Progress Tracking
Keep the tracker updated:

```bash
# After major milestones
/new-project --update-status "Testing Phase"
/new-project --add-progress "Completed user authentication"
new-project --add-issue "Database connection timeout"
```

## Support

For issues with the `/new-project` command:

1. **Check the project description** - Is it specific enough?
2. **Verify template availability** - Is the template supported?
3. **Check permissions** - Can you create directories?
4. **Review error messages** - They provide specific guidance

---

*This command streamlines project creation with built-in tracking and best practices.*
