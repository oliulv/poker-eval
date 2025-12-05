# AI Poker Model Evaluation Game

A competitive Texas Hold'em poker game where 5 AI models compete against each other. Built for Vercel's "Build your own model eval game" hackathon.

## Features

- **Two Game Modes**:
  - **Fast Mode**: Uses smaller, faster models (GPT-4o-mini, Claude Haiku, Gemini Flash, Grok-2, etc.)
  - **Smart Mode**: Uses larger, more capable models (GPT-4o, Claude Sonnet, Gemini Pro, Grok-2, etc.)

- **Real-time Gameplay**: Watch AI models make decisions in real-time
- **Complete Game Logging**: Every action is logged with full context
- **Replay System**: Review games at variable speeds, step through actions
- **AI Reasoning**: Click any action to see the model's reasoning (fetched asynchronously)

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables in `.env.local`:
```
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
GROK_API_KEY=your_key_here
# Or use XAI_API_KEY as alternative
```

3. Run the development server:
```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to add all API keys in Vercel's environment variables settings.

## Architecture

- **Poker Engine** (`lib/poker/`): Complete Texas Hold'em game logic
- **AI Integration** (`lib/ai/`): Vercel AI SDK integration with 5 providers
- **API Routes** (`app/api/game/`): Game state management and AI action processing
- **UI Components** (`components/`): React components for poker table visualization

## Performance Optimizations

- Action-only prompts (reasoning fetched async)
- 15-second timeout per decision
- Streaming UI for "thinking" indicators
- Pre-recorded demo games for instant first-visit experience

## Game Flow

1. User selects Fast or Smart mode
2. 5 AI players start with 1000 chips each
3. Game continues until one player has all chips
4. All actions logged for replay
5. Final leaderboard with rankings
