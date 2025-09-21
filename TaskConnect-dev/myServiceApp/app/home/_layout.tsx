// app/home/_layout.tsx

import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        headerTransparent: true,
        headerTitle: '',
        animation: 'none',
        contentStyle: {
          backgroundColor: 'transparent'
        }
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}