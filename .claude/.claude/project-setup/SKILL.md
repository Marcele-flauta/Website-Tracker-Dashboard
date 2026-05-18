# Project Setup Skill

A comprehensive skill for setting up new projects with best practices, proper configuration, and development workflow.

## Overview

This skill provides a complete project initialization workflow that includes:
- Repository setup and configuration
- Environment configuration
- Development environment preparation
- Initial documentation and structure
- Git workflow setup

## Capabilities

### Core Functions
- **Repository Initialization**: Set up git repository with proper configuration
- **Environment Setup**: Configure development environment with required dependencies
- **Documentation Generation**: Create comprehensive project documentation
- **CI/CD Configuration**: Set up continuous integration and deployment pipelines
- **Code Quality Setup**: Configure linting, formatting, and testing frameworks

### Triggers
- New project creation
- Repository cloning
- Development environment setup
- Project restructuring

## Usage

### Basic Setup
```
/project-setup init --name="my-project" --template="web-app"
```

### Advanced Setup
```
/project-setup init --name="my-project" --template="web-app" --features=["ci-cd", "monitoring", "auth"]
```

## Configuration

### Templates Available
- `web-app`: Full-stack web application
- `api-service`: REST API service
- `cli-tool`: Command-line tool
- `library`: Reusable library/package
- `ml-project`: Machine learning project

### Features
- `ci-cd`: GitHub Actions workflow
- `monitoring`: Application monitoring setup
- `auth`: Authentication system
- `database`: Database configuration
- `testing`: Comprehensive test suite

## Implementation Details

### File Structure
```
.claude/skills/project-setup/
├── SKILL.md              # This file
├── cookbook/
│   ├── web-app-setup.md  # Web application setup guide
│   ├── api-setup.md      # API service setup guide
│   └── troubleshooting.md # Common issues and solutions
└── templates/
    ├── web-app/          # Web application template
    ├── api-service/      # API service template
    └── common/           # Common configurations
```

### Dependencies
- Git CLI
- Node.js (for web projects)
- Docker (optional)
- GitHub CLI (for GitHub features)

## Integration

This skill integrates with:
- **Core Workflow**: Uses the PLAN → BUILD → VALIDATE → REVIEW → COMMIT cycle
- **Security Hooks**: Respects all security configurations
- **MCP Servers**: Can leverage Playwright for testing
- **Other Skills**: Works with documentation, testing, and deployment skills

## Best Practices

1. **Always validate before committing**: Use the validation step to ensure setup is correct
2. **Document decisions**: Keep track of why certain configurations were chosen
3. **Security first**: Never expose sensitive information during setup
4. **Incremental setup**: Start with basic setup, then add features incrementally

## Troubleshooting

See `cookbook/troubleshooting.md` for common issues and solutions.

## Version History

- v1.0: Initial skill implementation
- v1.1: Added template system
- v1.2: Enhanced CI/CD integration
