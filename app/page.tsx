"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronLeft,
  Activity,
  Cpu,
  KeyRound,
  Loader2,
  MessagesSquare,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import {
  formatInr,
  parseFollowerCount,
  presetCreators,
  rateSheet,
  tierFromFollowers,
} from "@/lib/creators";
import type { AgentResponse, ChatMessage, CreatorPersona, DealState } from "@/lib/types";

type CustomCreatorForm = {
  handle: string;
  followers: string;
  niche: string;
  recentPost: string;
  vibe: string;
};

const emptyCustomCreator: CustomCreatorForm = {
  handle: "@",
  followers: "",
  niche: "",
  recentPost: "",
  vibe: "",
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function makeDealState(creator: CreatorPersona): DealState {
  const rates = rateSheet[creator.tier];

  return {
    tier: creator.tier,
    currentOffer: rates.floor,
    ceiling: rates.ceiling,
    stage: "opener",
    turnsElapsed: 0,
  };
}

function customToPersona(form: CustomCreatorForm): CreatorPersona {
  const followers = parseFollowerCount(form.followers);
  const tier = tierFromFollowers(followers);

  return {
    id: "custom",
    label: "Custom",
    handle: form.handle.trim().startsWith("@")
      ? form.handle.trim()
      : `@${form.handle.trim()}`,
    followers,
    followersLabel: form.followers.trim(),
    niche: form.niche.trim(),
    location: "India",
    recent_post: form.recentPost.trim(),
    voice_description: form.vibe.trim(),
    tier,
  };
}

function typingDelay(content: string) {
  return Math.min(4200, Math.max(1100, content.length * 38));
}

export default function Home() {
  const [selectedId, setSelectedId] = useState("kabir");
  const [customForm, setCustomForm] = useState<CustomCreatorForm>(emptyCustomCreator);
  const [creator, setCreator] = useState<CreatorPersona | null>(null);
  const [dealState, setDealState] = useState<DealState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [stagedPlan, setStagedPlan] = useState<AgentResponse | null>(null);
  const [lastPlan, setLastPlan] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [temporaryApiKey, setTemporaryApiKey] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedPreset = useMemo(
    () => presetCreators.find((item) => item.id === selectedId) ?? presetCreators[0],
    [selectedId],
  );

  const canStartCustom =
    customForm.handle.trim().length > 1 &&
    customForm.followers.trim().length > 0 &&
    customForm.niche.trim().length > 2 &&
    customForm.recentPost.trim().length > 8 &&
    customForm.vibe.trim().length > 4;

  const activePlan = stagedPlan ?? lastPlan;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking, stagedPlan]);

  useEffect(() => {
    const savedKey = window.sessionStorage.getItem("ampm_openai_key") ?? "";
    setTemporaryApiKey(savedKey);
  }, []);

  function updateTemporaryApiKey(value: string) {
    setTemporaryApiKey(value);

    if (value.trim()) {
      window.sessionStorage.setItem("ampm_openai_key", value.trim());
    } else {
      window.sessionStorage.removeItem("ampm_openai_key");
    }
  }

  async function requestAgentReply(nextMessages: ChatMessage[], nextDealState: DealState, activeCreator: CreatorPersona) {
    setIsThinking(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(temporaryApiKey.trim() ? { "x-openai-key": temporaryApiKey.trim() } : {}),
        },
        body: JSON.stringify({
          creator: activeCreator,
          messages: nextMessages,
          dealState: nextDealState,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "The AI reply failed.");
      }

      const plan = body as AgentResponse;
      setStagedPlan(plan);

      const updatedDealState: DealState = {
        ...nextDealState,
        stage: plan.state_update.stage,
        currentOffer: plan.state_update.offer ?? nextDealState.currentOffer,
        turnsElapsed: nextDealState.turnsElapsed + 1,
      };

      setDealState(updatedDealState);
      await new Promise((resolve) => setTimeout(resolve, typingDelay(plan.message)));

      const firstAgentMessage: ChatMessage = {
        id: makeId(),
        role: "agent",
        content: plan.message,
        createdAt: new Date().toISOString(),
        status: "delivered",
      };

      setMessages((current) => [...current, firstAgentMessage]);

      if (plan.double_text) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        const doubleText: ChatMessage = {
          id: makeId(),
          role: "agent",
          content: plan.double_text,
          createdAt: new Date().toISOString(),
          status: "delivered",
        };
        setMessages((current) => [...current, doubleText]);
      }

      setLastPlan(plan);
      setStagedPlan(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something broke while replying.");
    } finally {
      setIsThinking(false);
    }
  }

  function startDemo() {
    const activeCreator = selectedId === "custom" ? customToPersona(customForm) : selectedPreset;
    const initialDealState = makeDealState(activeCreator);

    setCreator(activeCreator);
    setDealState(initialDealState);
    setMessages([]);
    setLastPlan(null);
    setStagedPlan(null);
    setSetupCollapsed(true);
    void requestAgentReply([], initialDealState, activeCreator);
  }

  function resetDemo() {
    setCreator(null);
    setDealState(null);
    setMessages([]);
    setInput("");
    setIsThinking(false);
    setSetupCollapsed(false);
    setStagedPlan(null);
    setLastPlan(null);
    setError(null);
  }

  function sendCreatorMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!creator || !dealState || !input.trim() || isThinking) {
      return;
    }

    const creatorMessage: ChatMessage = {
      id: makeId(),
      role: "creator",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, creatorMessage];

    setMessages(nextMessages);
    setInput("");
    void requestAgentReply(nextMessages, dealState, creator);
  }

  return (
    <main className="relative z-10 min-h-screen overflow-hidden px-4 py-4 text-zinc-100 sm:px-5 lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1500px] flex-col gap-4">
        <header className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-lime">
              <span className="h-2 w-2 rounded-full bg-lime shadow-[0_0_20px_rgba(212,255,58,0.7)]" />
              AM:PM Network
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
              creator negotiation room
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>simulated instagram dm</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>real ai operator</span>
          </div>
        </header>

        <section
          className={clsx(
            "grid flex-1 gap-4",
            setupCollapsed
              ? "lg:grid-cols-[minmax(220px,0.58fr)_minmax(420px,1.28fr)_minmax(360px,1.04fr)]"
              : "lg:grid-cols-[minmax(300px,0.82fr)_minmax(420px,1.18fr)_minmax(360px,1fr)]",
          )}
        >
          <SetupPanel
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            customForm={customForm}
            setCustomForm={setCustomForm}
            collapsed={setupCollapsed}
            creator={creator}
            canStartCustom={canStartCustom}
            temporaryApiKey={temporaryApiKey}
            setTemporaryApiKey={updateTemporaryApiKey}
            onStart={startDemo}
            onReset={resetDemo}
          />

          <ChatPanel
            creator={creator}
            messages={messages}
            input={input}
            setInput={setInput}
            isThinking={isThinking}
            hasStagedPlan={Boolean(stagedPlan)}
            error={error}
            scrollRef={scrollRef}
            onSubmit={sendCreatorMessage}
          />

          <ThoughtPanel
            creator={creator}
            dealState={dealState}
            activePlan={activePlan}
            isThinking={isThinking}
          />
        </section>

        <footer className="flex items-center justify-between border-t border-white/10 py-3 text-xs text-zinc-500">
          <span>no instagram api, no database, refresh resets the room</span>
          <a href="/about" className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-lime">
            about
          </a>
        </footer>
      </div>
    </main>
  );
}

