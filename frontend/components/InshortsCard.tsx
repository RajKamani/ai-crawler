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
import { MarkdownRenderer } from './MarkdownRenderer';

interface InshortsCardProps {
  post: PostType;
  containerHeight: number;
  onToggleBookmark: (postId: string, isBookmarked: boolean) => void;
  onSummarize: (postId: string) => Promise<string | null>;
  isViewed?: boolean;
}

const getMediaUrl = (post: PostType) => {
  // 1. Direct thumbnail_url if available
  if (post.thumbnail_url && post.thumbnail_url.startsWith('http')) {
    return post.thumbnail_url;
  }

  // 2. Check if post.url itself is an image
  if (post.url && /\.(jpeg|jpg|gif|png|webp|svg)(?:\?.*)?$/i.test(post.url)) {
    return post.url;
  }

  // 3. Check Reddit raw_data thumbnail
  if (post.raw_data && typeof post.raw_data === 'object') {
    const raw: any = post.raw_data;
    if (raw.thumbnail_url && typeof raw.thumbnail_url === 'string' && raw.thumbnail_url.startsWith('http')) {
      return raw.thumbnail_url;
    }
    if (raw.thumbnail && typeof raw.thumbnail === 'string' && raw.thumbnail.startsWith('http')) {
      return raw.thumbnail;
    }
  }

  // 4. Try to find an image URL in the content body
  if (post.content) {
    const imgRegex = /https?:\/\/[^\s"'<>]+\.(?:jpeg|jpg|gif|png|webp|svg)(?:\?[^\s"'<>]+)?/i;
    const match = post.content.match(imgRegex);
    if (match) {
      return match[0];
    }
  }

  return null;
};

export const InshortsCard: React.FC<InshortsCardProps> = ({
  post,
  containerHeight,
  onToggleBookmark,
  onSummarize,
  isViewed = false,
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
          accentColor: '#aa352b',
          icon: 'reddit',
          placeholderBg: '#f0eded',
        };
      case 'github':
        return {
          accentColor: '#00647f',
          icon: 'github',
          placeholderBg: '#f0eded',
        };
      case 'blog':
      default:
        return {
          accentColor: '#bc000a',
          icon: 'rss',
          placeholderBg: '#f0eded',
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

  const mediaUrl = getMediaUrl(post);

  return (
    <View style={[styles.card, { height: containerHeight }]}>
      {/* Header Visual Section */}
      <View style={[styles.headerContainer, { height: headerHeight }]}>
        {mediaUrl ? (
          <>
            <Image
              source={{ uri: mediaUrl }}
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
          {isViewed && (
            <View style={styles.viewedBadge}>
              <Text style={styles.viewedText}>READ</Text>
            </View>
          )}
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
              color={post.is_bookmarked ? '#bc000a' : '#1c1b1b'}
            />
          </Pressable>
        </View>
      </View>

      {/* Main Body Section */}
      <View style={[styles.bodyContainer, { height: contentHeight }]}>
        {/* Post Title */}
        <Text style={[styles.title, isViewed && styles.titleViewed]} numberOfLines={2}>
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
                <Ionicons name="sparkles" size={14} color="#bc000a" />
                <Text style={styles.summaryTitle}>AI Bullet Summary</Text>
              </View>
              {isLoadingSummary ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="small" color="#bc000a" />
                  <Text style={styles.loaderText}>Llama 3 summarizing...</Text>
                </View>
              ) : (
                <View style={styles.bulletsContainer}>
                  {summaryText ? (
                    <MarkdownRenderer content={summaryText} />
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
                    <Ionicons name="star" size={14} color="#bc000a" />
                    <Text style={styles.gitStatText}>{(post.raw_data.stars ?? 0).toLocaleString()} stars</Text>
                  </View>
                  <View style={styles.gitStat}>
                    <FontAwesome5 name="code-branch" size={12} color="#1c1b1b" />
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
            showSummary ? styles.actionActive : { borderColor: '#1c1b1b' },
          ]}
          onPress={handleToggleSummary}
        >
          <Ionicons
            name="sparkles"
            size={15}
            color={showSummary ? '#FFFFFF' : '#1c1b1b'}
          />
          <Text style={[styles.actionBtnText, showSummary ? { color: '#FFFFFF' } : { color: '#1c1b1b' }]}>
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
          <Ionicons name="chevron-forward-outline" size={14} color="#bc000a" />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fcf9f8',
    width: '100%',
    overflow: 'hidden',
  },
  headerContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#f0eded',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#fcf9f8',
    gap: 6,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  dateText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
  floatingBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: '#fcf9f8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  bodyContainer: {
    padding: 20,
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    marginTop: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    zIndex: 2,
    flexDirection: 'column',
  },
  title: {
    color: '#1c1b1b',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 10,
    fontFamily: 'SpaceMono',
  },
  divider: {
    height: 1,
    backgroundColor: '#1c1b1b',
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
    color: '#1c1b1b',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SpaceMono',
  },
  githubStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    backgroundColor: '#f0eded',
    padding: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  gitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gitStatText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
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
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'SpaceMono',
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
    color: '#1c1b1b',
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    fontFamily: 'SpaceMono',
  },
  loaderContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontFamily: 'SpaceMono',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 0,
    borderWidth: 1,
    width: '100%',
    alignSelf: 'center',
  },
  actionActive: {
    backgroundColor: '#bc000a',
    borderColor: '#bc000a',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  footerContainer: {
    backgroundColor: '#f0eded',
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
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
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  footerDomain: {
    color: '#bc000a',
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  viewedBadge: {
    backgroundColor: '#926f6a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    borderRadius: 0,
  },
  viewedText: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  titleViewed: {
    color: '#926f6a',
  },
});
