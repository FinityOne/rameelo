"use client";

import type { EventFormData } from "./types";

type Props = {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
};

export default function Step2Schedule({ data, onChange }: Props) {
  const inputCls = "w-full rounded-xl border border-ivory-200 bg-white px-4 py-3 font-ui text-sm text-ink focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all";
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2";

  return (
    <div className="space-y-7">
      {/* Multi-day toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-ivory border border-ivory-200">
        <div>
          <p className="font-ui font-semibold text-ink text-sm">Multi-day event</p>
          <p className="font-ui text-xs text-ink-muted mt-0.5">Spanning more than one calendar day</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ isMultiDay: !data.isMultiDay, endDate: '' })}
          className={`relative w-12 h-6 rounded-full transition-colors ${data.isMultiDay ? 'bg-aubergine' : 'bg-ivory-200'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${data.isMultiDay ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Dates */}
      <div className={`grid gap-4 ${data.isMultiDay ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className={labelCls}>{data.isMultiDay ? 'Start Date *' : 'Event Date *'}</label>
          <input
            type="date"
            value={data.startDate}
            onChange={e => onChange({ startDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className={inputCls}
          />
        </div>
        {data.isMultiDay && (
          <div>
            <label className={labelCls}>End Date *</label>
            <input
              type="date"
              value={data.endDate}
              onChange={e => onChange({ endDate: e.target.value })}
              min={data.startDate || new Date().toISOString().split('T')[0]}
              className={inputCls}
            />
          </div>
        )}
      </div>

      {/* Times */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Doors Open</label>
          <input
            type="time"
            value={data.doorsOpenTime}
            onChange={e => onChange({ doorsOpenTime: e.target.value })}
            className={inputCls}
          />
          <p className="mt-1.5 font-mono text-[10px] text-ink-muted/60">Optional</p>
        </div>
        <div>
          <label className={labelCls}>Start Time *</label>
          <input
            type="time"
            value={data.startTime}
            onChange={e => onChange({ startTime: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <input
            type="time"
            value={data.endTime}
            onChange={e => onChange({ endTime: e.target.value })}
            className={inputCls}
          />
          <p className="mt-1.5 font-mono text-[10px] text-ink-muted/60">Optional</p>
        </div>
      </div>

      {/* Schedule preview */}
      {data.startDate && data.startTime && (
        <div className="rounded-2xl bg-aubergine/5 border border-aubergine/15 p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-aubergine/60 mb-3">Schedule preview</p>
          <div className="space-y-2">
            {data.doorsOpenTime && (
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-ivory-200 shrink-0" />
                <span className="font-ui text-sm text-ink-muted">
                  Doors open · {fmt12(data.doorsOpenTime)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-marigold shrink-0" />
              <span className="font-ui text-sm text-ink font-medium">
                {fmtDate(data.startDate)}{data.isMultiDay && data.endDate ? ` – ${fmtDate(data.endDate)}` : ''} · {fmt12(data.startTime)}
                {data.endTime ? ` – ${fmt12(data.endTime)}` : ''}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
