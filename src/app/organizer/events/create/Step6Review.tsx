"use client";

import type { EventFormData } from "./types";
import { GRADIENTS } from "./types";

type Props = {
  data: EventFormData;
  onEdit: (step: number) => void;
};

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-ivory-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-ivory border-b border-ivory-200">
        <p className="font-display font-semibold text-ink text-sm" style={{ letterSpacing: '-0.01em' }}>{title}</p>
        <button type="button" onClick={() => onEdit(step)} className="font-ui text-xs text-aubergine hover:text-aubergine-light transition-colors font-medium">
          Edit →
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-ivory-200 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted shrink-0">{label}</span>
      <span className="font-ui text-sm text-ink text-right">{value}</span>
    </div>
  );
}

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtCurrency(n: string) {
  const v = parseFloat(n);
  return isNaN(v) ? '—' : `$${v.toFixed(2)}`;
}

export default function Step6Review({ data, onEdit }: Props) {
  const gradient = GRADIENTS.find(g => g.id === data.coverGradient) ?? GRADIENTS[0];

  const CATEGORY_LABELS: Record<string, string> = {
    garba: 'Garba', dandiya: 'Dandiya', raas: 'Raas', workshop: 'Workshop', community: 'Community', other: 'Other',
  };
  const DRESS_LABELS: Record<string, string> = {
    none: 'No requirement', encouraged: 'Traditional attire encouraged', required: 'Traditional attire required',
  };
  const DANDIYA_LABELS: Record<string, string> = {
    not_applicable: 'Not applicable', provided: 'Sticks provided', byod: 'Bring your own',
  };
  const PARKING_LABELS: Record<string, string> = {
    free: 'Free parking', paid_nearby: 'Paid parking nearby', street: 'Street parking', valet: 'Valet available', limited: 'Limited', none: '—',
  };

  return (
    <div className="space-y-4">
      {/* Hero preview */}
      <div
        className="relative w-full h-40 rounded-2xl overflow-hidden flex items-end"
        style={{ background: data.coverImageUrl ? undefined : gradient.css }}
      >
        {data.coverImageUrl && <img src={data.coverImageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative px-6 pb-5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-white/60 mb-1">
            {CATEGORY_LABELS[data.category]} · {data.artist || 'No artist listed'}
          </p>
          <p className="font-display font-bold text-white text-2xl" style={{ letterSpacing: '-0.02em' }}>{data.title || 'Untitled Event'}</p>
        </div>
      </div>

      {/* Basics */}
      <Section title="Event Basics" step={0} onEdit={onEdit}>
        <Row label="Title" value={data.title} />
        <Row label="Type" value={CATEGORY_LABELS[data.category]} />
        <Row label="Artist" value={data.artist || undefined} />
        <Row label="Description" value={data.description ? data.description.slice(0, 120) + (data.description.length > 120 ? '…' : '') : undefined} />
        <Row label="Navratri Nights" value={data.navratriNights.length ? `Night${data.navratriNights.length > 1 ? 's' : ''} ${data.navratriNights.join(', ')}` : undefined} />
      </Section>

      {/* Schedule */}
      <Section title="Schedule" step={1} onEdit={onEdit}>
        <Row label="Date" value={fmtDate(data.startDate) + (data.isMultiDay && data.endDate ? ` – ${fmtDate(data.endDate)}` : '')} />
        <Row label="Doors Open" value={data.doorsOpenTime ? fmt12(data.doorsOpenTime) : undefined} />
        <Row label="Start Time" value={fmt12(data.startTime)} />
        <Row label="End Time" value={data.endTime ? fmt12(data.endTime) : undefined} />
      </Section>

      {/* Venue */}
      <Section title="Venue & Location" step={2} onEdit={onEdit}>
        <Row label="Venue" value={data.venueName} />
        <Row label="Address" value={[data.addressLine1, data.addressLine2].filter(Boolean).join(', ')} />
        <Row label="City / State" value={[data.city, data.state, data.zip].filter(Boolean).join(' ')} />
        <Row label="Parking" value={PARKING_LABELS[data.parking] + (data.parkingNotes ? ` · ${data.parkingNotes}` : '')} />
        <Row label="Website" value={data.websiteUrl || undefined} />
      </Section>

      {/* Cover & Style */}
      <Section title="Cover & Style" step={3} onEdit={onEdit}>
        <Row label="Cover" value={data.coverImageUrl ? 'Custom image uploaded' : `${gradient.name} gradient`} />
        <Row label="Dress Code" value={DRESS_LABELS[data.dressCode] + (data.dressCodeDetails ? ` · ${data.dressCodeDetails}` : '')} />
        <Row label="Dandiya Sticks" value={DANDIYA_LABELS[data.dandiyaSticks]} />
        <Row label="Age Restriction" value={data.ageRestriction === 'all' ? 'All ages' : data.ageRestriction} />
      </Section>

      {/* Tickets */}
      <Section title="Ticket Tiers" step={4} onEdit={onEdit}>
        <div className="space-y-3">
          {data.ticketTiers.map((tier, i) => (
            <div key={tier.tempId} className="flex items-center justify-between py-2 border-b border-ivory-200 last:border-0">
              <div>
                <p className="font-ui font-semibold text-ink text-sm">{tier.name || `Tier ${i + 1}`}</p>
                <p className="font-ui text-xs text-ink-muted mt-0.5">
                  {fmtCurrency(tier.price)} · {tier.quantity || '—'} tickets
                  {tier.groupDiscountEnabled && tier.groupDiscountMode === 'scaling'
                    ? ` · Scaling: ${tier.groupDiscountTiers.filter(l => l.minQty && l.percent).map(l => `${l.minQty}+→${l.percent}%`).join(' · ')}`
                    : tier.groupDiscountEnabled && tier.groupDiscountValue && tier.groupDiscountMinQty
                      ? ` · Group: ${tier.groupDiscountType === 'percentage' ? `${tier.groupDiscountValue}% off` : `$${tier.groupDiscountValue} off`} for ${tier.groupDiscountMinQty}+`
                      : ''}
                </p>
              </div>
              {tier.saleStartDate || tier.saleEndDate ? (
                <p className="font-mono text-[10px] text-ink-muted">
                  {tier.saleStartDate ? fmtDate(tier.saleStartDate) : '...'} → {tier.saleEndDate ? fmtDate(tier.saleEndDate) : 'event'}
                </p>
              ) : null}
            </div>
          ))}
          {data.capacity && <p className="font-mono text-[10px] text-ink-muted pt-1">Total capacity: {data.capacity}</p>}
        </div>
      </Section>

      {/* Submit notice */}
      <div className="rounded-2xl bg-marigold/10 border border-marigold/25 p-5 flex gap-4">
        <span className="text-2xl shrink-0">🔍</span>
        <div>
          <p className="font-ui font-semibold text-ink text-sm mb-1">Submitted for admin review</p>
          <p className="font-ui text-xs text-ink-muted leading-relaxed">
            Our team typically reviews events within 24 hours. You&apos;ll receive a notification once your event is approved and published. You can edit the event while it&apos;s in review.
          </p>
        </div>
      </div>
    </div>
  );
}
