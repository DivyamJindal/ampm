# AM:PM Creator Negotiation Demo

Single-page Next.js 14 demo for roleplaying creator onboarding and rate negotiation.

## Local setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` before starting the dev server.

Optional env vars:

```bash
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SCOUT_PROPOSAL_URL=https://your-proposal-link
```

The setup panel also includes a temporary local preview key helper. Use it only for local testing;
production should use Vercel environment variables so keys never ship in client code or git.

## Engine shape

The chat route returns a structured "agent room" trace before rendering the final DM:

- interaction agent: frames the creator ops task
- tone reader: adapts voice to the creator reply
- fit scorer: evaluates AM:PM creator fit
- negotiation simulator: compares offer strategies with Monte Carlo-style outcomes
- guardrail: checks ceiling secrecy, banned words, over-offer risk, and human tone
- message writer: turns the selected strategy into the visible iMessage reply

## Deploy

Deploy to Vercel with:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` if you want to override the default
- `NEXT_PUBLIC_SCOUT_PROPOSAL_URL` for the about page proposal link
