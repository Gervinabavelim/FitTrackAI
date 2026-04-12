# FitTrack AI

A smart fitness tracking app built with React Native and Expo. FitTrack AI helps you log workouts, track progress, and get AI-powered workout plans tailored to your goals.

## Features

- **Workout Logging** - Log exercises across Strength, Cardio, Bodyweight, and Flexibility categories with sets, reps, and weight tracking
- **AI Workout Plans** - Generate personalized weekly workout plans based on your fitness level and goals (Pro)
- **Progress Tracking** - View workout history, charts, and analytics over time
- **Dashboard** - See your current streak, recent workouts, calories burned, and daily summary
- **BMI & Body Stats** - Track height, weight, age with BMI visualization and ideal weight range
- **Profile Customization** - Profile photos, fitness level, goals, and body stats
- **Dark/Light Mode** - Full theme support
- **Workout Reminders** - Push notification reminders to stay consistent
- **Data Export** - Export workout data as CSV (Pro)
- **Contact Support** - In-app FitBot chatbot for help with navigation and troubleshooting
- **Pro Subscription** - Unlock premium features via RevenueCat

## Tech Stack

- **React Native** with **Expo SDK 55**
- **Firebase** - Authentication & data storage
- **RevenueCat** - Subscription management
- **Zustand** - State management
- **React Navigation** - Bottom tabs + native stack navigation
- **Sentry** - Error monitoring & crash reporting
- **Expo Notifications** - Push notifications
- **React Native Chart Kit** - Progress visualization

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/Gervinabavelim/FitTrackAI.git
cd FitTrackAI

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Devices

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npx expo start --web
```

### Building for Production

```bash
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android
```

## Project Structure

```
src/
  components/       # Reusable UI components
  config/           # App configuration (RevenueCat, etc.)
  contexts/         # React contexts (Toast, etc.)
  hooks/            # Custom hooks (useTheme, useHaptics, etc.)
  navigation/       # App & tab navigation
  screens/
    auth/           # Login, Register
    main/           # Dashboard, Progress, LogWorkout, AI, Profile, Contact, Paywall
    onboarding/     # Onboarding flow
  services/         # Firebase, AI, analytics, notifications
  store/            # Zustand stores (auth, workout, subscription)
  utils/            # Constants, calculations, helpers
```

## License

All rights reserved.
