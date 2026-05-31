import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/utils/supabase';
import { API_BASE_URL, AUTH_HEADER } from '@/constants/Config';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function GitHubSettingsScreen() {
  const { user } = useAuth();
  const colors = useTheme();
  const isDark = colors.isDark;

  const [githubEnabled, setGithubEnabled] = useState(true);
  const [githubLanguage, setGithubLanguage] = useState('any');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load initial preferences from user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      if (user.user_metadata.github_enabled !== undefined) {
        setGithubEnabled(!!user.user_metadata.github_enabled);
      }
      if (user.user_metadata.github_language !== undefined) {
        setGithubLanguage(user.user_metadata.github_language);
      }
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setShowSuccess(false);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          github_enabled: githubEnabled,
          github_language: githubLanguage,
        },
      });

      if (error) throw error;

      setShowSuccess(true);

      // Trigger immediate crawl if enabled
      if (githubEnabled) {
        fetch(`${API_BASE_URL}/crawl`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...AUTH_HEADER,
          },
          body: JSON.stringify({ crawler: 'github_trending' }),
        }).catch((err) => console.error('Failed to trigger github crawl:', err));
      }
    } catch (err: any) {
      console.error('Failed to update GitHub preferences:', err);
      showAlert('Save Error', err.message || 'Failed to save configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>GITHUB TRENDING</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>CUSTOMIZE PROGRAMMING LANGUAGES</Text>
        </View>

        {/* Config Container */}
        <View
          style={[
            styles.githubCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.border,
              shadowColor: colors.border,
            },
          ]}
        >
          <View style={styles.githubHeaderRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.githubTitle, { color: colors.text }]}>ENABLE GITHUB TRENDING</Text>
              <Text style={[styles.githubSubText, { color: colors.tabIconDefault }]}>
                Incorporate daily & monthly top repositories from GitHub directly into your feed.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setGithubEnabled(!githubEnabled);
                setShowSuccess(false);
              }}
              style={[
                styles.checkbox,
                {
                  borderColor: colors.border,
                  backgroundColor: githubEnabled ? colors.primary : colors.background,
                },
              ]}
            >
              {githubEnabled && <Ionicons name="checkmark" size={12} color={colors.background} />}
            </Pressable>
          </View>

          {githubEnabled && (
            <View style={[styles.langSelector, { borderTopColor: colors.border }]}>
              <Text style={[styles.langLabel, { color: colors.primary }]}>FILTER BY LANGUAGE</Text>
              <View style={styles.langChips}>
                {['Any', 'Python', 'Rust', 'JavaScript', 'Go'].map((lang) => {
                  const val = lang.toLowerCase();
                  const isSelected = githubLanguage === val;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => {
                        setGithubLanguage(val);
                        setShowSuccess(false);
                      }}
                      style={[
                        styles.langChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: isSelected ? colors.primary : colors.background,
                        },
                      ]}
                    >
                      <Text style={[styles.langChipText, { color: isSelected ? colors.background : colors.text }]}>
                        {lang.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {showSuccess && (
          <View style={[styles.successBanner, { borderColor: '#22c55e', backgroundColor: colors.surfaceContainer }]}>
            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            <Text style={[styles.successText, { color: colors.text }]}>
              PREFERENCES UPDATED SUCCESSFULLY
            </Text>
          </View>
        )}

        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.primary,
              borderColor: colors.border,
              shadowColor: colors.border,
            },
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.background }]}>
              SAVE PREFERENCES
            </Text>
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
  githubCard: {
    borderWidth: 2,
    padding: 16,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginBottom: 20,
  },
  githubHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  githubTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
  },
  githubSubText: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    marginTop: 4,
    lineHeight: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSelector: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 8,
  },
  langLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
  langChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  langChipText: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    fontWeight: '700',
  },
  saveButton: {
    height: 52,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
