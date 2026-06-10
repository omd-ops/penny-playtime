# Penny Pay Mobile

Penny Pay is now structured as a root-level React Native app powered by Expo.

## Project Structure

```text
.
├── App.tsx
├── app.json
├── src
│   ├── components
│   ├── lib
│   └── screens
├── supabase
│   └── migrations
├── package.json
└── tsconfig.json
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Supabase sync, if you want cloud backup across devices:

```bash
cp .env.example .env
```

Then fill these values in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If these values are empty, the app still works locally using device storage.

3. Check TypeScript:

```bash
npm run typecheck
```

4. Start the Expo development server:

```bash
npm run start
```

5. Check the UI:

- Install Expo Go on your Android phone.
- Scan the QR code shown in the terminal.
- Or press `a` in the terminal to open an Android emulator.

## Useful Commands

```bash
npm run start
npm run android
npm run typecheck
npm run build
```

## APK Phase

After the UI and daily-use flows are verified, create an EAS build profile for APK output and build the installable Android package.
