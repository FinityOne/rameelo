"use client";

export default function OrganizerTicketsPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Ticket Management</h2>

      <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-16 text-center">
        <p className="text-4xl mb-4">🎟️</p>
        <p className="font-display font-semibold text-ink text-lg mb-1" style={{ letterSpacing: "-0.015em" }}>No tickets to manage yet</p>
        <p className="font-ui text-ink-muted text-sm max-w-xs mx-auto">Create an event and publish ticket tiers to manage check-ins, transfers, and refunds here.</p>
      </div>
    </div>
  );
}
