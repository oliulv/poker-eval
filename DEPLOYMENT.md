# Deployment Guide

## Prerequisites

1. Vercel account
2. API keys for all providers:
   - OpenAI API key
   - Anthropic API key
   - Google Generative AI API key
   - Grok (xAI) API key

## Deployment Steps

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Deploy to Vercel**:
```bash
vercel
```

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the following:
     - `OPENAI_API_KEY`
     - `ANTHROPIC_API_KEY`
     - `GOOGLE_GENERATIVE_AI_API_KEY`
     - `GROK_API_KEY` (or `XAI_API_KEY`)

4. **Redeploy** after adding environment variables:
```bash
vercel --prod
```

## Vercel AI Gateway (Optional)

To use Vercel AI Gateway for rate limiting and analytics:

1. Enable AI Gateway in your Vercel project settings
2. Update API calls to use the gateway endpoint
3. Configure rate limits per provider

## Notes

- Meta models are currently not configured (will auto-fold)
- Game state is stored in-memory (consider upgrading to database for production)
- Demo games can be pre-recorded and stored in `data/demo-games.json`

