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
  stage: "opener" | "qualifying" | "negotiating" | "closing" | "stalled" | "signed" | "lost";
  turnsElapsed: number;
};

export type AgentResponse = {
  thought: string;
  fit_score: number;
  next_move: string;
  state_update: {
    stage: DealState["stage"];
    offer: number | null;
  };
  message: string;
  double_text?: string | null;
};
