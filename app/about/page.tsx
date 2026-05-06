export default function AboutPage() {
  const proposalUrl = process.env.NEXT_PUBLIC_SCOUT_PROPOSAL_URL;

  return (
    <main className="relative z-10 min-h-screen bg-ink px-5 py-8 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-lime underline decoration-lime/30 underline-offset-4">
          back to demo
        </a>

        <h1 className="mt-10 text-5xl font-semibold leading-none">about this demo</h1>
        <div className="mt-8 space-y-5 text-lg leading-8 text-zinc-300">
          <p>
            This is a narrow proof of the hardest part of Scout: an AI operator that can open,
            qualify, negotiate, and close creator partnerships without sounding like a generic
            outreach bot.
          </p>
          <p>
            Instagram, sheets, contracts, booking, analytics, and CRM state are intentionally
            simulated or omitted. The conversation runs through a real OpenAI API call, while the
            browser keeps the temporary room state.
          </p>
          {proposalUrl ? (
            <p>
              Full Scout proposal:{" "}
              <a
                href={proposalUrl}
                className="text-lime underline decoration-lime/30 underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                open proposal
              </a>
            </p>
          ) : (
            <p className="text-zinc-500">
              Add NEXT_PUBLIC_SCOUT_PROPOSAL_URL before deployment to point this page at the full
              Scout proposal.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