function SetupPanel({
  selectedId,
  setSelectedId,
  customForm,
  setCustomForm,
  collapsed,
  creator,
  canStartCustom,
  temporaryApiKey,
  setTemporaryApiKey,
  onStart,
  onReset,
}: {
  selectedId: string;
  setSelectedId: (id: string) => void;
  customForm: CustomCreatorForm;
  setCustomForm: (form: CustomCreatorForm) => void;
  collapsed: boolean;
  creator: CreatorPersona | null;
  canStartCustom: boolean;
  temporaryApiKey: string;
  setTemporaryApiKey: (value: string) => void;
  onStart: () => void;
  onReset: () => void;
}) {
  return (
    <aside className="min-h-[220px] rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-glow backdrop-blur-xl">
      <AnimatePresence mode="wait">
        {collapsed && creator ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="flex h-full flex-col justify-between gap-4"
          >
            <div>
              <button
                type="button"
                onClick={onReset}
                className="mb-4 inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                <ChevronLeft size={16} />
                setup
              </button>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">creator</div>
                <div className="mt-3 text-2xl font-semibold text-white">{creator.handle}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  {creator.followersLabel} followers, {creator.niche}
                </div>
                <p className="mt-4 text-sm leading-5 text-zinc-300">{creator.recent_post}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black transition hover:bg-lime"
            >
              <RotateCcw size={16} />
              reset room
            </button>
            <KeyHelper value={temporaryApiKey} onChange={setTemporaryApiKey} compact />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="mb-5">
              <div className="text-xs uppercase tracking-[0.22em] text-lime">setup</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">you are the creator</h2>
              <p className="mt-2 text-sm leading-5 text-zinc-400">pick one or write your own</p>
            </div>

            <div className="grid gap-3">
              {presetCreators.map((item) => (
                <PersonaCard
                  key={item.id}
                  creator={item}
                  selected={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                />
              ))}

              <button
                type="button"
                onClick={() => setSelectedId("custom")}
                className={clsx(
                  "rounded-lg border p-4 text-left transition",
                  selectedId === "custom"
                    ? "border-lime bg-lime/10"
                    : "border-white/10 bg-black/20 hover:border-white/25",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">custom</span>
                  {selectedId === "custom" ? <Check size={17} className="text-lime" /> : null}
                </div>
                <p className="mt-1 text-sm text-zinc-400">paste a creator context</p>
              </button>
            </div>

            {selectedId === "custom" ? (
              <div className="mt-4 grid gap-3">
                <TextInput
                  label="handle"
                  value={customForm.handle}
                  onChange={(value) => setCustomForm({ ...customForm, handle: value })}
                />
                <TextInput
                  label="followers"
                  value={customForm.followers}
                  placeholder="126k"
                  onChange={(value) => setCustomForm({ ...customForm, followers: value })}
                />
                <TextInput
                  label="niche"
                  value={customForm.niche}
                  placeholder="tech explainers"
                  onChange={(value) => setCustomForm({ ...customForm, niche: value })}
                />
                <TextareaInput
                  label="recent post"
                  value={customForm.recentPost}
                  onChange={(value) => setCustomForm({ ...customForm, recentPost: value })}
                />
                <TextareaInput
                  label="vibe"
                  value={customForm.vibe}
                  onChange={(value) => setCustomForm({ ...customForm, vibe: value })}
                />
              </div>
            ) : null}

            <KeyHelper value={temporaryApiKey} onChange={setTemporaryApiKey} />

            <button
              type="button"
              onClick={onStart}
              disabled={selectedId === "custom" && !canStartCustom}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-lime text-sm font-semibold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              <MessagesSquare size={17} />
              start
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function KeyHelper({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasKey = value.trim().length > 0;

  return (
    <div className={clsx("rounded-lg border border-white/10 bg-black/25", compact ? "p-3" : "mt-4 p-4")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <KeyRound size={16} className={hasKey ? "text-lime" : "text-zinc-500"} />
          OpenAI key
        </span>
        <span className={clsx("text-xs", hasKey ? "text-lime" : "text-zinc-500")}>
          {hasKey ? "temporary key added" : "help me add it"}
        </span>
      </button>

      {open ? (
        <div className="mt-3 grid gap-3">
          <div className="rounded-md border border-lime/15 bg-lime/[0.06] p-3 text-xs leading-5 text-zinc-300">
            Best path: add <span className="font-[var(--font-jetbrains)] text-lime">OPENAI_API_KEY</span>{" "}
            to <span className="font-[var(--font-jetbrains)] text-lime">.env.local</span>, then restart{" "}
            <span className="font-[var(--font-jetbrains)] text-lime">npm run dev</span>. For Vercel, set it as an
            environment variable.
          </div>
          <label className="grid gap-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
            temporary local preview key
            <input
              value={value}
              type="password"
              autoComplete="off"
              placeholder="paste key for this browser session"
              onChange={(event) => onChange(event.target.value)}
              className="h-10 rounded-md border border-white/10 bg-black/40 px-3 text-sm normal-case tracking-normal text-white outline-none transition placeholder:text-zinc-700 focus:border-lime"
            />
          </label>
          <p className="text-xs leading-5 text-zinc-500">
            This is stored only in this browser&apos;s sessionStorage and sent to this app&apos;s API route as a
            request header. Do not commit real keys.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PersonaCard({
  creator,
  selected,
  onClick,
}: {
  creator: CreatorPersona;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-lg border p-4 text-left transition",
        selected ? "border-lime bg-lime/10" : "border-white/10 bg-black/20 hover:border-white/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">{creator.handle}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {creator.followersLabel}, {creator.niche}
          </div>
        </div>
        {selected ? <Check size={17} className="mt-1 shrink-0 text-lime" /> : null}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc-500">{creator.voice_description}</p>
    </button>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm normal-case tracking-normal text-white outline-none transition placeholder:text-zinc-700 focus:border-lime"
      />
    </label>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="resize-none rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case leading-5 tracking-normal text-white outline-none transition placeholder:text-zinc-700 focus:border-lime"
      />
    </label>
  );
}

function ChatPanel({
  creator,
  messages,
  input,
  setInput,
  isThinking,
  hasStagedPlan,
  error,
  scrollRef,
  onSubmit,
}: {
  creator: CreatorPersona | null;
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isThinking: boolean;
  hasStagedPlan: boolean;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#161617] shadow-phone">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#1f1f21]/95 px-4 font-chat">
        <div>
          <div className="text-[11px] text-zinc-500">AM:PM operator</div>
          <div className="text-sm font-semibold text-white">
            {creator ? creator.handle : "pick a creator"}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs text-zinc-400">
          <span className={clsx("h-2 w-2 rounded-full", creator ? "bg-lime" : "bg-zinc-600")} />
          {creator ? "live" : "idle"}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-thin flex flex-1 flex-col gap-3 overflow-y-auto bg-[#101011] px-3 py-5 font-chat sm:px-5"
      >
        {messages.length === 0 && !isThinking ? (
          <div className="m-auto max-w-xs text-center text-sm leading-5 text-zinc-500">
            start the room and the first DM appears here
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isThinking ? (
          <div className="flex flex-col items-start gap-1">
            <div className="flex w-fit items-center gap-1 rounded-[18px] bg-[#2c2c2e] px-4 py-3">
              <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
              <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
              <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
            </div>
            <div className="pl-2 text-[11px] text-zinc-600">
              {hasStagedPlan ? "typing" : "thinking"}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-ampm/25 bg-ampm/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-[#1f1f21] p-3 font-chat">
        <textarea
          value={input}
          rows={1}
          disabled={!creator || isThinking}
          placeholder={creator ? "Message" : "start first"}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-[20px] border border-white/10 bg-[#111113] px-4 py-2.5 text-[15px] leading-5 text-white outline-none placeholder:text-zinc-600 focus:border-white/30 disabled:cursor-not-allowed disabled:text-zinc-500"
        />
        <button
          type="submit"
          disabled={!creator || !input.trim() || isThinking}
          aria-label="Send"
          title="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-imessage text-white transition hover:scale-105 disabled:scale-100 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isThinking ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
        </button>
      </form>
    </section>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAgent = message.role === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className={clsx("flex flex-col", isAgent ? "items-end" : "items-start")}
    >
      <div
        className={clsx(
          "max-w-[82%] whitespace-pre-wrap rounded-[20px] px-4 py-2.5 text-[15px] leading-5 sm:max-w-[76%]",
          isAgent
            ? "rounded-br-[6px] bg-imessage text-white"
            : "rounded-bl-[6px] bg-graphite text-white",
        )}
      >
        {message.content}
      </div>
      <div className={clsx("mt-1 text-[11px] text-[#6b6b6b]", isAgent ? "pr-2 text-right" : "pl-2")}>
        {formatTime(message.createdAt)}
        {isAgent && message.status ? `, ${message.status}` : ""}
      </div>
    </motion.div>
  );
}

function ThoughtPanel({
  creator,
  dealState,
  activePlan,
  isThinking,
}: {
  creator: CreatorPersona | null;
  dealState: DealState | null;
  activePlan: AgentResponse | null;
  isThinking: boolean;
}) {
  const score = activePlan?.fit_score ?? null;
  const pendingTrace = useMemo(
    () => [
      {
        agent: "interaction_agent",
        status: "done",
        summary: "framing creator ops task",
        detail: "building context from persona, rate sheet, stage, and latest reply",
        latency_ms: 86,
      },
      {
        agent: "tone_reader",
        status: "running",
        summary: "reading creator energy",
        detail: "checking whether to stay casual, tighten up, or ask a qualifying question",
        latency_ms: 0,
      },
      {
        agent: "fit_scorer",
        status: "waiting",
        summary: "waiting for tone read",
        detail: "will score niche fit, audience size, and likely brand match",
        latency_ms: 0,
      },
      {
        agent: "negotiation_simulator",
        status: "waiting",
        summary: "queued",
        detail: "will compare hold, counter, bonus, and walk-away paths",
        latency_ms: 0,
      },
      {
        agent: "guardrail",
        status: "waiting",
        summary: "queued",
        detail: "will check ceiling secrecy, banned words, offer limits, and tone",
        latency_ms: 0,
      },
      {
        agent: "message_writer",
        status: "waiting",
        summary: "queued",
        detail: "will turn the selected strategy into the final AM:PM DM",
        latency_ms: 0,
      },
    ] satisfies AgentResponse["agent_trace"],
    [],
  );
  const trace = activePlan?.agent_trace ?? (isThinking ? pendingTrace : []);
  const simulation = activePlan?.monte_carlo ?? null;
  const guardrails = activePlan?.guardrails ?? null;

  return (
    <aside className="min-h-[620px] overflow-hidden rounded-lg border border-white/10 bg-panel shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div className="p-4 pb-0">
          <div className="text-xs uppercase tracking-[0.22em] text-lime">agent room</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">ops swarm</h2>
        </div>
        <div className="p-4 pb-0">
          <Sparkles size={18} className={clsx(isThinking ? "text-lime" : "text-zinc-600")} />
        </div>
      </div>

      <div className="grid gap-3 px-4 font-[var(--font-jetbrains)] text-sm">
        <StatRow label="fit score" value={score === null ? "--" : `${score}/10`} accent={score !== null && score >= 8} />
        <StatRow label="offer" value={formatInr(dealState?.currentOffer ?? null)} />
        <StatRow label="ceiling" value={formatInr(dealState?.ceiling ?? null)} muted />
        <StatRow label="stage" value={dealState?.stage ?? "idle"} />
        <StatRow label="tier" value={creator ? `Tier ${creator.tier}` : "--"} />
      </div>

      <div className="mx-4 mt-5 rounded-lg border border-lime/20 bg-lime/[0.07] p-4">
        <div className="mb-2 text-xs uppercase tracking-[0.22em] text-lime">move</div>
        <AnimatePresence mode="wait">
          <motion.p
            key={activePlan?.next_move ?? "empty"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="min-h-24 text-base leading-6 text-zinc-100"
          >
            {activePlan?.next_move ??
              "waiting for the first creator room to start"}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="scrollbar-thin mt-4 max-h-[520px] overflow-y-auto px-4 pb-4">
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
            <Cpu size={14} />
            live workers
          </div>
          <div className="grid gap-2">
            {trace.length > 0 ? (
              trace.map((step, index) => (
                <motion.div
                  key={`${step.agent}-${index}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 32, delay: index * 0.05 }}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={clsx(
                          "h-2 w-2 shrink-0 rounded-full",
                          step.status === "done"
                            ? "bg-lime shadow-[0_0_14px_rgba(212,255,58,0.6)]"
                            : step.status === "running"
                              ? "animate-pulse bg-imessage shadow-[0_0_14px_rgba(11,132,255,0.7)]"
                              : "bg-zinc-700",
                        )}
                      />
                      <span className="truncate font-[var(--font-jetbrains)] text-xs text-zinc-100">
                        {step.agent.replaceAll("_", " ")}
                      </span>
                    </div>
                    <span className="shrink-0 font-[var(--font-jetbrains)] text-[11px] text-zinc-500">
                      {step.status === "waiting" ? "wait" : step.status === "running" ? "run" : `${step.latency_ms}ms`}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white">{step.summary}</div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{step.detail}</p>
                </motion.div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-white/10 p-4 text-sm leading-5 text-zinc-500">
                start the room, the workers will light up here before the DM lands
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
            <Activity size={14} />
            monte carlo
          </div>
          {simulation ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2 font-[var(--font-jetbrains)] text-xs">
                <MiniStat label="samples" value={`${simulation.sample_size}`} />
                <MiniStat label="accept" value={`${Math.round(simulation.acceptance_probability * 100)}%`} accent />
                <MiniStat label="cost" value={formatInr(simulation.expected_cost)} />
              </div>
              <div className="rounded-md border border-lime/15 bg-lime/[0.05] p-3">
                <div className="font-[var(--font-jetbrains)] text-xs text-lime">
                  selected, {simulation.selected_move.replaceAll("_", " ")}
                </div>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-zinc-400">
                  <p>best, {simulation.best_case}</p>
                  <p>worst, {simulation.worst_case}</p>
                </div>
              </div>
              <div className="grid gap-2">
                {simulation.rejected_moves.map((move) => (
                  <div key={move.move} className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3 font-[var(--font-jetbrains)] text-xs">
                      <span className="text-zinc-300">{move.move.replaceAll("_", " ")}</span>
                      <span className="text-zinc-500">{Math.round(move.acceptance_probability * 100)}%</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{move.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-5 text-zinc-500">
              waiting to simulate counter paths
            </p>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-zinc-500">
            <ShieldCheck size={14} />
            guardrail
          </div>
          {guardrails ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <CheckPill label="ceiling hidden" ok={guardrails.ceiling_hidden} />
                <CheckPill label="banned words" ok={guardrails.banned_words_clear} />
                <CheckPill label="under ceiling" ok={guardrails.no_over_offer} />
                <CheckPill label="human tone" ok={guardrails.human_tone} />
              </div>
              <p className="text-xs leading-5 text-zinc-500">{guardrails.notes}</p>
            </div>
          ) : (
            <p className="text-sm leading-5 text-zinc-500">waiting for safety check</p>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.22em] text-zinc-500">voice notes</div>
          <p className="min-h-14 text-sm leading-5 text-zinc-400">
            {activePlan?.voice_notes ?? activePlan?.thought ?? "no operator read yet"}
          </p>
        </div>
      </div>
    </aside>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{label}</div>
      <div className={clsx("mt-1 truncate", accent ? "text-lime" : "text-zinc-100")}>{value}</div>
    </div>
  );
}

function CheckPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-md border px-2 py-1.5",
        ok ? "border-lime/20 bg-lime/[0.06] text-lime" : "border-ampm/20 bg-ampm/[0.06] text-red-200",
      )}
    >
      {label}
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</span>
      <span className={clsx("text-right", accent ? "text-lime" : muted ? "text-zinc-500" : "text-zinc-100")}>
        {value}
      </span>
    </div>
  );
}
