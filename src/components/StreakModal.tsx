"use client";

import { useState, useMemo } from "react";
import { useDayFlags, useSettings } from "@/lib/spend-store";
import { calculateHabitStreaks, todayStr, generateId, type ImportantNoteItem } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Trophy, Target, Calendar, Plus, Trash2, Activity, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StreakModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StreakModal({ isOpen, onOpenChange }: StreakModalProps) {
  const [dayFlags] = useDayFlags();
  const [settings, setSettings] = useSettings();
  const [newHabitText, setNewHabitText] = useState("");

  const today = todayStr();

  // 1. Calculate Streaks
  const streaks = useMemo(() => {
    return calculateHabitStreaks(dayFlags, settings.dailyHabitItems ?? []);
  }, [dayFlags, settings.dailyHabitItems]);

  // 2. Generate Heatmap Days (last 12 weeks = 84 days)
  const heatmapDays = useMemo(() => {
    const dates = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleDateString("default", { weekday: "short" });
      const dayOfMonth = d.getDate();

      const flag = dayFlags.find((f) => f.date === dateStr);
      let status: "none" | "partial" | "full" = "none";
      let completedCount = 0;

      if (flag) {
        if (settings.dailyHabitItems && settings.dailyHabitItems.length > 0) {
          const completed = flag.completedHabitIds || [];
          completedCount = settings.dailyHabitItems.filter((h) => completed.includes(h.id)).length;
          if (completedCount === settings.dailyHabitItems.length) {
            status = "full";
          } else if (completedCount > 0) {
            status = "partial";
          }
        } else if (flag.metTarget) {
          status = "full";
        }
      }

      dates.push({
        dateStr,
        dayName,
        dayOfMonth,
        status,
        completedCount,
        totalCount: settings.dailyHabitItems?.length || 0,
      });
    }
    return dates;
  }, [dayFlags, settings.dailyHabitItems]);

  // 3. Compute Last 30 Days Statistics
  const last30Days = useMemo(() => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dates.push(dateStr);
    }
    return dates;
  }, []);

  const last30DaysCompletionRate = useMemo(() => {
    let completedDaysCount = 0;
    last30Days.forEach((dateStr) => {
      const flag = dayFlags.find((f) => f.date === dateStr);
      if (flag) {
        if (settings.dailyHabitItems && settings.dailyHabitItems.length > 0) {
          const completed = flag.completedHabitIds || [];
          if (settings.dailyHabitItems.every((item) => completed.includes(item.id))) {
            completedDaysCount++;
          }
        } else if (flag.metTarget) {
          completedDaysCount++;
        }
      }
    });
    return Math.round((completedDaysCount / 30) * 100);
  }, [dayFlags, settings.dailyHabitItems, last30Days]);

  const totalCompletedDays = useMemo(() => {
    return dayFlags.filter((flag) => {
      if (settings.dailyHabitItems && settings.dailyHabitItems.length > 0) {
        const completed = flag.completedHabitIds || [];
        return settings.dailyHabitItems.every((item) => completed.includes(item.id));
      }
      return flag.metTarget === true;
    }).length;
  }, [dayFlags, settings.dailyHabitItems]);

  // 4. Individual Habit Performance
  const habitStats = useMemo(() => {
    if (!settings.dailyHabitItems?.length) return [];

    return settings.dailyHabitItems.map((habit) => {
      let completedCount = 0;
      last30Days.forEach((dateStr) => {
        const flag = dayFlags.find((f) => f.date === dateStr);
        if (flag?.completedHabitIds?.includes(habit.id)) {
          completedCount++;
        }
      });
      const rate = Math.round((completedCount / 30) * 100);
      return {
        id: habit.id,
        text: habit.text,
        rate,
        count: completedCount,
      };
    });
  }, [settings.dailyHabitItems, dayFlags, last30Days]);

  // 5. Actions
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;
    const newHabit: ImportantNoteItem = {
      id: generateId(),
      text: newHabitText.trim(),
    };
    setSettings((s) => ({
      ...s,
      dailyHabitItems: [...(s.dailyHabitItems || []), newHabit],
    }));
    setNewHabitText("");
    toast.success(`Added habit: "${newHabit.text}"`);
  };

  const deleteHabit = (id: string, text: string) => {
    setSettings((s) => ({
      ...s,
      dailyHabitItems: (s.dailyHabitItems || []).filter((h) => h.id !== id),
    }));
    toast.success(`Deleted habit: "${text}"`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-amber-500 fill-amber-500/20" />
            Streak & Habit Center
          </DialogTitle>
          <DialogDescription>
            Monitor streaks, heatmap consistency, and manage active habits.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-card/50 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-500" /> Current Streak
            </span>
            <span className="text-2xl font-black text-foreground mt-1">
              {streaks.currentStreak}{" "}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </span>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" /> Longest Streak
            </span>
            <span className="text-2xl font-black text-foreground mt-1">
              {streaks.longestStreak}{" "}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </span>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Target className="h-3 w-3 text-emerald-500" /> 30d Completion
            </span>
            <span className="text-2xl font-black text-foreground mt-1">
              {last30DaysCompletionRate}%
            </span>
          </div>
          <div className="bg-card/50 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-500" /> Total Days
            </span>
            <span className="text-2xl font-black text-foreground mt-1">
              {totalCompletedDays}{" "}
              <span className="text-xs font-normal text-muted-foreground">days</span>
            </span>
          </div>
        </div>

        {/* Heatmap Section */}
        <div className="mt-4 bg-card/30 border border-border/40 rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
            <Activity className="h-3.5 w-3.5 text-primary" /> Consistency Heatmap (12 Weeks)
          </span>

          <TooltipProvider delayDuration={50}>
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 auto-cols-max justify-center overflow-x-auto py-2">
              {heatmapDays.map((day, idx) => {
                let colorClass = "bg-muted/40 dark:bg-muted/15";
                if (day.status === "full") {
                  colorClass = "bg-emerald-500 hover:bg-emerald-600";
                } else if (day.status === "partial") {
                  colorClass = "bg-emerald-500/40 hover:bg-emerald-500/50";
                }
                const isDayToday = day.dateStr === today;
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-3 h-3 rounded-sm transition-colors cursor-pointer shrink-0",
                          colorClass,
                          isDayToday &&
                            "ring-1 ring-primary ring-offset-1 dark:ring-offset-background",
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-semibold">
                        {new Date(day.dateStr + "T12:00:00").toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {day.status === "full"
                          ? "All habits completed! 🎉"
                          : day.status === "partial"
                            ? `${day.completedCount} of ${day.totalCount} habits completed`
                            : "No habits completed"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-muted/40 dark:bg-muted/15" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>More</span>
          </div>
        </div>

        {/* Manage & Monitor Habits */}
        <div className="mt-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
            <CheckCircle className="h-3.5 w-3.5 text-primary" /> Active Habits & Performance
          </span>

          <form onSubmit={addHabit} className="flex gap-2 mb-3">
            <Input
              value={newHabitText}
              onChange={(e) => setNewHabitText(e.target.value)}
              placeholder="Add gym, wake 7am, read..."
              className="h-10 text-sm rounded-xl border-border/60 bg-background/50"
              maxLength={40}
            />
            <Button type="submit" size="icon" className="h-10 w-10 rounded-xl shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          {habitStats.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border/60 bg-background/10">
              No daily habits configured yet. Add one above!
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {habitStats.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between gap-3 bg-card/40 border border-border/40 rounded-xl p-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate leading-tight">
                      {habit.text}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {habit.rate}% completion in the last 30 days ({habit.count}/30)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                    onClick={() => deleteHabit(habit.id, habit.text)}
                    aria-label={`Delete habit ${habit.text}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
