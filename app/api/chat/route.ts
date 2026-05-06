import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { rateSheet } from "@/lib/creators";
import { buildSystemPrompt } from "@/lib/prompt";
import type { AgentResponse, ChatMessage, CreatorPersona, DealState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AgentResponseSchema = z.object({
  thought: z.string(),
  fit_score: z.number().min(1).max(10),
  next_move: z.string(),
  agent_trace: z.array(
    z.object({
      agent: z.enum([
        "interaction_agent",
        "tone_reader",
        "fit_scorer",
        "negotiation_simulator",
        "guardrail",
        "message_writer",
      ]),
      status: z.enum(["done", "running", "waiting"]),
      summary: z.string(),
      detail: z.string(),
      latency_ms: z.number(),
    }),
  ),
  monte_carlo: z.object({
    sample_size: z.number(),
    selected_move: z.string(),
    acceptance_probability: z.number().min(0).max(1),
    expected_cost: z.number(),
    best_case: z.string(),
    worst_case: z.string(),
    rejected_moves: z.array(
      z.object({
        move: z.string(),
        acceptance_probability: z.number().min(0).max(1),
        expected_cost: z.number(),
        reason: z.string(),
      }),
    ),
  }),
  voice_notes: z.string(),
  guardrails: z.object({
    ceiling_hidden: z.boolean(),
    banned_words_clear: z.boolean(),
    no_over_offer: z.boolean(),
    human_tone: z.boolean(),
    notes: z.string(),
  }),
  state_update: z.object({
    stage: z.enum(["opener", "intro", "qualifying", "negotiating", "closing", "stalled", "signed", "lost"]),
    offer: z.number().nullable(),
  }),
  message: z.string(),
  double_text: z.string().nullable().optional(),
});

const RequestSchema = z.object({
  creator: z.object({
    id: z.string(),
    label: z.string(),
    handle: z.string(),
    followers: z.number(),
    followersLabel: z.string(),
    niche: z.string(),
    location: z.string(),
    recent_post: z.string(),
    voice_description: z.string(),
    tier: z.enum(["A", "B", "C"]),
  }),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["creator", "agent"]),
      content: z.string(),
      createdAt: z.string(),
      status: z.enum(["delivered", "read"]).optional(),
    }),
  ),
  dealState: z.object({
    tier: z.enum(["A", "B", "C"]),
    currentOffer: z.number().nullable(),
    ceiling: z.number(),
    stage: z.enum(["opener", "intro", "qualifying", "negotiating", "closing", "stalled", "signed", "lost"]),
    turnsElapsed: z.number(),
  }),
});

function normalizeDealState(creator: CreatorPersona, dealState: DealState): DealState {
  const tierRates = rateSheet[creator.tier];

  return {
    ...dealState,
    tier: creator.tier,
    ceiling: tierRates.ceiling,
  };
}

function normalizeAgentResponse(
  parsed: AgentResponse,
  creator: CreatorPersona,
  messageCount: number,
) {
  const rates = rateSheet[creator.tier];

  if (parsed.state_update.offer !== null && parsed.state_update.offer <= 0) {
    parsed.state_update.offer = null;
  }

  const isNegotiating = ["negotiating", "closing", "signed"].includes(parsed.state_update.stage);

  if (isNegotiating && parsed.state_update.offer !== null) {
    parsed.state_update.offer = Math.min(
      rates.ceiling,
      Math.max(rates.floor, parsed.state_update.offer),
    );
  }

  if (messageCount === 0) {
    const openerText = `${parsed.message} ${parsed.double_text ?? ""}`.toLowerCase();
    const hasAmpmContext =
      openerText.includes("am:pm") ||
      openerText.includes("ampm") ||
      openerText.includes("creator-led") ||
      openerText.includes("news");
    const asksCreatorQuestion = openerText.includes("?");

    parsed.state_update = {
      ...parsed.state_update,
      stage: "intro",
      offer: null,
    };

    if (!parsed.double_text && (!hasAmpmContext || !asksCreatorQuestion)) {
      parsed.double_text =
        "quick context, AM:PM does short creator-led news and culture reels. you keep the voice, we bring angles + scripting support if useful. open to seeing 2-3 angles for your page?";
    }
  }

  return parsed;
}

export async function POST(request: Request) {
  const temporaryApiKey = request.headers.get("x-openai-key")?.trim();
  const apiKey = process.env.OPENAI_API_KEY ?? temporaryApiKey;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is missing. Add it to .env.local, restart the dev server, or use the temporary local key helper in setup.",
      },
      { status: 503 },
    );
  }

  let payload: z.infer<typeof RequestSchema>;

  try {
    payload = RequestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid chat payload." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });
  const dealState = normalizeDealState(payload.creator, payload.dealState);
  const systemPrompt = buildSystemPrompt({
    creator: payload.creator,
    dealState,
    messages: payload.messages as ChatMessage[],
  });

  try {
    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content:
            "Return only the JSON object for the AM:PM operator's next move.",
        },
      ],
      text: {
        format: zodTextFormat(AgentResponseSchema, "ampm_creator_turn"),
      },
    });

    const parsed = response.output_parsed as AgentResponse | null;

    if (!parsed) {
      return Response.json(
        { error: "The model did not return a usable structured response." },
        { status: 502 },
      );
    }

    return Response.json(normalizeAgentResponse(parsed, payload.creator, payload.messages.length));
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;

    const message =
      status === 429
        ? "OpenAI is rate limiting this demo for a moment. Give it a few seconds and try again."
        : "The AI reply failed. Check the server logs or API key, then try again.";

    return Response.json({ error: message }, { status });
  }
}
