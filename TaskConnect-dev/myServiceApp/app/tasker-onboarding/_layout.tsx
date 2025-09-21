import { Stack } from 'expo-router';

export default function TaskerOnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="personal-details" options={{ title: 'Personal Details', headerShown: false }} />
      <Stack.Screen name="id-verification" options={{ title: 'ID Verification', headerShown: false }} />
      <Stack.Screen name="areas-served" options={{ title: 'Areas Served', headerShown: false }} />
      <Stack.Screen name="services" options={{ title: 'Services', headerShown: false }} />
      <Stack.Screen name="supporting-documents" options={{ title: 'Supporting Documents', headerShown: false }} />
      <Stack.Screen name="payment-methods" options={{ title: 'Payment Methods', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Profile Setup', headerShown: false }} />
    </Stack>
  );
} 