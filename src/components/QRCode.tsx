"use client";

import { useEffect, useState } from "react";
import QR from "qrcode";

/**
 * Renders a real, scannable QR code. The scanner (organizer/scan) and the Apple
 * Wallet pass both speak the `RAMEELO:<orderId>` payload — keep callers consistent.
 */
export default function QRCode({ value, size = 140 }: { value: string; size?: number }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QR.toDataURL(value, {
      margin: 1,
      scale: 8,
      errorCorrectionLevel: "M",
      color: { dark: "#2E1B30", light: "#ffffff" },
    })
      .then(d => { if (active) setUrl(d); })
      .catch(() => { if (active) setUrl(""); });
    return () => { active = false; };
  }, [value]);

  return (
    <div
      className="rounded bg-white overflow-hidden"
      style={{ width: size, height: size }}
      aria-label="Ticket QR code"
    >
      {url && <img src={url} alt="" width={size} height={size} style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }} />}
    </div>
  );
}
