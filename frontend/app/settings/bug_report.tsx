import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/context/ToastContext';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';
import { getErrorMessage } from '@/utils/error';
import { router } from 'expo-router';

export default function BugReportScreen() {
  const colors = useTheme();
  const isDark = colors.isDark;
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [logs, setLogs] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    const { width, height, scale } = Dimensions.get('window');
    setDeviceInfo({
      os: Platform.OS,
      os_version: String(Platform.Version),
      screen_width: width,
      screen_height: height,
      screen_scale: scale,
      platform_type: Platform.select({
        web: 'Web Browser',
        ios: 'iOS Device',
        android: 'Android Device',
        default: 'Unknown',
      }),
    });
  }, []);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle) {
      showToast({ message: 'Title is required', type: 'error' });
      return;
    }
    if (!trimmedDesc) {
      showToast({ message: 'Description is required', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bug-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...AUTH_HEADER,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDesc,
          steps_to_reproduce: steps.trim() || null,
          device_info: deviceInfo,
          logs: logs.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data, 'Failed to submit bug report'));
      }

      showToast({ message: 'Bug report submitted successfully!', type: 'success' });
      setTitle('');
      setDescription('');
      setSteps('');
      setLogs('');
      
      // Navigate back to the settings hub
      router.back();
    } catch (error: any) {
      console.error('Error submitting bug report:', error);
      showToast({
        message: error.message || 'Failed to submit bug report. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>BUG & CRASH REPORT</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>SUBMIT SYSTEM LOGS AND DEVICE METADATA</Text>
        </View>

        {/* Input Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.border,
            },
          ]}
        >
          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>REPORT TITLE *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.text,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., App crashes when reloading subreddits"
              placeholderTextColor={colors.tabIconDefault}
              maxLength={200}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>DESCRIPTION *</Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.text,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide a detailed description of what went wrong..."
              placeholderTextColor={colors.tabIconDefault}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={5000}
            />
          </View>

          {/* Steps to reproduce */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>STEPS TO REPRODUCE</Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.text,
                },
              ]}
              value={steps}
              onChangeText={setSteps}
              placeholder="1. Open Reddit tab&#10;2. Pull to refresh&#10;3. Observe crash"
              placeholderTextColor={colors.tabIconDefault}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={5000}
            />
          </View>

          {/* Logs */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.primary }]}>SYSTEM LOGS / STACK TRACE</Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                styles.codeLogsInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceContainer,
                  color: colors.text,
                },
              ]}
              value={logs}
              onChangeText={setLogs}
              placeholder="Paste any console error logs or stack traces here..."
              placeholderTextColor={colors.tabIconDefault}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={50000}
            />
          </View>
        </View>

        {/* Auto-collected Metadata Card */}
        <View
          style={[
            styles.metadataCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.metadataHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.metadataTitle, { color: colors.primary }]}>AUTO-COLLECTED DEVICE METADATA</Text>
          </View>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataRow}>
              <Text style={[styles.metaKey, { color: colors.tabIconDefault }]}>PLATFORM:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{String(deviceInfo.platform_type).toUpperCase()}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={[styles.metaKey, { color: colors.tabIconDefault }]}>OS VERSION:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{String(deviceInfo.os_version).toUpperCase()}</Text>
            </View>
            <View style={styles.metadataRow}>
              <Text style={[styles.metaKey, { color: colors.tabIconDefault }]}>RESOLUTION:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>{deviceInfo.screen_width}x{deviceInfo.screen_height} (@{deviceInfo.screen_scale}x)</Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.border,
              shadowColor: colors.border,
            },
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <View style={styles.submitButtonContent}>
              <Ionicons name="paper-plane-outline" size={18} color={colors.background} />
              <Text style={[styles.submitButtonText, { color: colors.background }]}>
                SUBMIT BUG REPORT
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  headerBlock: {
    marginBottom: 24,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 1,
  },
  card: {
    borderWidth: 2,
    padding: 16,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginBottom: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
  multilineInput: {
    height: 100,
    paddingVertical: 10,
  },
  codeLogsInput: {
    height: 140,
    fontFamily: 'SpaceMono',
    fontSize: 11,
  },
  metadataCard: {
    borderWidth: 2,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataTitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
  metadataGrid: {
    gap: 6,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: {
    fontSize: 9,
    fontFamily: 'SpaceMono-Bold',
  },
  metaVal: {
    fontSize: 9,
    fontFamily: 'SpaceMono',
    fontWeight: '700',
  },
  submitButton: {
    height: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 8,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
