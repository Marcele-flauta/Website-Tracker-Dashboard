# Web Application Setup Guide

This guide walks you through setting up a complete web application using the Project Setup Skill.

## Prerequisites

- Node.js 18+ installed
- Git CLI installed
- GitHub CLI installed and authenticated
- Docker (optional, for containerization)

## Step-by-Step Setup

### 1. Initialize Project

```bash
# Create new project directory
mkdir my-web-app
cd my-web-app

# Initialize git repository
git init

# Set up basic package.json
npm init -y
```

### 2. Install Core Dependencies

```bash
# Frontend framework (choose one)
npm install react react-dom
# or
npm install vue@next
# or
npm install @angular/core

# Build tools
npm install --save-dev vite @vitejs/plugin-react
# or
npm install --save-dev webpack webpack-cli webpack-dev-server

# Styling
npm install tailwindcss
# or
npm install styled-components

# Testing
npm install --save-dev vitest @testing-library/react
# or
npm install --save-dev jest @testing-library/jest-dom
```

### 3. Configure Development Environment

#### Vite Configuration (vite.config.js)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
})
```

#### Tailwind Configuration (tailwind.config.js)
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. Create Basic File Structure

```
src/
├── components/
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── Layout.jsx
├── pages/
│   ├── Home.jsx
│   ├── About.jsx
│   └── Contact.jsx
├── styles/
│   └── globals.css
├── App.jsx
├── main.jsx
└── index.css
public/
├── index.html
└── favicon.ico
```

### 5. Set Up Environment Variables

Create `.env` file:
```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=My Web App
VITE_ENVIRONMENT=development
```

### 6. Configure Scripts

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext js,jsx,ts,tsx",
    "lint:fix": "eslint src --ext js,jsx,ts,tsx --fix"
  }
}
```

### 7. Set Up Git Workflow

#### .gitignore
```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*

# Build outputs
dist/
build/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

#### GitHub Actions (`.github/workflows/ci.yml`)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: echo "Deployment step here"
```

### 8. Set Up Code Quality

#### ESLint Configuration (.eslintrc.js)
```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
```

#### Prettier Configuration (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 9. Create Initial Components

#### src/App.jsx
```jsx
import React from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'

function App() {
  return (
    <Layout>
      <Home />
    </Layout>
  )
}

export default App
```

#### src/components/Layout.jsx
```jsx
import React from 'react'
import Header from './Header'
import Footer from './Footer'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default Layout
```

### 10. Testing Setup

#### src/setupTests.js
```javascript
import '@testing-library/jest-dom'
```

#### src/components/__tests__/Layout.test.jsx
```jsx
import { render, screen } from '@testing-library/react'
import Layout from '../Layout'

describe('Layout', () => {
  it('renders header and footer', () => {
    render(<Layout><div>Test content</div></Layout>)
    
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
```

## Next Steps

1. **Run development server**: `npm run dev`
2. **Run tests**: `npm test`
3. **Check code quality**: `npm run lint`
4. **Build for production**: `npm run build`
5. **Set up deployment**: Configure your hosting platform

## Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Resolution Issues
Check your `vite.config.js` and ensure proper alias configuration if needed.

### Environment Variables Not Loading
Ensure your `.env` file is in the root directory and variables start with `VITE_` for Vite projects.

## Additional Features

To add more features to your web app:

- **Authentication**: Set up OAuth or JWT
- **Database**: Add PostgreSQL or MongoDB
- **State Management**: Add Redux or Zustand
- **API Integration**: Set up REST or GraphQL endpoints
- **Monitoring**: Add Sentry or LogRocket
- **Analytics**: Add Google Analytics or Mixpanel
