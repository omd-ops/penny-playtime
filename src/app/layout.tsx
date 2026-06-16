import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomNav } from "@/components/BottomNav";
import { GlobalToaster } from "@/components/GlobalToaster";
import { SpendDataProvider } from "@/lib/spend-store";
import { DailyUpdateReminderScheduler } from "@/components/DailyUpdateReminderScheduler";
import { AIAgent } from "@/components/AIAgent";
import "@/styles.css";

export const metadata: Metadata = {
  title: {
    default: "SpendWise — Daily Expense Tracker",
    template: "%s — SpendWise",
  },
  description: "Track daily expenses, set budgets, and gain insights into your spending habits.",
  openGraph: {
    title: "SpendWise — Daily Expense Tracker",
    description: "Track daily expenses, set budgets, and gain insights into your spending habits.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeInitScript = `try{var t=localStorage.getItem("et_theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Script
          id="et-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <SpendDataProvider>
            <DailyUpdateReminderScheduler />
            <AIAgent />
            <div className="min-h-screen pb-20">{children}</div>
            <BottomNav />
          </SpendDataProvider>
          <GlobalToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
