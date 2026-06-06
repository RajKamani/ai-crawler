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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { API_BASE_URL, AUTH_HEADER } from '../constants/Config';
import { supabase } from '../utils/supabase';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export interface OnboardingScreenProps {
  onComplete: () => void;
}

interface BlogSuggestion {
  name: string;
  url: string;
}

interface SubredditSuggestion {
  name: string;
  description: string;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const colors = useTheme();
  const isDark = colors.isDark;

  const [blogs, setBlogs] = useState<BlogSuggestion[]>([]);
  const [subreddits, setSubreddits] = useState<SubredditSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Store selected blogs by URL, subreddits by name
  const [selectedBlogs, setSelectedBlogs] = useState<Set<string>>(new Set());
  const [selectedSubreddits, setSelectedSubreddits] = useState<Set<string>>(new Set());
  const [githubEnabled, setGithubEnabled] = useState(true);
  const [githubLanguage, setGithubLanguage] = useState('any');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!isLoadingFeed) return;
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 400);
    return () => clearInterval(interval);
  }, [isLoadingFeed]);

  useEffect(() => {
    if (!isLoadingFeed) return;

    const logs = [
      '▶ INITIALIZING CORE ENGINE…',
      '▶ ESTABLISHING SECURE CONNECTION TO SUPABASE…',
      '▶ REGISTERING SELECTED CONTENT SOURCES…',
      '▶ INITIATING RSS CRAWLER DAEMON…',
      '▶ INITIATING REDDIT API WRAPPER…',
      '▶ SPARKING LLM SUMMARIZATION INSTANCES…',
      '▶ POPULATING PERSONALISED DOCK…',
      '▶ OPTIMIZING CONTRAST AND FONTS…',
      '▶ FEED GENERATION COMPLETE // ENJOY CRAWLER',
    ];

    let logIndex = 0;
    setTerminalLogs([logs[0]]);
    
    // Interval to add logs
    const logInterval = setInterval(() => {
      logIndex++;
      if (logIndex < logs.length) {
        setTerminalLogs((prev) => [...prev, logs[logIndex]]);
      } else {
        clearInterval(logInterval);
      }
    }, 400);

    // Interval to update progress percentage
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Complete onboarding after 100% and small delay
          setTimeout(() => {
            onComplete();
          }, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 150);

    return () => {
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [isLoadingFeed]);

  // Recommendations to pre-select
  const recommendedBlogs = [
    'https://openai.com/blog/rss.xml',
    'https://www.anthropic.com/blog/rss',
    'https://deepmind.google/blog/rss.xml'
  ];
  const recommendedSubs = ['r/singularity', 'r/SideProject', 'r/LocalLLaMA'];

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        // Fetch popular suggestions from backend APIs
        const [blogsRes, subsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/blogs/popular`),
          fetch(`${API_BASE_URL}/subreddits/popular`)
        ]);

        if (blogsRes.ok && subsRes.ok) {
          const blogsData = await blogsRes.json();
          const subsData = await subsRes.json();

          const fetchedBlogs = blogsData.suggestions || [];
          const fetchedSubs = subsData.suggestions || [];

          setBlogs(fetchedBlogs);
          setSubreddits(fetchedSubs);

          // Pre-select recommended items
          const initialBlogs = new Set<string>();
          fetchedBlogs.forEach((b: BlogSuggestion) => {
            if (recommendedBlogs.includes(b.url)) {
              initialBlogs.add(b.url);
            }
          });

          const initialSubs = new Set<string>();
          fetchedSubs.forEach((s: SubredditSuggestion) => {
            if (recommendedSubs.includes(s.name)) {
              initialSubs.add(s.name);
            }
          });

          setSelectedBlogs(initialBlogs);
          setSelectedSubreddits(initialSubs);
        }
      } catch (err) {
        console.error('Failed to load onboarding suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, []);

  const toggleBlog = (url: string) => {
    setSelectedBlogs((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const toggleSubreddit = (name: string) => {
    setSelectedSubreddits((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleInitialize = async () => {
    setIsSubmitting(true);
    try {
      // 1. Submit selected blogs in parallel/sequence
      const blogPromises = Array.from(selectedBlogs).map((url) => {
        const blogObj = blogs.find((b) => b.url === url);
        const name = blogObj ? blogObj.name : url;
        return fetch(`${API_BASE_URL}/me/blogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
          body: JSON.stringify({ name, url }),
        });
      });

      // 2. Submit selected subreddits in parallel/sequence
      const subPromises = Array.from(selectedSubreddits).map((name) => {
        return fetch(`${API_BASE_URL}/me/subreddits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
          body: JSON.stringify({ subreddit_name: name }),
        });
      });

      await Promise.all([...blogPromises, ...subPromises]);

      // 3. Update Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          github_enabled: githubEnabled,
          github_language: githubLanguage,
        }
      });

      if (error) throw error;

      // 4. Trigger immediate crawls (non-blocking)
      fetch(`${API_BASE_URL}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ crawler: 'blog_user' }),
      }).catch(err => console.error('Immediate blog crawl failed:', err));

      fetch(`${API_BASE_URL}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ crawler: 'reddit_user' }),
      }).catch(err => console.error('Immediate reddit crawl failed:', err));

      if (githubEnabled) {
        fetch(`${API_BASE_URL}/crawl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
          body: JSON.stringify({ crawler: 'github_trending' }),
        }).catch(err => console.error('Immediate github crawl failed:', err));
      }

      setIsLoadingFeed(true);
    } catch (err: any) {
      console.error('Onboarding submission failed:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('JWT') || errMsg.includes('claim') || errMsg.includes('does not exist') || errMsg.includes('invalid')) {
        try {
          await supabase.auth.signOut();
        } catch (cleanErr) {
          console.error('Error signing out stale session:', cleanErr);
        }
      }
      showAlert('Initialization Error', errMsg || 'Failed to save configurations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingSuggestions) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>LOADING INTELLIGENCE PLUGINS…</Text>
      </View>
    );
  }

  if (isLoadingFeed) {
    const barWidth = 20;
    const filledBlocks = Math.floor((progress / 100) * barWidth);
    const emptyBlocks = barWidth - filledBlocks;
    const progressBar = '[' + '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + ']';

    return (
      <View style={[styles.terminalContainer, { backgroundColor: '#131313' }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.terminalHeader, { borderBottomColor: colors.primary }]}>
            <View style={styles.terminalDotRow}>
              <View style={[styles.terminalDot, { backgroundColor: '#ff5f56' }]} />
              <View style={[styles.terminalDot, { backgroundColor: '#ffbd2e' }]} />
              <View style={[styles.terminalDot, { backgroundColor: '#27c93f' }]} />
            </View>
            <Text style={styles.terminalHeaderText}>CRAWLER CORE SESSION // STAGE_1_INIT</Text>
          </View>

          <ScrollView style={styles.terminalBody} contentContainerStyle={styles.terminalBodyContent}>
            {terminalLogs.map((log, index) => (
              <Text key={index} style={styles.terminalText}>{log}</Text>
            ))}
            <Text style={styles.terminalText}> </Text>
            <Text style={[styles.terminalText, { color: colors.primary }]}>
              {progressBar} {progress}%
            </Text>
            <Text style={styles.terminalText}>
              ▶ STATUS: {progress < 100 ? 'SYNCHRONIZING FEED CLOUDS…' : 'INITIALIZATION COMPLETE '}
              {progress < 100 && (
                <Text style={[styles.terminalText, { opacity: cursorVisible ? 1 : 0 }]}>█</Text>
              )}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const totalSelected = selectedBlogs.size + selectedSubreddits.size + (githubEnabled ? 1 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>CHOOSE YOUR SOURCES</Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>INITIALIZE YOUR TECH INTELLIGENCE STREAM</Text>
        </View>

        {/* Section: Tech Blogs */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>TECH PROVIDERS & CORPORATE BLOGS</Text>
        <View style={styles.blogsGrid}>
          {blogs.map((blog) => {
            const isSelected = selectedBlogs.has(blog.url);
            return (
              <Pressable
                key={blog.url}
                style={[
                  styles.blogCard,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceContainer,
                    borderColor: colors.border,
                    shadowColor: colors.border,
                  },
                ]}
                onPress={() => toggleBlog(blog.url)}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.blogCardName,
                      { color: isSelected ? colors.background : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {blog.name.toUpperCase()}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.background} />
                  )}
                </View>
                <Text
                  style={[
                    styles.blogCardUrl,
                    { color: isSelected ? colors.background : colors.tabIconDefault },
                  ]}
                  numberOfLines={1}
                >
                  {blog.url}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Section: Subreddits */}
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>REDDIT SUBREDDITS</Text>
        <View style={styles.subsContainer}>
          {subreddits.map((sub) => {
            const isSelected = selectedSubreddits.has(sub.name);
            return (
              <Pressable
                key={sub.name}
                style={[
                  styles.subPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceContainer,
                    borderColor: colors.border,
                    shadowColor: colors.border,
                  },
                ]}
                onPress={() => toggleSubreddit(sub.name)}
              >
                <Text style={[styles.subPillText, { color: isSelected ? colors.background : colors.text }]}>
                  {sub.name.toUpperCase()}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={12} color={colors.background} style={styles.checkIcon} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Section: GitHub Trending */}
        <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 24 }]}>GITHUB TRENDING REPOSITORIES</Text>
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
              onPress={() => setGithubEnabled(!githubEnabled)}
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
                      onPress={() => setGithubLanguage(val)}
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

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
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
          onPress={handleInitialize}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.submitButtonText, { color: colors.background }]}>
              {totalSelected > 0
                ? `INITIALIZE FEED (${totalSelected} SOURCES)`
                : 'INITIALIZE EMPTY FEED'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 1.5,
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 48 : 24,
    marginBottom: 32,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  blogsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  blogCard: {
    width: '48%',
    borderWidth: 2,
    padding: 12,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  blogCardName: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    flex: 1,
    marginRight: 4,
  },
  blogCardUrl: {
    fontSize: 9,
    fontFamily: 'SpaceMono',
  },
  subsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  subPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
  },
  checkIcon: {
    marginLeft: 6,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    padding: 16,
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
  githubCard: {
    borderWidth: 2,
    padding: 16,
    marginTop: 16,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
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
  terminalContainer: {
    flex: 1,
    backgroundColor: '#131313',
    padding: 24,
  },
  terminalHeader: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terminalDotRow: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terminalHeaderText: {
    fontSize: 10,
    fontFamily: 'SpaceMono',
    color: '#888888',
  },
  terminalBody: {
    flex: 1,
  },
  terminalBodyContent: {
    gap: 8,
  },
  terminalText: {
    color: '#00ff66',
    fontFamily: 'SpaceMono',
    fontSize: 11,
    lineHeight: 18,
  },
});
