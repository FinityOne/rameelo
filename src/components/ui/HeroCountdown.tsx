"use client";

import { useState, useEffect } from "react";

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
}

const TARGET = new Date("2026-06-01T00:00:00");

export function HeroCountdown() {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    setTime(getTimeLeft(TARGET));
    const id = setInterval(() => setTime(getTimeLeft(TARGET)), 1000);
    return () => clearInterval(id);
  }, []);

  if (time?.done) return null;

  const units = [
    { value: time?.days,    label: "Days" },
    { value: time?.hours,   label: "Hrs"  },
    { value: time?.minutes, label: "Min"  },
    { value: time?.seconds, label: "Sec"  },
  ];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {units.map(({ value, label }, i) => (
        <div key={label} className="flex items-end gap-2 sm:gap-3">
          {i > 0 && (
            <span className="font-display font-bold text-white/25 text-2xl sm:text-3xl pb-5 select-none">:</span>
          )}
          <div className="flex flex-col items-center">
            <div className="w-[68px] sm:w-20 h-[68px] sm:h-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              <span
                className="font-display font-bold text-white tabular-nums"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2.25rem)", letterSpacing: "-0.04em" }}
              >
                {value === undefined ? "--" : String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/35 mt-2">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
