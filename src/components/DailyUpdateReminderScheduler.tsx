"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/spend-store";
import { normalizeDailyReminderTimes } from "@/lib/store";

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentHHmm(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/**
 * Fires browser `Notification` at configured local times while the app is open.
 * (Exact minute match; polled every 15s so brief background tabs can still catch the slot.)
 */
export function DailyUpdateReminderScheduler() {
  const [settings] = useSettings();
  const firedRef = useRef<{ date: string; slots: Set<string> }>({ date: "", slots: new Set() });

  const enabled = settings.dailyUpdateRemindersEnabled ?? false;
  const timesKey = normalizeDailyReminderTimes(settings.dailyUpdateReminderTimes).join(",");

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined") return;

    const times = timesKey.length > 0 ? timesKey.split(",") : normalizeDailyReminderTimes(undefined);

    const tick = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const ymd = localDateKey(now);
      const slot = currentHHmm(now);

      if (firedRef.current.date !== ymd) {
        firedRef.current = { date: ymd, slots: new Set() };
      }

      for (const t of times) {
        if (t !== slot || firedRef.current.slots.has(t)) continue;
        firedRef.current.slots.add(t);
        try {
          new Notification("SpendWise — daily update", {
            body: "Log today's spending, calendar, and habits when you have a moment.",
            tag: `spendwise-daily-${ymd}-${t}`,
          });
        } catch (e) {
          console.error(e);
        }
      }
    };

    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [enabled, timesKey]);

  return null;
}
