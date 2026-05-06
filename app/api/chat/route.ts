import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { rateSheet } from "@/lib/creators";
import { buildSystemPrompt } from "@/lib/prompt";
import type { ChatMessage, CreatorPersona, DealState } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AgentResponseSchema = z.object({
  thought: z.string(),
  fit_score: z.number().min(1).max(10),
  next_move: z.string(),
  state_update: z.object({
    stage: z.enum(["opener", "qualifying", "negotiating", "closing", "stalled", "signed", "lost"]),
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
    stage: z.enum(["opener", "qualifying", "negotiating", "closing", "stalled", "signed", "lost"]),
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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is missing. Add it to .env.local, then restart the dev server.",
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

    const parsed = response.output_parsed;

    if (!parsed) {
      return Response.json(
        { error: "The model did not return a usable structured response." },
        { status: 502 },
      );
    }

    return Response.json(parsed);
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
