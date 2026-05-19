"use client";

import dynamic from "next/dynamic";

const USAEventMap = dynamic(() => import("./USAEventMap"), { ssr: false });

export default function USAEventMapClient() {
  return <USAEventMap />;
}
