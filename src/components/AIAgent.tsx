"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Loader2,
  Check,
  X,
  Plus,
  StickyNote,
  Clock,
  CheckSquare,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useExpenses,
  useDayFlags,
  useDayGoals,
  useSettings,
  useBudgetTargets,
} from "@/lib/spend-store";
import {
  generateId,
  todayStr,
  DEFAULT_CATEGORIES,
  normalizeDailyReminderTimes,
  formatCurrency,
  type Expense,
  type DayGoal,
  type ImportantNoteItem,
  type BudgetTarget,
} from "@/lib/store";
import { cn } from "@/lib/utils";

// Web Speech API interfaces
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
}

interface AgentResponse {
  success: boolean;
  intent:
    | "add_expense"
    | "add_income"
    | "toggle_daily_habits"
    | "add_day_goal"
    | "add_habit_plan"
    | "add_important_note"
    | "add_reminder_time"
    | "set_budget_target"
    | "unsupported";
  confidence: number;
  data: {
    amount?: number;
    type?: "cash-in" | "cash-out";
    categoryId?: string;
    note?: string;
    date?: string;
    text?: string;
    title?: string;
    time?: string;
    period?: "daily" | "monthly" | "yearly";
  };
  explanation: string;
}

const SUGGESTED_PROMPTS = [
  "Spent ₹500 on groceries today",
  "Withdrew ₹2000 from ATM yesterday",
  "Mark today's habits as completed",
  "Set monthly budget target to 30000",
  "Remind me: electricity bill due next Monday",
  "Set daily reminder at 8:30 PM",
  "Add gym workout to my daily habits plan",
  "Add goal buy fresh milk for tomorrow",
];

