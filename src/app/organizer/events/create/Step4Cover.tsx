"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EventFormData, DressCode, DandiyaSticks, AgeRestriction } from "./types";
import { GRADIENTS } from "./types";

type Props = {
  data: EventFormData;
  onChange: (patch: Partial<EventFormData>) => void;
  organizerId: string;
};

export default function Step4Cover({ data, onChange, organizerId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const labelCls = "block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2";

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadError('Please upload an image file.'); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadError('Image must be under 8 MB.'); return; }
    setUploadError('');
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${organizerId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(path);
      onChange({ coverImageUrl: urlData.publicUrl });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const suggestedGradient = GRADIENTS.find(g => g.id === data.coverGradient) ?? GRADIENTS[0];
  const activeGradient = GRADIENTS.find(g => g.id === data.coverGradient) ?? GRADIENTS[0];

  return (
    <div className="space-y-8">
      {/* Cover image / gradient */}
      <div>
        <label className={labelCls}>Cover Photo</label>

        {/* Sizing guidance */}
        <div className="flex items-start gap-2.5 rounded-xl bg-aubergine/5 border border-aubergine/15 px-3.5 py-3 mb-4">
          <svg className="w-4 h-4 text-aubergine shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="font-ui text-xs text-ink-muted leading-relaxed">
            <span className="font-semibold text-ink">Recommended: 1600 × 900 px (16:9 landscape), JPG/PNG/WEBP under 8 MB.</span> The cover fills the event hero edge-to-edge. Keep faces and key visuals <span className="font-medium text-ink">centered or slightly right</span>, and leave the left side and outer edges clear — the title &amp; details overlay the left on desktop, and the sides crop on mobile.
          </div>
        </div>

        {/* Preview */}
        <div
          className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 flex items-end"
          style={{ background: data.coverImageUrl ? undefined : activeGradient.css }}
        >
          {data.coverImageUrl ? (
            <img src={data.coverImageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-start justify-end p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/50 mb-1">{activeGradient.label} · {activeGradient.name}</p>
              <p className="font-display font-bold text-white text-2xl leading-tight" style={{ letterSpacing: '-0.02em' }}>
                {data.title || 'Your Event'}
              </p>
            </div>
          )}

          {data.coverImageUrl && (
            <button
              type="button"
              onClick={() => onChange({ coverImageUrl: '' })}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload zone */}
        {!data.coverImageUrl && (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-ivory-200 rounded-2xl p-8 text-center cursor-pointer hover:border-aubergine/40 hover:bg-aubergine/5 transition-all"
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-ivory-200 border-t-marigold animate-spin" />
                <p className="font-ui text-sm text-ink-muted">Uploading…</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-ivory border border-ivory-200 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="font-ui font-medium text-ink text-sm">Drop an image or click to upload</p>
                <p className="font-mono text-[10px] text-ink-muted mt-1">JPG, PNG, WEBP — max 8 MB · Recommended: 1600×900</p>
              </>
            )}
          </div>
        )}

        {uploadError && <p className="mt-2 font-ui text-xs text-durga">{uploadError}</p>}

        {/* Gradient picker */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Default gradient covers</p>
            {data.state && (
              <p className="font-ui text-xs text-aubergine">
                {suggestedGradient.name} suggested for {data.state}
              </p>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            {GRADIENTS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => onChange({ coverGradient: g.id })}
                className={`relative rounded-xl overflow-hidden h-16 border-2 transition-all ${
                  data.coverGradient === g.id && !data.coverImageUrl
                    ? 'border-aubergine shadow-md scale-105'
                    : 'border-transparent hover:border-aubergine/40'
                }`}
                title={`${g.name} · ${g.label}`}
              >
                <div className="absolute inset-0" style={{ background: g.css }} />
                <div className="absolute bottom-1 left-0 right-0 text-center">
                  <p className="font-mono text-[8px] text-white/70 tracking-wide">{g.label}</p>
                </div>
                {data.coverGradient === g.id && !data.coverImageUrl && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-aubergine" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Region key */}
          <div className="mt-4 rounded-xl bg-ivory border border-ivory-200 p-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted mb-3">Region color key</p>
            <div className="space-y-2">
              {GRADIENTS.map(g => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-md shrink-0" style={{ background: g.css }} />
                  <span className="font-ui text-xs text-ink-muted"><span className="font-semibold text-ink">{g.label}</span> · {g.name} · {g.states.slice(0, 4).join(', ')}{g.states.length > 4 ? ` +${g.states.length - 4}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Style & Access */}
      <div className="grid sm:grid-cols-3 gap-5">
        {/* Dress code */}
        <div>
          <label className={labelCls}>Dress Code</label>
          <div className="space-y-2">
            {([['none','No requirement','👔'],['encouraged','Traditional encouraged','👘'],['required','Traditional required','🥻']] as [DressCode,string,string][]).map(([id,label,icon]) => (
              <button key={id} type="button" onClick={() => onChange({ dressCode: id })}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${data.dressCode === id ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 bg-white hover:border-aubergine/25'}`}>
                <span className="text-base">{icon}</span>
                <span className={`font-ui text-xs font-medium ${data.dressCode === id ? 'text-aubergine' : 'text-ink'}`}>{label}</span>
              </button>
            ))}
          </div>
          {data.dressCode !== 'none' && (
            <input type="text" placeholder="Add details (optional)" value={data.dressCodeDetails} onChange={e => onChange({ dressCodeDetails: e.target.value })}
              className="mt-2 w-full rounded-xl border border-ivory-200 bg-white px-3.5 py-2.5 font-ui text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-aubergine/20 focus:border-aubergine/40 transition-all" />
          )}
        </div>

        {/* Dandiya sticks */}
        <div>
          <label className={labelCls}>Dandiya Sticks</label>
          <div className="space-y-2">
            {([['not_applicable','Not applicable','🚫'],['provided','Sticks provided','🎁'],['byod','Bring your own','🥢']] as [DandiyaSticks,string,string][]).map(([id,label,icon]) => (
              <button key={id} type="button" onClick={() => onChange({ dandiyaSticks: id })}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${data.dandiyaSticks === id ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 bg-white hover:border-aubergine/25'}`}>
                <span className="text-base">{icon}</span>
                <span className={`font-ui text-xs font-medium ${data.dandiyaSticks === id ? 'text-aubergine' : 'text-ink'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Age restriction */}
        <div>
          <label className={labelCls}>Age Restriction</label>
          <div className="space-y-2">
            {([['all','All ages','👨‍👩‍👧'],['13+','13+','🧒'],['18+','18+ only','🪪'],['21+','21+ only','🍻']] as [AgeRestriction,string,string][]).map(([id,label,icon]) => (
              <button key={id} type="button" onClick={() => onChange({ ageRestriction: id })}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all ${data.ageRestriction === id ? 'border-aubergine bg-aubergine/5' : 'border-ivory-200 bg-white hover:border-aubergine/25'}`}>
                <span className="text-base">{icon}</span>
                <span className={`font-ui text-xs font-medium ${data.ageRestriction === id ? 'text-aubergine' : 'text-ink'}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
