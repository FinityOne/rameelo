"use client";

export default function AdminPlatformPage() {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-ink text-xl" style={{ letterSpacing: "-0.02em" }}>Platform Settings</h2>

      <div className="bg-white rounded-2xl border border-ivory-200 divide-y divide-ivory-200">
        {[
          { label: "Maintenance Mode", desc: "Take the platform offline for all non-admin users", enabled: false },
          { label: "New Registrations", desc: "Allow new users to create accounts", enabled: true },
          { label: "Ticket Sales", desc: "Enable ticket purchasing across all events", enabled: true },
          { label: "Group Orders", desc: "Allow users to create and join group orders", enabled: true },
          { label: "Referral Program", desc: "Enable refer-and-earn for all members", enabled: true },
        ].map((setting) => (
          <div key={setting.label} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-ui font-semibold text-ink text-sm">{setting.label}</p>
              <p className="font-ui text-ink-muted text-xs mt-0.5">{setting.desc}</p>
            </div>
            <button
              className={`relative w-11 h-6 rounded-full transition-colors ${setting.enabled ? "bg-peacock" : "bg-ivory-200"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${setting.enabled ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-ivory-200 p-10 text-center">
        <p className="text-3xl mb-3">⚙️</p>
        <p className="font-display font-semibold text-ink text-base mb-1" style={{ letterSpacing: "-0.015em" }}>More settings coming soon</p>
        <p className="font-ui text-ink-muted text-sm">Email templates, fee configuration, and integrations will live here.</p>
      </div>
    </div>
  );
}
