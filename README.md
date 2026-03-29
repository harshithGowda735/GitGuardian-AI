# GitGuardian AI

An autonomous Git-based AI agent that reviews code, detects issues, and posts feedback on GitHub Pull Requests. Supports multi-user deployment via GitHub App integration.

## Architecture

```
User installs GitHub App on their repo
        ↓
GitHub sends webhook on PR open/update
        ↓
GitGuardian AI server receives webhook
        ↓
AI reviews changed files (Gemini/OpenAI)
        ↓
Posts inline comments + summary on PR
```

## Two Modes

### 1. Local Mode (Personal Token)
Runs on your machine, reviews your local git changes. Good for personal use.

### 2. Server Mode (GitHub App - Multi-User)
Deploy as a server. Any user can install the GitHub App on their repos. The agent automatically reviews every PR.

## Project Structure
```
.gitagent/agent.json     - Review configuration
src/core/                - Agent orchestrator + workflow engines
src/modules/             - AI analysis (reviewer, fixer, scorer)
src/integrations/        - GitHub API + App auth
src/server/              - Webhook server for multi-user mode
src/config/              - AI provider configuration
prompts/                 - LLM prompt templates
```

## Quick Start

### Prerequisites
- Node.js >= 16
- At least one AI API key (Gemini or OpenAI)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

### 3. Choose your mode

#### Option A: Local Mode (Personal Use)
Fill in your `.env`:
```env
GEMINI_API_KEY=your_key_here
GITHUB_TOKEN=your_personal_token
GITHUB_OWNER=owner
GITHUB_REPO=repo
PR_NUMBER=123
```
Run: `npm start`

#### Option B: Server Mode (Multi-User / Production)
Fill in your `.env`:
```env
GEMINI_API_KEY=your_key_here
GITHUB_APP_ID=your_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```
Run: `npm run server`

## Setting Up a GitHub App

### Step 1: Create the App
Go to [GitHub App Settings](https://github.com/settings/apps/new) and configure:

| Field | Value |
|-------|-------|
| Homepage URL | Your deployed URL |
| Webhook URL | `https://your-domain.com/webhook` |
| Webhook Secret | A strong random string |

### Step 2: Set Permissions
- **Contents**: Read
- **Pull Requests**: Read & Write
- **Issues**: Write
- **Metadata**: Read

### Step 3: Subscribe to Events
- Pull requests
- Installation
- Installation repositories

### Step 4: Get Your Credentials
After creating the app:
- Copy the **App ID** from the app settings page
- Generate and download a **Private Key**
- Copy the **Webhook Secret** you set

### Step 5: Deploy
Deploy to Render, Railway, Fly.io, or any platform that supports Node.js.

The server exposes:
- `POST /webhook` - GitHub webhook receiver
- `GET /health` - Health check endpoint

## Deployment (Render)

1. Connect your GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `npm run server`
4. Add environment variables in Render dashboard
5. Update the GitHub App's webhook URL to your Render URL

## Configuration

Edit `.gitagent/agent.json` to customize behavior:
```json
{
  "modules": {
    "reviewer": { "enabled": true },
    "fixer": { "enabled": true, "autoApply": false },
    "scorer": { "enabled": true }
  }
}
```

## How It Works (Server Mode)

1. User installs your GitHub App on their repo
2. They open or update a Pull Request
3. GitHub sends a webhook to your server
4. The server authenticates using the installation ID
5. AI reviews each changed file
6. Inline comments are posted on problematic lines
7. A summary comment is posted on the PR

Users don't need to configure anything. They just install the app and it works.
