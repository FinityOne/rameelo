"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  /** "banner" = wide 16:9 strip · "square" = 1:1 portrait · "avatar" = small circular headshot */
  shape: "banner" | "square" | "avatar";
}

const GRADIENTS = {
  banner: "linear-gradient(135deg, #f0ebf4 0%, #e8f4f7 50%, #fdf6e8 100%)",
  square: "linear-gradient(145deg, #2E1B30 0%, #1a3a4a 50%, #1e2a10 100%)",
  avatar: "linear-gradient(145deg, #3d1f42 0%, #1a2e3a 100%)",
};

export default function ImageUpload({ value, onChange, label, hint, shape }: Props) {
  const inputRef          = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError("");

    // Simulate progress ticks while uploading
    const ticker = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 200);

    const supabase = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `collegiate/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("team-media")
      .upload(path, file, { upsert: false, contentType: file.type });

    clearInterval(ticker);

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      setProgress(0);
      // Clear file input so the same file can be retried
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProgress(100);
    const { data } = supabase.storage.from("team-media").getPublicUrl(path);
    onChange(data.publicUrl);

    setTimeout(() => { setUploading(false); setProgress(0); }, 400);
  }

  const hasImage = !!value;

  return (
    <div>
      {/* Label — hidden for avatar shape (label appears as tooltip/overlay only) */}
      {shape !== "avatar" && (
        <>
          <label className="font-ui text-xs font-semibold text-ink/55 block mb-1">
            {label}
          </label>
          {hint && <p className="font-mono text-[9px] text-ink/30 mb-2 leading-relaxed">{hint}</p>}
        </>
      )}

      {/* Upload zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative overflow-hidden border-2 transition-all cursor-pointer group ${
          shape === "avatar" ? "rounded-full" : "rounded-2xl"
        } ${
          hasImage
            ? "border-ink/10 hover:border-aubergine/30"
            : "border-dashed border-ink/15 hover:border-aubergine/30 hover:bg-aubergine/2"
        } ${shape === "banner" ? "w-full h-40" : shape === "avatar" ? "w-[72px] h-[72px]" : "w-40 h-40"} ${uploading ? "cursor-wait" : ""}`}
      >
        {/* Image or gradient placeholder */}
        {hasImage ? (
          <img
            src={value}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: GRADIENTS[shape] }}
          >
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%)",
              }}
            />
          </div>
        )}

        {/* Dark gradient overlay on hover so the action is visible */}
        {!uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 group-hover:bg-black/35 transition-all duration-200">
            <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-aubergine" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="font-ui text-xs font-semibold text-white drop-shadow">
                {hasImage ? "Change photo" : "Upload photo"}
              </p>
            </div>
          </div>
        )}

        {/* Empty state icon (only visible when no image and not hovering) */}
        {!hasImage && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 group-hover:opacity-0 transition-opacity">
            {shape === "avatar" ? (
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <>
                <svg className="w-6 h-6 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="font-ui text-[11px] text-ink/35 font-medium">{label}</p>
                <p className="font-mono text-[9px] text-ink/25">Click to upload</p>
              </>
            )}
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-aubergine/20 border-t-aubergine animate-spin" />
            <div className="w-24">
              <div className="h-1 bg-ink/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-aubergine rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="font-mono text-[9px] text-ink/40 uppercase tracking-wider">Uploading…</p>
          </div>
        )}
      </div>

      {/* Actions row (only when image is set; hidden for avatar — use hover overlay) */}
      {hasImage && !uploading && shape !== "avatar" && (
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ink/40 hover:text-aubergine transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Replace
          </button>
          <span className="text-ink/20 text-xs">·</span>
          <button
            type="button"
            onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
            className="font-mono text-[9px] uppercase tracking-wider text-ink/30 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="font-ui text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
