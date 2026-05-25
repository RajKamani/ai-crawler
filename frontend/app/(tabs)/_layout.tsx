import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#bc000a',
        tabBarInactiveTintColor: '#926f6a',
        tabBarStyle: {
          backgroundColor: '#fcf9f8',
          borderTopColor: '#1c1b1b',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SpaceMono',
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="blogs"
        options={{
          title: 'Blogs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reddit"
        options={{
          title: 'Reddit',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'logo-reddit' : 'logo-reddit'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="github"
        options={{
          title: 'GitHub',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'logo-github' : 'logo-github'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
