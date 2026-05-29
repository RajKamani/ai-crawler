import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCrawlerSettings, CrawlerSchedule } from '@/hooks/useCrawlerSettings';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};


// Conditionally import DateTimePicker to prevent Web bundler crashes
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (err) {
    console.warn('Failed to load native DateTimePicker:', err);
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR SCHEDULE ENCODING
// -------------------------------------------------------------

const getScheduleMode = (interval: number): 'interval' | 'daily' | 'date_time' => {
  if (interval < 0) return 'daily';
  if (interval >= 1000000) return 'date_time';
  return 'interval';
};

const decodeDailyTime = (interval: number) => {
  const minutes = Math.abs(interval) - 1;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return { hour, minute };
};

const formatDailyTime = (hour: number, minute: number) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const encodeDailyTime = (hour: number, minute: number) => {
  return -(hour * 60 + minute + 1);
};

const decodeDateTime = (interval: number) => {
  return new Date(interval * 60 * 1000);
};

const formatDateTime = (date: Date) => {
  return date.toLocaleString();
};

const encodeDateTime = (date: Date) => {
  return Math.floor(date.getTime() / (60 * 1000));
};

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export default function CrawlerSettingsScreen() {
  const { schedules, isLoading, updateSchedule } = useCrawlerSettings();
  const [updatingName, setUpdatingName] = useState<string | null>(null);

  // Native Picker States
  const [activePickerCrawler, setActivePickerCrawler] = useState<string | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  
  // To handle the sequential Date -> Time selection flow for Specific DateTime on native
  const [dateTimeFlow, setDateTimeFlow] = useState<boolean>(false);

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
      showAlert('Update Failed', err instanceof Error ? err.message : String(err));
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
      showAlert('Update Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingName(null);
    }
  };

  const handleModeChange = async (name: string, targetMode: 'interval' | 'daily' | 'date_time') => {
    setUpdatingName(name);
    try {
      let defaultVal = 60;
      if (targetMode === 'daily') {
        defaultVal = encodeDailyTime(9, 0); // 09:00 AM default daily
      } else if (targetMode === 'date_time') {
        // Default tomorrow at same time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        defaultVal = encodeDateTime(tomorrow);
      }
      await updateSchedule(name, defaultVal, undefined);
    } catch (err) {
      console.error('Error changing mode:', err);
      showAlert('Mode Change Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingName(null);
    }
  };

  // --- Native DateTimePicker Handlers ---
  const handleNativePickerChange = async (event: any, selectedValue?: Date) => {
    if (event.type === 'dismissed' || !selectedValue) {
      setActivePickerCrawler(null);
      setDateTimeFlow(false);
      return;
    }

    const crawlerName = activePickerCrawler;
    if (!crawlerName) return;

    if (getScheduleMode(schedules.find(s => s.crawler_name === crawlerName)?.interval_minutes || 0) === 'daily') {
      // Daily time mode - simple
      setActivePickerCrawler(null);
      setUpdatingName(crawlerName);
      try {
        const encoded = encodeDailyTime(selectedValue.getHours(), selectedValue.getMinutes());
        await updateSchedule(crawlerName, encoded, undefined);
      } catch (err) {
        console.error('Error saving daily time:', err);
        showAlert('Save Failed', err instanceof Error ? err.message : String(err));
      } finally {
        setUpdatingName(null);
      }
    } else {
      // Specific Date/Time mode (Once)
      if (pickerMode === 'date') {
        // Date picked, now prompt for Time
        setPickerValue(selectedValue);
        setPickerMode('time');
        setDateTimeFlow(true);
      } else {
        // Time picked, merge date + time
        const mergedDate = new Date(pickerValue);
        mergedDate.setHours(selectedValue.getHours());
        mergedDate.setMinutes(selectedValue.getMinutes());
        mergedDate.setSeconds(0);

        setActivePickerCrawler(null);
        setDateTimeFlow(false);
        setUpdatingName(crawlerName);

        try {
          const encoded = encodeDateTime(mergedDate);
          await updateSchedule(crawlerName, encoded, undefined);
        } catch (err) {
          console.error('Error saving date/time:', err);
          showAlert('Save Failed', err instanceof Error ? err.message : String(err));
        } finally {
          setUpdatingName(null);
        }
      }
    }
  };

  const openNativePicker = (crawlerName: string, mode: 'daily' | 'once') => {
    const schedule = schedules.find(s => s.crawler_name === crawlerName);
    if (!schedule) return;

    setActivePickerCrawler(crawlerName);
    if (mode === 'daily') {
      setPickerMode('time');
      const { hour, minute } = decodeDailyTime(schedule.interval_minutes);
      const d = new Date();
      d.setHours(hour, minute, 0);
      setPickerValue(d);
      setDateTimeFlow(false);
    } else {
      setPickerMode('date');
      const currentVal = schedule.interval_minutes >= 1000000 
        ? decodeDateTime(schedule.interval_minutes) 
        : new Date();
      setPickerValue(currentVal);
      setDateTimeFlow(true);
    }
  };

  // --- Web Picker Handlers ---
  const handleWebTimeChange = async (crawlerName: string, timeString: string) => {
    if (!timeString) return;
    const [hStr, mStr] = timeString.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return;

    setUpdatingName(crawlerName);
    try {
      const encoded = encodeDailyTime(h, m);
      await updateSchedule(crawlerName, encoded, undefined);
    } catch (err) {
      console.error('Error updating web time:', err);
      showAlert('Update Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingName(null);
    }
  };

  const handleWebDateChange = async (crawlerName: string, dateTimeString: string) => {
    if (!dateTimeString) return;
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return;

    setUpdatingName(crawlerName);
    try {
      const encoded = encodeDateTime(date);
      await updateSchedule(crawlerName, encoded, undefined);
    } catch (err) {
      console.error('Error updating web datetime:', err);
      showAlert('Update Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingName(null);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading && schedules.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#bc000a" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionDesc}>
            Manage how frequently each background crawler scraper job executes on the server engine.
          </Text>

          {schedules.map((schedule) => {
            const isUpdating = updatingName === schedule.crawler_name;
            const mode = getScheduleMode(schedule.interval_minutes);

            return (
              <View key={schedule.id} style={[styles.scheduleCard, isUpdating && { opacity: 0.6 }]}>

                {/* Header Row: Title and Switch */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleArea}>
                    <Text style={styles.cardTitle}>{getDisplayName(schedule.crawler_name).toUpperCase()}</Text>
                    <Text style={styles.cardDesc}>{getDescription(schedule.crawler_name)}</Text>
                  </View>
                  <View style={styles.actionArea}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#bc000a" style={styles.spinner} />
                    ) : (
                      <Switch
                        value={schedule.is_active}
                        onValueChange={(val) => handleToggle(schedule, val)}
                        trackColor={{ false: '#dcd9d9', true: 'rgba(188, 0, 10, 0.3)' }}
                        thumbColor={schedule.is_active ? '#bc000a' : '#926f6a'}
                      />
                    )}
                  </View>
                </View>

                {schedule.is_active && (
                  <View style={styles.settingsPanel}>
                    {/* Brutalist Mode Selector Segment */}
                    <View style={styles.modeSelector}>
                      <Pressable
                        style={[styles.modeBtn, mode === 'interval' && styles.modeBtnActive]}
                        onPress={() => handleModeChange(schedule.crawler_name, 'interval')}
                        disabled={isUpdating}
                      >
                        <Text style={[styles.modeBtnText, mode === 'interval' && styles.modeBtnActiveText]}>
                          INTERVAL
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]}
                        onPress={() => handleModeChange(schedule.crawler_name, 'daily')}
                        disabled={isUpdating}
                      >
                        <Text style={[styles.modeBtnText, mode === 'daily' && styles.modeBtnActiveText]}>
                          DAILY
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.modeBtn, mode === 'date_time' && styles.modeBtnActive]}
                        onPress={() => handleModeChange(schedule.crawler_name, 'date_time')}
                        disabled={isUpdating}
                      >
                        <Text style={[styles.modeBtnText, mode === 'date_time' && styles.modeBtnActiveText]}>
                          ONCE
                        </Text>
                      </Pressable>
                    </View>

                    {/* Mode Specific Controls */}
                    {mode === 'interval' && (
                      <View style={styles.intervalControls}>
                        <Text style={styles.controlLabel}>
                          INTERVAL:{' '}
                          <Text style={styles.highlightText}>{schedule.interval_minutes}</Text> MINS
                        </Text>
                        
                        <View style={styles.btnRow}>
                          <Pressable
                            style={[styles.adjustBtn, schedule.interval_minutes <= 15 ? styles.adjustBtnDisabled : null]}
                            onPress={() => handleAdjustInterval(schedule, -15)}
                            disabled={isUpdating || schedule.interval_minutes <= 15}
                          >
                            <Text style={styles.adjustBtnText}>-15M</Text>
                          </Pressable>
                          <Pressable
                            style={styles.adjustBtn}
                            onPress={() => handleAdjustInterval(schedule, 15)}
                            disabled={isUpdating}
                          >
                            <Text style={styles.adjustBtnText}>+15M</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {mode === 'daily' && (
                      <View style={styles.scheduleRow}>
                        <Text style={styles.controlLabel}>
                          DAILY AT:{' '}
                          <Text style={styles.highlightText}>
                            {(() => {
                              const { hour, minute } = decodeDailyTime(schedule.interval_minutes);
                              return formatDailyTime(hour, minute);
                            })()}
                          </Text>
                        </Text>

                        {Platform.OS === 'web' ? (
                          <input
                            type="time"
                            style={webStyles.inputTime}
                            defaultValue={(() => {
                              const { hour, minute } = decodeDailyTime(schedule.interval_minutes);
                              return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                            })()}
                            onChange={(e) => handleWebTimeChange(schedule.crawler_name, e.target.value)}
                            disabled={isUpdating}
                          />
                        ) : (
                          <Pressable
                            style={styles.adjustBtn}
                            onPress={() => openNativePicker(schedule.crawler_name, 'daily')}
                            disabled={isUpdating}
                          >
                            <Text style={styles.adjustBtnText}>SET TIME</Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {mode === 'date_time' && (
                      <View style={styles.scheduleRow}>
                        <View style={styles.labelCol}>
                          <Text style={styles.controlLabel}>ONCE AT:</Text>
                          <Text style={styles.dateLabelText}>
                            {schedule.interval_minutes >= 1000000
                              ? formatDateTime(decodeDateTime(schedule.interval_minutes))
                              : 'NOT SET'}
                          </Text>
                        </View>

                        {Platform.OS === 'web' ? (
                          <input
                            type="datetime-local"
                            style={webStyles.inputDateTime}
                            defaultValue={(() => {
                              if (schedule.interval_minutes < 1000000) return '';
                              const d = decodeDateTime(schedule.interval_minutes);
                              // Format as YYYY-MM-DDTHH:MM
                              const y = d.getFullYear();
                              const m = (d.getMonth() + 1).toString().padStart(2, '0');
                              const day = d.getDate().toString().padStart(2, '0');
                              const h = d.getHours().toString().padStart(2, '0');
                              const min = d.getMinutes().toString().padStart(2, '0');
                              return `${y}-${m}-${day}T${h}:${min}`;
                            })()}
                            onChange={(e) => handleWebDateChange(schedule.crawler_name, e.target.value)}
                            disabled={isUpdating}
                          />
                        ) : (
                          <Pressable
                            style={styles.adjustBtn}
                            onPress={() => openNativePicker(schedule.crawler_name, 'once')}
                            disabled={isUpdating}
                          >
                            <Text style={styles.adjustBtnText}>SET DATE</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Native Dialog Pickers */}
          {Platform.OS !== 'web' && activePickerCrawler && DateTimePicker && (
            <DateTimePicker
              value={pickerValue}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleNativePickerChange}
              minimumDate={new Date()}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Web-specific styles mapping to HTML inline styles
const webStyles = {
  inputTime: {
    fontFamily: 'SpaceMono',
    fontSize: '13px',
    border: '1px solid #1c1b1b',
    backgroundColor: '#f0eded',
    padding: '6px 10px',
    borderRadius: 0,
    outline: 'none',
    color: '#1c1b1b',
  },
  inputDateTime: {
    fontFamily: 'SpaceMono',
    fontSize: '12px',
    border: '1px solid #1c1b1b',
    backgroundColor: '#f0eded',
    padding: '6px 8px',
    borderRadius: 0,
    outline: 'none',
    color: '#1c1b1b',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcf9f8',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  sectionDesc: {
    color: '#926f6a',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'SpaceMono',
    marginBottom: 8,
  },
  scheduleCard: {
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
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
    color: '#1c1b1b',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#926f6a',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    lineHeight: 15,
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  spinner: {
    height: 31,
  },
  settingsPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
    gap: 12,
  },
  modeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#f0eded',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1c1b1b',
  },
  modeBtnActive: {
    backgroundColor: '#bc000a',
  },
  modeBtnText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    fontWeight: '700',
    color: '#1c1b1b',
  },
  modeBtnActiveText: {
    color: '#ffffff',
  },
  intervalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  labelCol: {
    flexDirection: 'column',
    flex: 1,
  },
  controlLabel: {
    color: '#1c1b1b',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  highlightText: {
    color: '#bc000a',
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  dateLabelText: {
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustBtn: {
    backgroundColor: '#f0eded',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 55,
    alignItems: 'center',
  },
  adjustBtnDisabled: {
    opacity: 0.3,
  },
  adjustBtnText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