export function AIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedAction, setParsedAction] = useState<AgentResponse | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // SpendWise global state hooks
  const [, setExpenses] = useExpenses();
  const [, setDayFlags] = useDayFlags();
  const [, setDayGoals] = useDayGoals();
  const [settings, setSettings] = useSettings();
  const [, setBudgetTargets] = useBudgetTargets();

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition() as SpeechRecognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          toast.error(`Speech recognition failed: ${event.error}`);
          setIsRecording(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setPrompt(transcript);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setPrompt("");
      setParsedAction(null);
      recognitionRef.current.start();
    }
  };

  const handleClear = () => {
    setPrompt("");
    setParsedAction(null);
  };

  const handleSend = async (textToSend: string = prompt) => {
    const trimmed = textToSend.trim();
    if (!trimmed) {
      toast.error("Please enter or speak a query.");
      return;
    }

    setIsLoading(true);
    setParsedAction(null);

    try {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now = new Date();
      const currentDayOfWeek = days[now.getDay()];

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          currentDate: todayStr(),
          currentDayOfWeek,
          aiApiKey: settings.aiApiKey,
          aiModelName: settings.aiModelName,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to process request with AI agent";
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const data = (await res.json()) as AgentResponse;

      if (!data.success || data.intent === "unsupported") {
        toast.error(data.explanation || "Could not understand prompt. Try again.");
      }

      setParsedAction(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (!parsedAction || !parsedAction.success) return;

    const { intent, data } = parsedAction;

    try {
      switch (intent) {
        case "add_expense":
        case "add_income": {
          const amt = data.amount || 0;
          if (amt <= 0) throw new Error("Invalid amount parsed");
          const categoryId = data.categoryId || "other";
          const note = data.note || "";
          const date = data.date || todayStr();

          const newExp: Expense = {
            id: generateId(),
            amount: amt,
            categoryId,
            note: note.trim(),
            date,
            createdAt: new Date().toISOString(),
            type: intent === "add_income" ? "cash-in" : "cash-out",
          };

          setExpenses((prev) => [newExp, ...prev]);
          toast.success(
            `Logged ${intent === "add_income" ? "Cash In" : "Cash Out"} of ${formatCurrency(amt, settings.currency)}`,
          );
          break;
        }

        case "toggle_daily_habits": {
          const date = data.date || todayStr();
          setDayFlags((prev) => {
            const exists = prev.find((f) => f.date === date);
            if (exists) {
              return prev.map((f) => (f.date === date ? { ...f, metTarget: true } : f));
            }
            return [...prev, { date, metTarget: true }];
          });
          toast.success(`Marked habits done for ${date}`);
          break;
        }

        case "add_day_goal": {
          const date = data.date || todayStr();
          const title = data.title || "New Goal";
          const newGoal: DayGoal = {
            id: generateId(),
            date,
            title: title.trim(),
            done: false,
          };
          setDayGoals((prev) => [...prev, newGoal]);
          toast.success(`Goal added for ${date}: "${title}"`);
          break;
        }

        case "add_habit_plan": {
          const text = data.text || "";
          if (!text.trim()) throw new Error("No habit text provided");
          const newHabit: ImportantNoteItem = {
            id: generateId(),
            text: text.trim(),
          };
          setSettings((prev) => ({
            ...prev,
            dailyHabitItems: [...(prev.dailyHabitItems || []), newHabit],
          }));
          toast.success(`Added habit: "${text}"`);
          break;
        }

        case "add_important_note": {
          const text = data.text || "";
          if (!text.trim()) throw new Error("No note text provided");
          const newNote: ImportantNoteItem = {
            id: generateId(),
            text: text.trim(),
          };
          setSettings((prev) => {
            const currentItems = prev.importantNoteItems || [];
            const nextItems = [...currentItems, newNote];
            return {
              ...prev,
              importantNoteItems: nextItems,
              notes: nextItems
                .map((i) => i.text.trim())
                .filter(Boolean)
                .join("\n"),
            };
          });
          toast.success(`Note added: "${text}"`);
          break;
        }

        case "add_reminder_time": {
          const time = data.time || "20:00";
          setSettings((prev) => {
            const times = prev.dailyUpdateReminderTimes || [];
            const nextTimes = normalizeDailyReminderTimes([...times, time]);
            return {
              ...prev,
              dailyUpdateRemindersEnabled: true,
              dailyUpdateReminderTimes: nextTimes,
            };
          });
          toast.success(`Reminder scheduled for ${time}`);
          break;
        }

        case "set_budget_target": {
          const period = data.period || "daily";
          const amt = data.amount || 0;
          if (amt <= 0) throw new Error("Invalid budget amount");

          setBudgetTargets((prev) => {
            const filtered = prev.filter((t) => t.period !== period);
            const existing = prev.find((t) => t.period === period);
            const row: BudgetTarget = {
              id: existing?.id ?? generateId(),
              period,
              amount: amt,
            };
            return [...filtered, row];
          });
          toast.success(
            `${period.charAt(0).toUpperCase() + period.slice(1)} budget cap set to ${formatCurrency(amt, settings.currency)}`,
          );
          break;
        }

        default:
          toast.error("Unsupported action");
          return;
      }

      setIsOpen(false);
      handleClear();
    } catch (err: any) {
      toast.error(err.message || "Could not execute action.");
    }
  };

  // Helper to map category ID to icon/name
  const getCategoryDetails = (id?: string) => {
    const cat = DEFAULT_CATEGORIES.find((c) => c.id === id);
    return cat ? { name: cat.name, icon: cat.icon } : { name: "Other", icon: "📦" };
  };

  return (
    <>
      {/* Floating Glowing AI Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:bg-violet-700 active:scale-95 transition-all duration-300 group"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6 animate-pulse group-hover:scale-110 transition-transform" />
      </button>

      {/* AI Assistant Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg mx-auto"
        >
          <SheetHeader className="pb-3 border-b border-border/50">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold text-violet-600">
              <Sparkles className="h-5 w-5 fill-violet-600/20" />
              SpendWise AI Agent
            </SheetTitle>
            <SheetDescription>
              Speak or type to instantly log expenses, add habits, set budgets, or add reminders.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Input area */}
            <div className="relative rounded-xl border border-border bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask me anything... e.g. Spent ₹300 on transport today"
                className="min-h-[80px] w-full border-0 bg-transparent px-2 py-1 shadow-none focus-visible:ring-0 text-base resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                {/* Voice button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                    isRecording
                      ? "bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                <div className="flex gap-2">
                  {(prompt || parsedAction) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="text-muted-foreground hover:text-foreground h-10 px-3 rounded-lg"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSend()}
                    disabled={isLoading || !prompt.trim()}
                    className="h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Voice Recording Waveform Animation */}
            {isRecording && (
              <div className="flex flex-col items-center justify-center py-4 space-y-2 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-100 dark:border-violet-900/50">
                <span className="text-xs font-semibold text-violet-600 animate-pulse">
                  Listening...
                </span>
                <div className="flex items-center gap-1 h-6">
                  <div
                    className="w-1 bg-violet-500 rounded-full animate-bounce h-3"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1 bg-violet-500 rounded-full animate-bounce h-5"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1 bg-violet-500 rounded-full animate-bounce h-4"
                    style={{ animationDelay: "300ms" }}
                  />
                  <div
                    className="w-1 bg-violet-500 rounded-full animate-bounce h-6"
                    style={{ animationDelay: "450ms" }}
                  />
                  <div
                    className="w-1 bg-violet-500 rounded-full animate-bounce h-2"
                    style={{ animationDelay: "600ms" }}
                  />
                </div>
              </div>
            )}

            {/* Loading Shimmer Card */}
            {isLoading && (
              <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/20 dark:bg-violet-950/5 p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-10 bg-muted rounded-xl" />
              </div>
            )}

            {/* Action Confirmation Preview Card */}
            {parsedAction && parsedAction.success && parsedAction.intent !== "unsupported" && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-950/10 p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-xs font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                    {parsedAction.intent === "add_expense" && (
                      <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />
                    )}
                    {parsedAction.intent === "add_income" && (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    {parsedAction.intent === "add_important_note" && (
                      <StickyNote className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    {parsedAction.intent === "add_day_goal" && (
                      <CheckSquare className="h-3.5 w-3.5 text-orange-500" />
                    )}
                    {parsedAction.intent === "add_reminder_time" && (
                      <Clock className="h-3.5 w-3.5 text-pink-500" />
                    )}
                    Parsed Proposal
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Confidence: {(parsedAction.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {parsedAction.explanation}
                  </p>

                  {/* Intent-specific details layout */}
                  {(parsedAction.intent === "add_expense" ||
                    parsedAction.intent === "add_income") && (
                    <div className="grid grid-cols-2 gap-2 text-xs rounded-lg bg-background/50 p-2.5 border border-border/30">
                      <div>
                        <span className="text-muted-foreground block">Amount</span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(parsedAction.data.amount || 0, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Category</span>
                        <span className="font-medium text-sm text-foreground flex items-center gap-1">
                          <span>{getCategoryDetails(parsedAction.data.categoryId).icon}</span>
                          <span>{getCategoryDetails(parsedAction.data.categoryId).name}</span>
                        </span>
                      </div>
                      {parsedAction.data.note && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">Note</span>
                          <span className="font-medium text-foreground">
                            {parsedAction.data.note}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground block">Date</span>
                        <span className="font-medium text-foreground">
                          {parsedAction.data.date}
                        </span>
                      </div>
                    </div>
                  )}

                  {parsedAction.intent === "set_budget_target" && (
                    <div className="grid grid-cols-2 gap-2 text-xs rounded-lg bg-background/50 p-2.5 border border-border/30">
                      <div>
                        <span className="text-muted-foreground block">Budget Limit</span>
                        <span className="font-bold text-sm text-foreground">
                          {formatCurrency(parsedAction.data.amount || 0, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Period</span>
                        <span className="font-bold text-sm capitalize text-foreground">
                          {parsedAction.data.period}
                        </span>
                      </div>
                    </div>
                  )}

                  {parsedAction.intent === "add_day_goal" && (
                    <div className="grid grid-cols-2 gap-2 text-xs rounded-lg bg-background/50 p-2.5 border border-border/30">
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Goal Title</span>
                        <span className="font-medium text-sm text-foreground">
                          {parsedAction.data.title}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Target Date</span>
                        <span className="font-medium text-foreground">
                          {parsedAction.data.date}
                        </span>
                      </div>
                    </div>
                  )}

                  {parsedAction.intent === "add_reminder_time" && (
                    <div className="grid grid-cols-2 gap-2 text-xs rounded-lg bg-background/50 p-2.5 border border-border/30">
                      <div>
                        <span className="text-muted-foreground block">Alert Time</span>
                        <span className="font-bold text-sm text-foreground">
                          {parsedAction.data.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Status</span>
                        <span className="font-bold text-sm text-emerald-600">Enabled</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="flex-1 h-11 rounded-xl gap-1"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmAction}
                    className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-1"
                  >
                    <Check className="h-4 w-4" /> Confirm & Save
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Prompts Recommendations */}
            {!parsedAction && !isLoading && !isRecording && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Try saying or typing:
                </p>
                <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {SUGGESTED_PROMPTS.map((pText, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPrompt(pText);
                        handleSend(pText);
                      }}
                      className="text-left text-xs bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-violet-500/30 p-2.5 rounded-xl transition-all text-muted-foreground hover:text-foreground"
                    >
                      {pText}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
