# Penny Pay — Mobile App (React Native + Expo) 📱

Welcome to the React Native conversion of **Penny Pay**! This directory contains a fully-fledged, ready-to-run, high-fidelity React Native mobile application built on top of the **Expo SDK**. 

It mirrors **100%** of the features, business logic, visual components, styling schemes, and database schemas from your Next.js project, while introducing high-end native optimizations.

---

## 🚀 Key Features Transformed for Mobile

1. **State-of-the-Art Mobile Aesthetics**: Custom dark/light mode adjustments, elegant card structures, clean spacing, glassmorphic header accents, and Harmonious color scales adapting seamlessly to system schemes.
2. **True Offline-First Architecture**: Powered by a unified React Context wrapping `@react-native-async-storage/async-storage` for lightning-fast, offline transactional capabilities.
3. **Automated Background Cloud Sync**: Auto-detects Supabase API configurations, executes anonymous authentication, and uses debounced updates to batch-save snapshots to the server (identical to web behavior).
4. **Interactive Calendar Matrix**: A responsive 7-column calendar day grid showing daily transaction totals, habit checklists directly inside the date cards, and completion badges.
5. **Interactive Checklists & Sub-TODOs**: Full CRUD controls on the Notes tab and day detail views, enabling users to schedule recurring habit plans and manage daily custom checklist items.
6. **Native Reminders (Expo Notifications)**: Full settings scheduler to set multiple reminder notifications at custom 24-hour wall-clock times (HH:MM). Reminders are queued natively using `expo-notifications`.
7. **Tactile Haptic Feedback**: Integrated with `expo-haptics` to provide micro-animations and physical ticks when users toggle checklists, press buttons, save forms, or trigger errors.

---

## 📂 Mapping the Transformation: Web vs. Mobile

Here is how the architecture and screens of the Next.js web application map directly to this React Native codebase:

| Next.js Web Component | React Native Mobile File | Description |
| :--- | :--- | :--- |
| **`src/lib/store.ts`** | `src/lib/store.ts` | Complete preservation of TypeScript interfaces, currency formatting, date helpers, and budget status logic. |
| **`src/lib/spend-data-provider.tsx`** | `src/lib/spend-provider.tsx` | Swapped `localStorage` with `@react-native-async-storage/async-storage` and added async-loading screen states. |
| **`src/lib/supabase/client.ts`** | `src/lib/supabase.ts` | Configured `createClient` using `AsyncStorage` for secure session persistence on iOS and Android. |
| **`src/components/screens/OverviewScreen.tsx`** | `src/screens/OverviewScreen.tsx` | Month statistics, WALLET icons, budget caps progress, category percentage progress lists, and daily burn-rate guidance. |
| **`src/components/screens/ExpensesScreen.tsx`** | `src/screens/ExpensesScreen.tsx` | Dated scroll cards. Adds Cash In (emerald) and Cash Out (crimson) float bars, invoking form fields. |
| **`src/components/screens/CalendarScreen.tsx`** | `src/screens/CalendarScreen.tsx` | Native calendar month grid rendering, displaying daily values, mini habit dots, and completion ticks. |
| **`src/components/screens/NotesScreen.tsx`** | `src/screens/NotesScreen.tsx` | Segmented tab controls to save spending caps, define habit routines (daily, weekly, etc.), and jot down notes. |
| **`src/components/screens/SettingsScreen.tsx`** | `src/screens/SettingsScreen.tsx` | Appearance themes toggler, currency selections, custom category creations, and Expo notifications scheduler. |
| **`src/components/BudgetBar.tsx`** | `src/components/BudgetBar.tsx` | Styled progress bar changing color based on budget thresholds. |
| **`src/components/BottomNav.tsx`** | `src/components/BottomNav.tsx` | High-fidelity fixed tab bar with icons and native haptics. |

---

## 🛠️ Step-by-Step Execution Guide

### 1. Install Dependencies
Navigate into the mobile app directory and install the packages using `npm` or `bun`:
```bash
cd react-native-app
npm install
```

### 2. Configure Supabase Credentials
To enable data synchronization with your Supabase server, create a `.env` file in the root of the `react-native-app` directory (or use your Expo project dashboard to supply public keys):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(If keys are omitted, the application will display a warning banner and gracefully fall back to 100% local operation via `AsyncStorage`.)*

### 3. Run the Development Server
Start the Expo CLI orchestrator:
```bash
npm run start
```

### 4. Open and Test the Application
Once the Expo CLI starts, you can:
- **Scan the QR Code** with your phone's camera (using the **Expo Go** app on Android or iOS) to run it directly on your physical mobile device.
- Press **`i`** to open the iOS Simulator (requires Xcode on macOS).
- Press **`a`** to open the Android Emulator (requires Android Studio).
- Press **`w`** to view it on the web.
