# rRunAI - React Native Expo App

This is the initial foundation for **rRunAI**, an interactive real-time coaching intelligence app for runners. 

## Project Structure

The project follows a clean, scalable folder structure:

```
rRunAI/
├── App.tsx                   # Main entry point that loads the AppNavigator
├── app/
│   ├── components/           # Reusable UI components (buttons, cards, etc.)
│   ├── hooks/                # Custom React hooks (e.g., useLocation, useAudio)
│   ├── navigation/
│   │   └── AppNavigator.tsx  # React Navigation stack (Home -> Run -> Summary)
│   ├── screens/
│   │   ├── HomeScreen.tsx    # Today's Session & Start Run button
│   │   ├── RunScreen.tsx     # Live Run with Pace, Distance, Time placeholders
│   │   └── SummaryScreen.tsx # Post-run summary & placeholder RPE input
│   ├── services/             # External integrations (e.g., Audio, Supabase)
│   └── utils/                # Helper functions (e.g., formatting time, math)
```

## Implemented Features (MVP Foundation)

- **Navigation:** Basic stack navigation implemented via `@react-navigation/native-stack`.
- **HomeScreen:** Simple layout displaying today's session with a "Start Run" button.
- **RunScreen:** Live run view with placeholder metrics (Pace, Distance) and an active elapsed time counter. Includes an "End Run" button.
- **SummaryScreen:** Post-run summary showing duration and placeholder data for distance, pace, and RPE input. Includes a "Done" button to return home.

## How to Run Locally

### Prerequisites

1. Install [Node.js](https://nodejs.org/) (LTS recommended).
2. Install the [Expo Go](https://expo.dev/client) app on your physical iOS or Android device (for quick testing).

### Setup Instructions

1. **Extract the project archive** and open a terminal in the `rRunAI` directory.
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the Expo development server:**
   ```bash
   npx expo start
   ```
4. **Run on your device:**
   - Open the **Expo Go** app on your phone.
   - Scan the QR code displayed in your terminal (or press `w` to open in a web browser if testing on desktop).

## Engineering Principles Followed

- **Simplicity:** Kept the UI extremely simple with no complex styling or unnecessary abstractions.
- **Testability:** Each screen is self-contained and easy to test step-by-step.
- **No Premature Optimization:** Placeholder data is used for metrics that will later be driven by device sensors (GPS, BLE).

## Next Steps

Once this foundation is validated, the next logical steps would be:
1. Integrate `expo-location` in `app/hooks/useLocation.ts` to replace placeholder distance and pace.
2. Integrate `expo-speech` in `app/services/AudioService.ts` for text-to-speech coaching cues.
3. Implement the real-time coaching logic engine to evaluate pace and trigger audio cues.
