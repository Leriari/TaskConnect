// app/App.tsx or app/_layout.tsx (depending on your Expo Router setup)

import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/app/context/ThemeContext';
import AppWrapper from './AppWrapper';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs(); // This will hide all warnings and errors

// Import any other providers your app needs
// import { AuthProvider } from '@/app/context/AuthContext';

export default function Layout() {
  return (
    <ThemeProvider>
      <AppWrapper>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: {
              // Your header style goes here
            },
            headerTitleStyle: {
              // Your header title style goes here
            },
          }}
        />
      </AppWrapper>
    </ThemeProvider>
  );
}