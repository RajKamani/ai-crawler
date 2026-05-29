import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Image } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export interface PostType {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  category: string;
  tags: string[];
  published_at: string;
  is_bookmarked: boolean;
  sources?: {
    name: string;
    type: string;
  };
  thumbnail_url?: string;
  ai_summary?: string;
  raw_data?: {
    stars?: number;
    forks?: number;
    language?: string;
    topics?: string[];
    homepage?: string;
    score?: number;
    num_comments?: number;
    upvote_ratio?: number;
    comments?: {
      author: string;
      body: string;
      score: number;
    }[];
  };
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

interface PostCardProps {
  post: PostType;
  onSummarize: (postId: string) => void;
  onToggleBookmark: (postId: string, isBookmarked: boolean) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onSummarize,
  onToggleBookmark,
}) => {
  const colors = useTheme();
  const isDark = colors.background === '#141313';
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

  // Theme accents based on source type
  const getSourceStyles = () => {
    switch (sourceType) {
      case 'reddit':
        return {
          accentColor: isDark ? '#ff6b6b' : '#aa352b', // Secondary (Alert Red-Brown)
          icon: 'reddit',
          bgAccent: colors.surfaceContainer,
        };
      case 'github':
        return {
          accentColor: isDark ? '#5bc0de' : '#00647f', // Tertiary (Deep Blue)
          icon: 'github',
          bgAccent: colors.surfaceContainer,
        };
      case 'blog':
      default:
        return {
          accentColor: colors.primary, // Primary (Alert Red)
          icon: 'rss',
          bgAccent: colors.surfaceContainer,
        };
    }
  };

  const theme = getSourceStyles();

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={[styles.sourceBadge, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <FontAwesome5 name={theme.icon} size={13} color={theme.accentColor} />
          <Text style={[styles.sourceText, { color: theme.accentColor }]}>
            {sourceName}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(post.published_at)}</Text>
      </View>

      {/* Post Title */}
      <Pressable onPress={() => Linking.openURL(post.url)}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {post.title}
        </Text>
      </Pressable>

      {/* Media Preview if present */}
      {getMediaUrl(post) ? (
        <View style={[styles.mediaContainer, { borderColor: colors.border }]}>
          <Image
            source={{ uri: getMediaUrl(post)! }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Snippet / Content Preview */}
      {post.content ? (
        <Text style={[styles.contentPreview, { color: colors.text }]} numberOfLines={3}>
          {post.content.replace(/\n+/g, ' ')}
        </Text>
      ) : null}

      {/* Tags & Categories Row */}
      <View style={styles.tagsContainer}>
        {post.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{post.category.toUpperCase()}</Text>
          </View>
        )}
        {post.tags &&
          post.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tagBadge}>
              <Text style={[styles.tagText, { color: colors.tabIconDefault }]}>#{tag}</Text>
            </View>
          ))}
      </View>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => Linking.openURL(post.url)}
        >
          <Ionicons name="open-outline" size={18} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Read Original</Text>
        </Pressable>

        <View style={styles.rightActions}>
          {/* AI Summarize Button */}
          <Pressable
            style={[styles.summarizeBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}
            onPress={() => onSummarize(post.id)}
          >
            <Ionicons name="sparkles" size={14} color={theme.accentColor} />
            <Text style={[styles.summarizeText, { color: theme.accentColor }]}>
              AI Summary
            </Text>
          </Pressable>

          {/* Bookmark Toggle */}
          <Pressable
            style={styles.bookmarkBtn}
            onPress={() => onToggleBookmark(post.id, post.is_bookmarked)}
          >
            <Ionicons
              name={post.is_bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={post.is_bookmarked ? colors.primary : colors.text}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#f0eded',
    gap: 6,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  dateText: {
    color: '#1c1b1b',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  title: {
    color: '#1c1b1b',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: 'SpaceMono',
  },
  contentPreview: {
    color: '#1c1b1b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: 'SpaceMono',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#f0eded',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  categoryText: {
    color: '#bc000a',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  tagBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tagText: {
    color: '#926f6a',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1c1b1b',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#1c1b1b',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summarizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    backgroundColor: '#f0eded',
    gap: 4,
  },
  summarizeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  bookmarkBtn: {
    padding: 2,
  },
  mediaContainer: {
    width: '100%',
    height: 160,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
});
