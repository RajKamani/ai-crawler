import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCrawlerSettings, CrawlerSchedule } from '@/hooks/useCrawlerSettings';

export default function CrawlerSettingsScreen() {
  const router = useRouter();
  const { schedules, isLoading, updateSchedule } = useCrawlerSettings();
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  const getDisplayName = (name: string) => {
    switch (name) {
      case 'blog_global':
        return 'Global AI Company Blogs';
      case 'blog_user':
        return 'User Custom RSS Blogs';
      case 'reddit_global':
        return 'Global Reddit (AI Keyword Filter)';
      case 'reddit_user':
        return 'User Custom Subreddits';
      case 'github_trending':
        return 'GitHub Trending Repositories';
      default:
        return name;
    }
  };

  const getDescription = (name: string) => {
    switch (name) {
      case 'blog_global':
        return 'Scrapes pre-seeded AI company websites (OpenAI, Anthropic, etc.)';
      case 'blog_user':
        return 'Scrapes custom RSS feed links added to your feed settings';
      case 'reddit_global':
        return 'Monitors global AI subreddits and filters posts by keyword relevance';
      case 'reddit_user':
        return 'Monitors your custom subreddits and imports all hot threads unfiltered';
      case 'github_trending':
        return 'Searches GitHub for repositories tagged with AI/ML created in the last 7 days';
      default:
        return '';
    }
  };

  const handleToggle = async (schedule: CrawlerSchedule, value: boolean) => {
    setUpdatingName(schedule.crawler_name);
    try {
      await updateSchedule(schedule.crawler_name, undefined, value);
    } catch (err) {
      console.error('Error toggling crawler:', err);
    } finally {
      setUpdatingName(null);
    }
  };

  const handleAdjustInterval = async (schedule: CrawlerSchedule, delta: number) => {
    const newInterval = schedule.interval_minutes + delta;
    if (newInterval < 5) return; // Keep minimum crawl interval to 5 minutes to prevent spam

    setUpdatingName(schedule.crawler_name);
    try {
      await updateSchedule(schedule.crawler_name, newInterval, undefined);
    } catch (err) {
      console.error('Error adjusting interval:', err);
    } finally {
      setUpdatingName(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Crawler Schedules</Text>
      </View>

      {isLoading && schedules.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionDesc}>
            Manage how frequently each background crawler scraper job executes on the server engine.
          </Text>

          {schedules.map((schedule) => {
            const isUpdating = updatingName === schedule.crawler_name;

            return (
              <View key={schedule.id} style={styles.scheduleCard}>
                {/* Header Row: Title and Switch */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleArea}>
                    <Text style={styles.cardTitle}>{getDisplayName(schedule.crawler_name)}</Text>
                    <Text style={styles.cardDesc}>{getDescription(schedule.crawler_name)}</Text>
                  </View>
                  <View style={styles.actionArea}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FF9500" style={styles.spinner} />
                    ) : (
                      <Switch
                        value={schedule.is_active}
                        onValueChange={(val) => handleToggle(schedule, val)}
                        trackColor={{ false: '#3A3A42', true: 'rgba(255, 149, 0, 0.4)' }}
                        thumbColor={schedule.is_active ? '#FF9500' : '#8E8E93'}
                      />
                    )}
                  </View>
                </View>

                {/* Footer Controls: Interval adjustment */}
                {schedule.is_active && (
                  <View style={styles.intervalControls}>
                    <Text style={styles.intervalText}>
                      Interval:{' '}
                      <Text style={styles.intervalValue}>{schedule.interval_minutes}</Text> mins
                    </Text>
                    
                    <View style={styles.btnRow}>
                      <Pressable
                        style={[styles.adjustBtn, schedule.interval_minutes <= 15 ? styles.adjustBtnDisabled : null]}
                        onPress={() => handleAdjustInterval(schedule, -15)}
                        disabled={isUpdating || schedule.interval_minutes <= 15}
                      >
                        <Text style={styles.adjustBtnText}>-15m</Text>
                      </Pressable>
                      <Pressable
                        style={styles.adjustBtn}
                        onPress={() => handleAdjustInterval(schedule, 15)}
                        disabled={isUpdating}
                      >
                        <Text style={styles.adjustBtnText}>+15m</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E24',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  sectionDesc: {
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  scheduleCard: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A32',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleArea: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#8E8E93',
    fontSize: 11,
    lineHeight: 15,
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  spinner: {
    height: 31, // Align with switch height
  },
  intervalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A32',
    marginTop: 12,
    paddingTop: 12,
  },
  intervalText: {
    color: '#E5E5EA',
    fontSize: 13,
    fontWeight: '500',
  },
  intervalValue: {
    color: '#FF9500', // Orange interval text
    fontWeight: '700',
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: '#2A2A32',
    borderWidth: 1,
    borderColor: '#3A3A42',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 55,
    alignItems: 'center',
  },
  adjustBtnDisabled: {
    opacity: 0.3,
  },
  adjustBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
