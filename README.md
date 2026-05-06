# AM:PM Scout Conversation Engine

This repo is a focused demo for the AM:PM Network AI Generalist assignment:

> AM:PM creator onboarding is currently manual DMs, Google Sheets, and someone chasing replies by hand. What would you build to fix this, and what could you ship in 48 hours?

My answer is **Scout**, a creator onboarding agent for discovery, personalized outreach, qualification, negotiation, and handoff. This repo does not try to build all of Scout. It ships the hardest proof point: a working conversation engine that can open a creator DM, explain AM:PM, qualify interest, negotiate with memory, and show its internal operating loop live beside the chat.

Live demo placeholder: `https://your-vercel-url.vercel.app`

GitHub: [github.com/DivyamJindal/ampm](https://github.com/DivyamJindal/ampm)

Scout proposal placeholder: leave `NEXT_PUBLIC_SCOUT_PROPOSAL_URL` blank for now.

## What This Release Is For

The reviewer becomes the creator. They choose a preset persona or paste their own creator context, then roleplay in an iMessage-style chat. The AI plays the AM:PM operator.

The important part is the side panel. Before every AM:PM message lands, the reviewer sees the "agent room" work:

- tone reader checks whether the creator is warm, curt, formal, confused, skeptical, or price-sensitive
- fit scorer evaluates creator fit for AM:PM
- negotiation simulator compares possible moves with Monte Carlo-style outcomes
- guardrail checks ceiling secrecy, banned words, over-offer risk, and human tone
- message writer turns the selected strategy into a natural DM

The goal is not "AI writes DMs." The goal is to show how AM:PM could turn creator onboarding from scattered manual chasing into a stateful operating system.

## Big Vision: Scout

Scout is one agent with five steps and shared state:

1. **Discover**
   Rank creator handles by audience fit, niche, format, location, and similarity to AM:PM's best-performing creators, not gut-feel.

2. **Open**
   Draft DMs grounded in a real recent post. No generic "love your content" outreach.

3. **Qualify**
   Classify interest, creator tone, niche fit, availability, objections, usual rates, and whether the lead is worth pursuing.

4. **Negotiate**
   Track floor, current offer, ceiling, deliverables, creator ask, concession history, payment terms, and next best move.

5. **Hand Off**
   Move signed or warm leads into Slack, Notion, Sheets, and Cal.com. The first production version should preserve existing ops habits instead of forcing a new CRM on day one.

Every chat should support three live modes:

- **AI:** agent can send automatically inside approved policy
- **Co-pilot:** agent drafts and recommends, human approves
- **Human:** manual takeover, with the same state and context preserved

For any workflow touching real money, this mode switch is non-negotiable.

## Current Demo

Built in this repo:

- Next.js 14 App Router, TypeScript, Tailwind
- no auth, no database, no Instagram API
- creator presets for Kabir, Aanya, and Rohit
- custom creator form
- iMessage-style chat UI
- OpenAI-backed `/api/chat` route
- structured JSON response contract
- automatic intro and qualification arc
- agent-room trace
- Monte Carlo-style strategy panel
- guardrail panel
- local-only temporary OpenAI key helper
- Vercel-ready environment variable setup

Intentionally not built yet:

- Instagram integration
- persistent storage
- CRM dashboard
- Sheet sync
- Slack/Notion/Cal.com handoff
- scheduled follow-ups
- evaluation dataset
- production analytics
- real rate sheet
- contract generation

## Conversation Engine Architecture

The engine lives in:

- [`app/api/chat/route.ts`](app/api/chat/route.ts): OpenAI route, schema validation, missing-key handling, first-turn intro safety net
- [`lib/prompt.ts`](lib/prompt.ts): AM:PM operator system prompt and automatic conversation arc
- [`lib/types.ts`](lib/types.ts): typed response contract for chat messages, deal state, trace steps, Monte Carlo output, guardrails
- [`lib/creators.ts`](lib/creators.ts): preset creators, tiers, rate sheet helpers
- [`app/page.tsx`](app/page.tsx): chat UI, setup panel, temporary key helper, side-panel visualization

### Request Flow

```text
Creator sends message
        |
        v
React state sends full conversation history to /api/chat
        |
        v
API route builds system prompt from:
- creator persona
- AM:PM brief
- rate sheet
- current deal state
- full conversation history
        |
        v
OpenAI returns structured JSON
        |
        v
UI stages the agent-room trace first
        |
        v
typing dots appear
        |
        v
AM:PM iMessage bubble lands
```

### Structured Output

The route asks the model for a strict object:

```ts
{
  thought: string;
  fit_score: number;
  next_move: string;
  agent_trace: AgentTraceStep[];
  monte_carlo: MonteCarloResult;
  voice_notes: string;
  guardrails: GuardrailResult;
  state_update: {
    stage: "opener" | "intro" | "qualifying" | "negotiating" | "closing" | "stalled" | "signed" | "lost";
    offer: number | null;
  };
  message: string;
  double_text?: string | null;
}
```

This uses OpenAI structured outputs so the UI can trust the shape of the response instead of parsing prose.

### Agent Room

The visible agent room is a product layer over the structured response:

- **interaction_agent:** frames the next creator-ops task
- **tone_reader:** chooses register and pace
- **fit_scorer:** estimates AM:PM fit
- **negotiation_simulator:** compares candidate moves
- **guardrail:** checks business and tone constraints
- **message_writer:** writes the final DM

The UI shows concise operational summaries, not private chain-of-thought.

### Automatic Conversation Arc

The engine should not jump straight into rates.

Early turns follow this arc automatically:

1. Reference a real creator post.
2. Briefly explain AM:PM.
3. Explain the creator-led reel format.
4. Ask whether they are interested or open to seeing angles.
5. Qualify deliverables, creative control, availability, and usual rates.
6. Negotiate only after interest or a rate question.

The API route also has a first-turn safety net: if the model forgets to intro AM:PM, the route forces `stage: "intro"`, keeps `offer: null`, and adds a compact AM:PM/context double-text.

### Negotiation Behavior

The negotiation state tracks:

- creator tier
- current offer
- ceiling
- stage
- turns elapsed
- conversation history

The rate sheet is fictional and internal:

- Tier C, 50k-100k followers: floor ₹8k, ceiling ₹15k per reel
- Tier B, 100k-250k: floor ₹15k, ceiling ₹25k
- Tier A, 250k+: floor ₹25k, ceiling ₹45k
- performance bonus: +20% if a reel crosses 50k views in 7 days

The model is instructed never to reveal the ceiling.

### Monte Carlo Panel

The current Monte Carlo panel is demo-grade. It asks the model to compare strategies and expose:

- sample size
- selected move
- estimated acceptance probability
- expected cost
- best case
- worst case
- rejected moves and why they lost

In a production 48-hour version, this should become deterministic business logic plus model-assisted estimates. The model can generate candidate moves, but pricing policy and ceiling checks should be enforced in code.

## Why This Is Special

Most "AI outreach" demos stop at message generation. This one shows the operating system around the message:

- it explains AM:PM before negotiating
- it asks creator-facing questions automatically
- it adapts tone to the creator
- it remembers deal state
- it separates strategy from final DM writing
- it exposes the strategy trace live
- it checks guardrails before a money-touching message

That is the part AM:PM actually needs if one ops person is going to manage hundreds of creator conversations without dropping context.

## 48-Hour Build Plan

If I had the full 48 hours, I would focus on a **shadow-mode Scout**, not a fully autonomous production agent.

### Hour 0-6: Foundation

- Lock the creator and deal data model.
- Add Supabase for creators, conversations, messages, states, and actions.
- Keep current UI but add a real dashboard queue.
- Define policy constants in code: floors, ceilings, deliverables, approval states.

### Hour 6-14: Conversation Engine

- Keep the current OpenAI structured-output route.
- Split strategy and message writing into separate server functions.
- Add deterministic validation after the model response.
- Add follow-up classification: interested, confused, stalled, countered, rejected, signed.
- Add human approval state for every outbound DM.

### Hour 14-24: Dashboard and Ops Flow

- Creator table with status, score, last reply, next action, and owner.
- Conversation detail page with AI / Co-pilot / Human toggle.
- Draft queue for outbound DMs.
- Manual override and notes.
- Export/sync-friendly schema so the team can keep Sheets for day-one ops.

### Hour 24-34: Discovery and Import

- CSV or Sheet import for handles.
- Mocked discovery scorer using available metadata.
- Creator ranking by niche, follower tier, recent post quality, and AM:PM fit.
- Store all scoring inputs so rankings are inspectable.

### Hour 34-42: Handoff

- Slack notification for hot leads.
- Notion or Sheet row sync for signed/warm creators.
- Cal.com link insertion for calls if needed.
- Basic follow-up scheduler or queued reminders.

### Hour 42-48: Shadow Test

- Test on 20 simulated creators or draft-only real leads.
- Human approves every outbound message.
- Log bad messages, missed intents, over-offer attempts, and tone failures.
- Write operating docs for what AI can send, what needs approval, and when to hand off.

## Foundation Challenges in 48 Hours

The hard parts are not the UI. The hard parts are operational reliability:

- **Conversation state:** every creator needs durable state across days, channels, and human takeovers.
- **Rate safety:** ceilings, concessions, bonuses, and deliverables must be enforced by code, not only prompt instructions.
- **Tone quality:** the agent has to sound human without becoming unserious or too casual.
- **Platform constraints:** Instagram DM automation has policy and API limitations, so the first useful version should be draft-first or human-approved.
- **Evaluation:** you need a small test set of creator replies to catch generic openers, ceiling leakage, weak counters, and bad follow-ups.
- **Handoff:** ops teams already live in Sheets, Slack, and Notion. The first version should integrate with that instead of replacing it.
- **Security:** keys stay in server env vars, never GitHub or client code.
- **Observability:** every recommendation needs traceable reason, state, and policy checks.

## What To Focus On First

For 48 hours, the highest-leverage build is:

1. persistent conversation state
2. structured conversation engine
3. human approval workflow
4. dashboard queue
5. Sheet/Slack handoff

I would not spend the first 48 hours on:

- real Instagram sending
- contract generation
- analytics dashboards
- complex discovery scraping
- fully autonomous negotiation without approval

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set your local `.env.local`:

```bash
OPENAI_API_KEY=replace_with_your_openai_key
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SCOUT_PROPOSAL_URL=
```

`NEXT_PUBLIC_SCOUT_PROPOSAL_URL` can stay blank for now. The About page will show a placeholder note.

The setup panel also includes a temporary local preview key helper. Use it only for local testing. Production should use Vercel environment variables so keys never ship in client code or Git.

## Vercel Deployment

Connect this repo to Vercel:

```text
https://github.com/DivyamJindal/ampm
```

Use default Next.js settings:

- framework: Next.js
- install command: `npm install`
- build command: `npm run build`
- output directory: default

Add Vercel environment variables:

```bash
OPENAI_API_KEY=your_real_key
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SCOUT_PROPOSAL_URL=
```

Only `OPENAI_API_KEY` is required. `NEXT_PUBLIC_SCOUT_PROPOSAL_URL` can remain blank until there is a Notion, Google Doc, PDF, or README proposal link.

## Testing Script

After adding an OpenAI key:

1. Pick Kabir.
2. Start the room.
3. Confirm the first message references the bandana/Bandra Fort post and introduces AM:PM before rates.
4. Reply: `what is AM:PM exactly?`
5. Confirm it explains the short-form creator-led reels and asks if the format is worth exploring.
6. Reply: `maybe, what are you expecting?`
7. Confirm it explains `2 reels + 3 stories`, creative control, and asks a qualifying question.
8. Reply: `i usually charge 28k per reel`
9. Confirm it negotiates below ceiling, preferably using performance bonus or a structured counter.
10. Check the side panel for trace, Monte Carlo, rejected moves, and guardrails.

Try the same with:

```text
Sounds interesting, send me examples
```

```text
Not interested
```

```text
I can do this only if payment is upfront
```

```text
30k per reel, take it or leave it
```

## Security Notes

- Do not commit real API keys.
- `.env*.local` is ignored.
- `.env.local.example` contains placeholders only.
- The temporary browser key helper stores a key in `sessionStorage` for local testing and sends it to this app's API route as a request header.
- Production should use server-side Vercel environment variables.
- There is no database or persistent storage in this demo.

## Current Limitations

- The Monte Carlo layer is model-reported, not a deterministic simulator yet.
- The conversation state is browser-local.
- Refresh resets the room.
- There is no persistent audit trail.
- There is no Instagram API integration.
- There is no storage dependency yet.
- There is no auth, because the demo is intentionally open.
- `npm audit` flags current Next.js 14 advisories. The assignment asked for Next.js 14, so this repo stays on Next 14 unless the deployment target permits upgrading.

## Useful Links and References

- Inspiration: [OpenPoke by Shlok](https://www.shloked.com/writing/openpoke)
- OpenAI: [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- OpenAI: [Responses API Reference](https://platform.openai.com/docs/api-reference/responses)
- Next.js: [Environment Variables](https://nextjs.org/docs/15/app/guides/environment-variables)
- Vercel: [Environment Variables](https://vercel.com/docs/environment-variables)
- Vercel: [Builds and framework auto-detection](https://docs.vercel.com/docs/builds)
