import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
          fontWeight: '700',
          fontSize: 16,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="blogs" options={{ title: 'MANAGE BLOGS' }} />
      <Stack.Screen name="subreddits" options={{ title: 'MANAGE SUBREDDITS' }} />
      <Stack.Screen name="github" options={{ title: 'GITHUB PREFERENCES' }} />
      <Stack.Screen name="bookmarks" options={{ title: 'BOOKMARKS' }} />
      <Stack.Screen name="crawlers" options={{ title: 'CRAWLER SCHEDULES' }} />
    </Stack>
  );
}
