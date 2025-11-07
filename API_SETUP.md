# API Setup Guide

This guide will help you set up API keys for all supported AI providers in the Multi-AI Conversation Manager.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your API keys**

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

---

## Supported AI Providers

### 1. OpenAI (GPT)

**Get API Key:**
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-your_key_here
```

**Models Available:** GPT-4, GPT-3.5-turbo

---

### 2. Anthropic (Claude)

**Get API Key:**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to "API Keys" section
4. Create a new key
5. Copy the key (starts with `sk-ant-`)

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-your_key_here
```

**Models Available:** Claude 3 Sonnet, Claude 3 Opus, Claude 3 Haiku

---

### 3. Google Gemini

**Get API Key:**
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Get an API key"
4. Create a new API key or use an existing one
5. Copy the key

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...your_key_here
```

**Models Available:** Gemini Pro, Gemini Pro Vision

---

### 4. Ollama (Local)

**Setup:**
1. Download and install Ollama from https://ollama.ai
2. Start Ollama (it runs on `http://localhost:11434` by default)
3. Pull a model:
   ```bash
   ollama pull llama2
   ```
   Or try other models:
   ```bash
   ollama pull mistral
   ollama pull codellama
   ollama pull llama3
   ```

**Configuration:**
- **No API key needed** for local installation
- Default URL: `http://localhost:11434`
- You can change the model in the app settings

---

### 5. Ollama Cloud ☁️ (NEW!)

**Get API Key:**
1. Sign up at your Ollama Cloud provider
2. Get your API key from the dashboard
3. Note the API endpoint URL

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_OLLAMA_API_KEY=your_cloud_api_key_here
NEXT_PUBLIC_OLLAMA_URL=https://api.ollama.ai
```

**Note:** The exact URL may vary depending on your Ollama Cloud provider.

---

## Configuring API Keys

### Method 1: Environment Variables (Recommended)

Edit `.env.local`:
```bash
NEXT_PUBLIC_OPENAI_API_KEY=your_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key
NEXT_PUBLIC_GEMINI_API_KEY=your_key
NEXT_PUBLIC_OLLAMA_API_KEY=your_key
NEXT_PUBLIC_OLLAMA_URL=your_url
```

### Method 2: In-App Settings

1. Open the app
2. Click the Settings icon (⚙️) in the sidebar
3. Scroll to "API Configuration"
4. Enter your API keys for each provider
5. Keys are saved in localStorage

---

## Verifying Your Setup

### Check API Keys in the App:

1. Open the Settings panel (⚙️ icon)
2. You should see your API keys (partially hidden for security)
3. Try selecting an AI provider and sending a test message

### Common Issues:

**Error: "API key not configured"**
- Solution: Make sure the API key is added in `.env.local` OR in app settings

**Error: "Failed to get response"**
- Check if the API key is valid
- Verify your account has credits/quota
- Check your internet connection

**Ollama (Local) not working:**
- Make sure Ollama desktop app is running
- Verify it's accessible at http://localhost:11434
- Check if you have a model installed: `ollama list`

---

## Security Best Practices

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **Keep API keys secret** - Don't share them publicly
3. **Rotate keys regularly** - Generate new keys periodically
4. **Use environment variables** - Prefer `.env.local` over in-app settings for production
5. **Monitor usage** - Check your API provider dashboards for unexpected usage

---

## API Pricing Reference

| Provider | Free Tier | Pricing Info |
|----------|-----------|--------------|
| **OpenAI** | $5 credit for new users | https://openai.com/pricing |
| **Anthropic** | Limited free tier | https://www.anthropic.com/pricing |
| **Google Gemini** | Free tier available | https://ai.google.dev/pricing |
| **Ollama (Local)** | 100% Free | No cost - runs on your machine |
| **Ollama Cloud** | Varies by provider | Check your provider's pricing |

---

## Troubleshooting

### Q: Can I use the app without API keys?
A: You can use Ollama (Local) without any API key if you install the Ollama desktop app.

### Q: How do I know if my API key is working?
A: Try sending a message to that AI provider. If it responds, your key is working!

### Q: Can I use multiple API keys for the same provider?
A: Currently, only one API key per provider is supported.

### Q: Where are my API keys stored?
A: Environment variables are stored in `.env.local` (never sent to server). In-app settings are stored in browser localStorage.

---

## Need Help?

- **Ollama Issues:** https://github.com/ollama/ollama/issues
- **OpenAI Issues:** https://help.openai.com/
- **Anthropic Issues:** https://docs.anthropic.com/
- **Gemini Issues:** https://ai.google.dev/docs

---

**Happy AI Chatting! 🤖💬**
