import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { ToastProvider } from './src/contexts/ToastContext';
import Toast from './src/components/Toast';
import OfflineBanner from './src/components/OfflineBanner';
import { initSentry, withSentry } from './src/config/sentry';

initSentry();

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <AppNavigator />
        <OfflineBanner />
        <Toast />
      </ToastProvider>
    </GestureHandlerRootView>
  );
}

export default withSentry(App);
