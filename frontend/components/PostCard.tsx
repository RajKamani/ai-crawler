import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

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
  };
}

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
          accentColor: '#FF4500', // Orange
          icon: 'reddit',
          bgAccent: 'rgba(255, 69, 0, 0.08)',
        };
      case 'github':
        return {
          accentColor: '#6e5494', // Purple
          icon: 'github',
          bgAccent: 'rgba(110, 84, 148, 0.08)',
        };
      case 'blog':
      default:
        return {
          accentColor: '#FF2D55', // Coral/Red
          icon: 'rss',
          bgAccent: 'rgba(255, 45, 85, 0.08)',
        };
    }
  };

  const theme = getSourceStyles();

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={[styles.sourceBadge, { backgroundColor: theme.bgAccent }]}>
          <FontAwesome5 name={theme.icon} size={13} color={theme.accentColor} />
          <Text style={[styles.sourceText, { color: theme.accentColor }]}>
            {sourceName}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(post.published_at)}</Text>
      </View>

      {/* Post Title */}
      <Pressable onPress={() => Linking.openURL(post.url)}>
        <Text style={styles.title} numberOfLines={3}>
          {post.title}
        </Text>
      </Pressable>

      {/* Snippet / Content Preview */}
      {post.content ? (
        <Text style={styles.contentPreview} numberOfLines={3}>
          {post.content.replace(/\n+/g, ' ')}
        </Text>
      ) : null}

      {/* Tags & Categories Row */}
      <View style={styles.tagsContainer}>
        {post.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{post.category.toUpperCase()}</Text>
          </View>
        )}
        {post.tags &&
          post.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
      </View>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.actionButton}
          onPress={() => Linking.openURL(post.url)}
        >
          <Ionicons name="open-outline" size={18} color="#9BA1A6" />
          <Text style={styles.actionText}>Read Original</Text>
        </Pressable>

        <View style={styles.rightActions}>
          {/* AI Summarize Button */}
          <Pressable
            style={[styles.summarizeBtn, { borderColor: theme.accentColor }]}
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
              color={post.is_bookmarked ? '#FFCC00' : '#9BA1A6'}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    borderRadius: 8,
    gap: 6,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: '#8E8E93',
    fontSize: 11,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
  },
  contentPreview: {
    color: '#D1D1D6',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: '#2C2C35',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: '#E5E5EA',
    fontSize: 10,
    fontWeight: '700',
  },
  tagBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tagText: {
    color: '#8E8E93',
    fontSize: 11,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2A2A32',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#9BA1A6',
    fontSize: 13,
    fontWeight: '500',
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
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  summarizeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookmarkBtn: {
    padding: 2,
  },
});
