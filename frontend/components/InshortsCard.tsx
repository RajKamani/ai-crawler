import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { PostType } from './PostCard';

interface InshortsCardProps {
  post: PostType;
  containerHeight: number;
  onToggleBookmark: (postId: string, isBookmarked: boolean) => void;
  onSummarize: (postId: string) => Promise<string | null>;
}

export const InshortsCard: React.FC<InshortsCardProps> = ({
  post,
  containerHeight,
  onToggleBookmark,
  onSummarize,
}) => {
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(post.ai_summary || null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const sourceType = post.sources?.type || 'blog';
  const sourceName = post.sources?.name || post.author || 'Blog';

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getDomain = (urlStr: string) => {
    try {
      const matches = urlStr.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
      return matches && matches[1] ? matches[1].replace('www.', '') : 'source';
    } catch {
      return 'link';
    }
  };

  // Get source styles
  const getSourceStyles = () => {
    switch (sourceType) {
      case 'reddit':
        return {
          accentColor: '#FF4500',
          icon: 'reddit',
          placeholderBg: '#2D1B15',
        };
      case 'github':
        return {
          accentColor: '#58A6FF',
          icon: 'github',
          placeholderBg: '#1A1E2C',
        };
      case 'blog':
      default:
        return {
          accentColor: '#FF2D55',
          icon: 'rss',
          placeholderBg: '#2A1A22',
        };
    }
  };

  const theme = getSourceStyles();

  const handleToggleSummary = async () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }

    setShowSummary(true);
    if (!summaryText) {
      setIsLoadingSummary(true);
      try {
        const fetched = await onSummarize(post.id);
        if (fetched) {
          setSummaryText(fetched);
        } else {
          setSummaryText('Unable to retrieve AI summary.');
        }
      } catch (err) {
        setSummaryText('Error loading AI summary.');
      } finally {
        setIsLoadingSummary(false);
      }
    }
  };

  // Calculate layout heights based on containerHeight
  const headerHeight = Math.floor(containerHeight * 0.28);
  const footerHeight = 56;
  const contentHeight = containerHeight - headerHeight - footerHeight;

  return (
    <View style={[styles.card, { height: containerHeight }]}>
      {/* Header Visual Section */}
      <View style={[styles.headerContainer, { height: headerHeight }]}>
        {post.thumbnail_url ? (
          <>
            <Image
              source={{ uri: post.thumbnail_url }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
          </>
        ) : (
          <View style={[styles.headerPlaceholder, { backgroundColor: theme.placeholderBg }]}>
            <FontAwesome5 name={theme.icon} size={48} color={`${theme.accentColor}30`} />
          </View>
        )}

        {/* Source Badge overlay */}
        <View style={styles.badgeOverlay}>
          <View style={[styles.sourceBadge, { borderColor: `${theme.accentColor}60` }]}>
            <FontAwesome5 name={theme.icon} size={11} color={theme.accentColor} />
            <Text style={[styles.sourceText, { color: theme.accentColor }]}>{sourceName}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(post.published_at)}</Text>
        </View>

        {/* Top Floating Actions */}
        <View style={styles.floatingActions}>
          <Pressable
            style={styles.floatingBtn}
            onPress={() => onToggleBookmark(post.id, post.is_bookmarked)}
          >
            <Ionicons
              name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={post.is_bookmarked ? '#FFCC00' : '#FFFFFF'}
            />
          </Pressable>
        </View>
      </View>

      {/* Main Body Section */}
      <View style={[styles.bodyContainer, { height: contentHeight }]}>
        {/* Post Title */}
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        <View style={styles.divider} />

        {/* Dynamic content scrollable area */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showSummary ? (
            <View style={styles.summaryArea}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="sparkles" size={14} color="#9F62FF" />
                <Text style={styles.summaryTitle}>AI Bullet Summary</Text>
              </View>
              {isLoadingSummary ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color="#9F62FF" />
                  <Text style={styles.loaderText}>Llama 3 summarizing...</Text>
                </View>
              ) : (
                <View style={styles.bulletsContainer}>
                  {summaryText ? (
                    summaryText.split('\n').map((line, idx) => {
                      const cleanLine = line.trim();
                      if (!cleanLine) return null;
                      const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*') || cleanLine.startsWith('•');
                      const text = isBullet ? cleanLine.substring(1).trim() : cleanLine;

                      return (
                        <View key={idx} style={styles.bulletRow}>
                          <Ionicons name="sparkles-outline" size={10} color="#9F62FF" style={styles.bulletIcon} />
                          <Text style={styles.summaryText}>{text}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.summaryText}>No summary available.</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View>
              {post.sources?.type === 'github' && post.raw_data && (
                <View style={styles.githubStatsRow}>
                  <View style={styles.gitStat}>
                    <Ionicons name="star" size={14} color="#FFCC00" />
                    <Text style={styles.gitStatText}>{(post.raw_data.stars ?? 0).toLocaleString()} stars</Text>
                  </View>
                  <View style={styles.gitStat}>
                    <FontAwesome5 name="code-branch" size={12} color="#8E8E93" />
                    <Text style={styles.gitStatText}>{(post.raw_data.forks ?? 0).toLocaleString()} forks</Text>
                  </View>
                  <View style={styles.gitStat}>
                    <Ionicons name="code-slash" size={14} color={theme.accentColor} />
                    <Text style={styles.gitStatText}>{post.raw_data.language ?? 'Unknown'}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.bodyText}>
                {post.content ? post.content.replace(/\n+/g, '\n\n') : 'No content preview available.'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Sparkle Action button inside the text card */}
        <Pressable
          style={[
            styles.actionButton,
            showSummary ? styles.actionActive : { borderColor: theme.accentColor },
          ]}
          onPress={handleToggleSummary}
        >
          <Ionicons
            name="sparkles"
            size={15}
            color={showSummary ? '#FFFFFF' : theme.accentColor}
          />
          <Text style={[styles.actionBtnText, showSummary ? { color: '#FFFFFF' } : { color: theme.accentColor }]}>
            {showSummary ? 'Show Original' : 'AI Aggregated takeaways'}
          </Text>
        </Pressable>
      </View>

      {/* Footer Bottom Sheet Bar */}
      <Pressable
        style={[styles.footerContainer, { height: footerHeight }]}
        onPress={() => Linking.openURL(post.url)}
      >
        <View style={styles.footerContent}>
          <Text style={styles.footerText} numberOfLines={1}>
            read more at <Text style={styles.footerDomain}>{getDomain(post.url)}</Text>
          </Text>
          <Ionicons name="chevron-forward-outline" size={14} color="#9F62FF" />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000000',
    width: '100%',
    overflow: 'hidden',
  },
  headerContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#16161A',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  headerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    left: 20,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    color: '#E5E5EA',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
  floatingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A3A42',
  },
  bodyContainer: {
    padding: 20,
    backgroundColor: '#121214',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -10,
    zIndex: 2,
    flexDirection: 'column',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A32',
    marginBottom: 14,
  },
  scrollArea: {
    flex: 1,
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  bodyText: {
    color: '#E5E5EA',
    fontSize: 14,
    lineHeight: 22,
  },
  githubStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#1E1E24',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  gitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gitStatText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryArea: {
    gap: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  summaryTitle: {
    color: '#9F62FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bulletsContainer: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletIcon: {
    marginTop: 4,
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  loaderContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    width: '100%',
    alignSelf: 'center',
  },
  actionActive: {
    backgroundColor: '#9F62FF',
    borderColor: '#9F62FF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerContainer: {
    backgroundColor: '#1E1E24',
    borderTopWidth: 1,
    borderTopColor: '#2A2A32',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  footerDomain: {
    color: '#9F62FF',
    fontWeight: '700',
  },
});
