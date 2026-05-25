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

function msToNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

export function DailyUpdateReminderScheduler() {
  const [settings] = useSettings();
  const firedRef = useRef<{ date: string; slots: Set<string> }>({ date: "", slots: new Set() });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled = settings.dailyUpdateRemindersEnabled ?? false;
  const timesKey = normalizeDailyReminderTimes(settings.dailyUpdateReminderTimes).join(",");

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted")
      return;

    const times =
      timesKey.length > 0 ? timesKey.split(",") : normalizeDailyReminderTimes(undefined);

    function tick() {
      const now = new Date();
      const ymd = localDateKey(now);

      if (firedRef.current.date !== ymd) {
        firedRef.current = { date: ymd, slots: new Set() };
      }

      const slot = currentHHmm(now);

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

      timeoutRef.current = setTimeout(tick, msToNextMinute());
    }

    timeoutRef.current = setTimeout(tick, msToNextMinute());

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, timesKey]);

  return null;
}
