import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fcf9f8',
        },
        headerTintColor: '#1c1b1b',
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
          fontWeight: '700',
          fontSize: 16,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: '#fcf9f8',
        },
      }}
    >
      <Stack.Screen name="blogs" options={{ title: 'MANAGE BLOGS' }} />
      <Stack.Screen name="subreddits" options={{ title: 'MANAGE SUBREDDITS' }} />
      <Stack.Screen name="bookmarks" options={{ title: 'BOOKMARKS' }} />
      <Stack.Screen name="crawlers" options={{ title: 'CRAWLER SCHEDULES' }} />
    </Stack>
  );
}
