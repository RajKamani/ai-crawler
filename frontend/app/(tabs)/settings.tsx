import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Link } from 'expo-router';

interface SettingsMenuItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  href: any;
  isFontAwesome?: boolean;
}

const SettingsMenuItem: React.FC<SettingsMenuItemProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  href,
  isFontAwesome = false,
}) => {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.menuItem}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          {isFontAwesome ? (
            <FontAwesome5 name={icon} size={18} color={iconColor} />
          ) : (
            <Ionicons name={icon as any} size={20} color={iconColor} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#48484A" />
      </Pressable>
    </Link>
  );
};

export default function SettingsHubScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Configure Feed Sources & Schedules</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card / Static info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>Developer Sandbox</Text>
            <Text style={styles.profileEmail}>mock-developer@local.host</Text>
          </View>
        </View>

        {/* Menu Section: Sources */}
        <Text style={styles.sectionTitle}>Content Sources</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="logo-reddit"
            iconColor="#FF4500"
            title="Manage Subreddits"
            subtitle="Add, remove, or toggle custom subreddits"
            href="/settings/subreddits"
          />
          <SettingsMenuItem
            icon="rss"
            iconColor="#FF2D55"
            title="Manage RSS Blogs"
            subtitle="Add and validate custom blog feeds"
            href="/settings/blogs"
            isFontAwesome={true}
          />
        </View>

        {/* Menu Section: Preferences */}
        <Text style={styles.sectionTitle}>Schedules & Saves</Text>
        <View style={styles.menuGroup}>
          <SettingsMenuItem
            icon="timer-outline"
            iconColor="#FF9500"
            title="Crawler Schedules"
            subtitle="Configure background crawl intervals"
            href="/settings/crawlers"
          />
          <SettingsMenuItem
            icon="bookmark"
            iconColor="#FFCC00"
            title="Saved Bookmarks"
            subtitle="View your saved articles & repos"
            href="/settings/bookmarks"
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Crawler Core Engine v1.0.0</Text>
          <Text style={styles.infoBody}>
            This application utilizes Groq Llama 3.3 for summarizing. Feeds are crawled asynchronously via FastAPI background tasks and stored in Supabase PostgreSQL database.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E24',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A32',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A32',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A32',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#232329',
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoBody: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 16,
  },
});
