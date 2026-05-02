"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/lib/spend-store";
import {
  DEFAULT_DAILY_REMINDER_TIMES,
  normalizeDailyReminderTimes,
  isValidReminderTime,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_TIMES = 6;

function permissionLabel(): "granted" | "denied" | "unsupported" | "default" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function DailyUpdateReminderSettings() {
  const [settings, setSettings] = useSettings();
  const [requesting, setRequesting] = useState(false);

  const enabled = settings.dailyUpdateRemindersEnabled ?? false;
  const times = useMemo(
    () => normalizeDailyReminderTimes(settings.dailyUpdateReminderTimes),
    [settings.dailyUpdateReminderTimes],
  );

  const perm = permissionLabel();

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      toast.error("Notifications are not supported in this browser.");
      return;
    }
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") toast.success("Notifications enabled");
      else if (result === "denied") toast.error("Notifications blocked — enable them in browser settings.");
      else toast.message("You can allow notifications anytime from here.");
    } finally {
      setRequesting(false);
    }
  }

  function setTimes(next: string[]) {
    setSettings((prev) => ({
      ...prev,
      dailyUpdateReminderTimes: normalizeDailyReminderTimes(next),
    }));
  }

  function updateTimeAt(index: number, value: string) {
    if (!isValidReminderTime(value)) return;
    const copy = [...times];
    copy[index] = value;
    setTimes(copy);
  }

  function removeTimeAt(index: number) {
    const copy = times.filter((_, i) => i !== index);
    setTimes(copy.length ? copy : [...DEFAULT_DAILY_REMINDER_TIMES]);
  }

  function addTime() {
    if (times.length >= MAX_TIMES) {
      toast.error(`You can add up to ${MAX_TIMES} reminder times.`);
      return;
    }
    const used = new Set(times);
    let candidate = "12:00";
    for (let h = 8; h <= 22; h++) {
      const t = `${String(h).padStart(2, "0")}:00`;
      if (!used.has(t)) {
        candidate = t;
        break;
      }
    }
    setTimes([...times, candidate]);
  }

  return (
    <section className="mb-6" aria-labelledby="daily-reminders-heading">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
        <h2 id="daily-reminders-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Daily update reminders
        </h2>
      </div>

      <div className="rounded-xl bg-card border border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <Label htmlFor="daily-reminder-enabled" className="text-foreground">
              Remind me through the day
            </Label>
            <p className="text-xs text-muted-foreground leading-snug">
              Browser notifications when it’s time to log expenses, calendar notes, and habits.
            </p>
          </div>
          <Switch
            id="daily-reminder-enabled"
            checked={enabled}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, dailyUpdateRemindersEnabled: checked }))
            }
            className="shrink-0"
            aria-label="Toggle daily update reminders"
          />
        </div>

        {enabled && (
          <>
            {perm === "unsupported" && (
              <p className="text-xs text-muted-foreground">Your environment does not support notifications.</p>
            )}
            {perm === "denied" && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Notifications are blocked. Unblock SpendWise in your browser site settings to use reminders.
              </p>
            )}
            {perm === "default" && (
              <Button
                type="button"
                variant="secondary"
                className="w-full h-11 rounded-xl"
                onClick={() => void requestPermission()}
                disabled={requesting}
              >
                {requesting ? "Requesting…" : "Allow browser notifications"}
              </Button>
            )}
            {perm === "granted" && (
              <p className="text-xs text-muted-foreground">Reminders fire at the times below while this app is open.</p>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reminder times</Label>
              {times.map((t, i) => (
                <div key={`${t}-${i}`} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateTimeAt(i, e.target.value)}
                    className={cn(
                      "flex-1 min-h-[44px] rounded-lg border border-border/60 bg-background px-3 text-sm font-medium",
                      "text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`Reminder time ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeTimeAt(i)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive border border-transparent hover:border-border/50"
                    aria-label={`Remove reminder at ${t}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl gap-2"
              onClick={addTime}
              disabled={times.length >= MAX_TIMES}
            >
              <Plus className="h-4 w-4" />
              Add another time
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
