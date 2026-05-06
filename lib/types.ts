export type CreatorPersona = {
  id: string;
  label: string;
  handle: string;
  followers: number;
  followersLabel: string;
  niche: string;
  location: string;
  recent_post: string;
  voice_description: string;
  tier: "A" | "B" | "C";
};

export type ChatMessage = {
  id: string;
  role: "creator" | "agent";
  content: string;
  createdAt: string;
  status?: "delivered" | "read";
};

export type DealState = {
  tier: "A" | "B" | "C";
  currentOffer: number | null;
  ceiling: number;
  stage: "opener" | "intro" | "qualifying" | "negotiating" | "closing" | "stalled" | "signed" | "lost";
  turnsElapsed: number;
};

export type AgentTraceStep = {
  agent:
    | "interaction_agent"
    | "tone_reader"
    | "fit_scorer"
    | "negotiation_simulator"
    | "guardrail"
    | "message_writer";
  status: "done" | "running" | "waiting";
  summary: string;
  detail: string;
  latency_ms: number;
};

export type RejectedMove = {
  move: string;
  acceptance_probability: number;
  expected_cost: number;
  reason: string;
};

export type MonteCarloResult = {
  sample_size: number;
  selected_move: string;
  acceptance_probability: number;
  expected_cost: number;
  best_case: string;
  worst_case: string;
  rejected_moves: RejectedMove[];
};

export type GuardrailResult = {
  ceiling_hidden: boolean;
  banned_words_clear: boolean;
  no_over_offer: boolean;
  human_tone: boolean;
  notes: string;
};

export type AgentResponse = {
  thought: string;
  fit_score: number;
  next_move: string;
  agent_trace: AgentTraceStep[];
  monte_carlo: MonteCarloResult;
  voice_notes: string;
  guardrails: GuardrailResult;
  state_update: {
    stage: DealState["stage"];
    offer: number | null;
  };
  message: string;
  double_text?: string | null;
};
