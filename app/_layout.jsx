import { Stack } from 'expo-router';
import { useAppUpdates } from '../hooks/useAppUpdates';
import '../tasks/locationTask';

export default function RootLayout() {
  useAppUpdates();

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}