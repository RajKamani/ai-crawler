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
        <View style={styles.iconContainer}>
          {isFontAwesome ? (
            <FontAwesome5 name={icon} size={16} color="#1c1b1b" />
          ) : (
            <Ionicons name={icon as any} size={18} color="#1c1b1b" />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.menuTitle}>{title.toUpperCase()}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#1c1b1b" />
      </Pressable>
    </Link>
  );
};

export default function SettingsHubScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <Text style={styles.headerSubtitle}>CONFIGURE FEED SOURCES & SCHEDULES</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card / Static info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#fcf9f8" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>DEVELOPER SANDBOX</Text>
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
          <Text style={styles.infoTitle}>CRAWLER CORE ENGINE V1.0.0</Text>
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
    backgroundColor: '#fcf9f8',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1b1b',
    backgroundColor: '#fcf9f8',
  },
  headerTitle: {
    color: '#1c1b1b',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  headerSubtitle: {
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
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
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 0,
    backgroundColor: '#1c1b1b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: '#1c1b1b',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  profileEmail: {
    color: '#926f6a',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#bc000a',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1b1b',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#f0eded',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#1c1b1b',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  menuSubtitle: {
    color: '#926f6a',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#f0eded',
    borderRadius: 0,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  infoTitle: {
    color: '#bc000a',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginBottom: 6,
  },
  infoBody: {
    color: '#1c1b1b',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    lineHeight: 16,
  },
});
