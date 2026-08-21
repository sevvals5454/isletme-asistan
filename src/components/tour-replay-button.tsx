"use client";

import { PlayCircle } from "lucide-react";
import { TOUR_KEY } from "@/components/welcome-tour";

export function TourReplayButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem(TOUR_KEY);
        window.location.reload();
      }}
      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
    >
      <PlayCircle className="h-4 w-4" />
      Tanıtım turunu baştan göster
    </button>
  );
}
