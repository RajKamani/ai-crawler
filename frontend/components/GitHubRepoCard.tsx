import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { PostType } from './PostCard';
import { useTheme } from '@/hooks/useTheme';

interface GitHubRepoCardProps {
  post: PostType;
  onSummarize: (postId: string) => void;
  onToggleBookmark: (postId: string, isBookmarked: boolean) => void;
}

export const GitHubRepoCard: React.FC<GitHubRepoCardProps> = ({
  post,
  onSummarize,
  onToggleBookmark,
}) => {
  const colors = useTheme();
  const isDark = colors.isDark;
  const repoData = post.raw_data || {};
  const stars = repoData.stars ?? 0;
  const forks = repoData.forks ?? 0;
  const language = repoData.language ?? 'Unknown';
  const topics = repoData.topics ?? [];
  const homepage = repoData.homepage;

  // Split title (owner/repo)
  const parts = post.title.split('/');
  const owner = parts[0] || post.author || '';
  const repoName = parts[1] || '';

  // Language color mapping
  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return '#3572A5';
      case 'javascript':
      case 'js':
        return '#f1e05a';
      case 'typescript':
      case 'ts':
        return '#3178c6';
      case 'rust':
        return '#dea584';
      case 'go':
      case 'golang':
        return '#00ADD8';
      case 'c++':
        return '#f34b7d';
      case 'html':
        return '#e34c26';
      case 'css':
        return '#563d7c';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Top Source Info */}
      <View style={styles.header}>
        <View style={[styles.sourceBadge, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
          <FontAwesome5 name="github" size={13} color={colors.text} />
          <Text style={[styles.sourceText, { color: colors.text }]}>GitHub Trending</Text>
        </View>
        <Text style={[styles.languageText, { color: colors.text }]}>
          <View
            style={[
              styles.langDot,
              { backgroundColor: getLanguageColor(language) },
            ]}
          />{' '}
          {language}
        </Text>
      </View>

      {/* Repo Title (Owner / RepoName) */}
      <Pressable onPress={() => Linking.openURL(post.url)}>
        <View style={styles.repoTitleContainer}>
          <Text style={[styles.ownerText, { color: colors.tabIconDefault }]}>{owner} /</Text>
          <Text style={[styles.repoNameText, { color: colors.primary }]}>{repoName}</Text>
        </View>
      </Pressable>

      {/* Repo Description */}
      {post.content ? (
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={3}>
          {post.content.split('\n')[0]} {/* Print only description first line */}
        </Text>
      ) : null}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="star" size={14} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stars.toLocaleString()}</Text>
        </View>
        <View style={styles.stat}>
          <FontAwesome5 name="code-branch" size={12} color={colors.text} />
          <Text style={[styles.statValue, { color: colors.text }]}>{forks.toLocaleString()}</Text>
        </View>
      </View>

      {/* Topics Tags */}
      {topics.length > 0 && (
        <View style={styles.topicsContainer}>
          {topics.slice(0, 4).map((topic: string, idx: number) => (
            <View key={idx} style={[styles.topicBadge, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <Text style={[styles.topicText, { color: isDark ? '#5bc0de' : '#00647f' }]}>{topic}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => Linking.openURL(post.url)}
        >
          <Ionicons name="logo-github" size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>View Repo</Text>
        </Pressable>

        <View style={styles.rightActions}>
          {/* AI Summary Button */}
          <Pressable style={[styles.summarizeBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]} onPress={() => onSummarize(post.id)}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.summarizeText, { color: colors.primary }]}>AI Summary</Text>
          </Pressable>

          {/* Bookmark Button */}
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
    marginBottom: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0eded',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    gap: 6,
  },
  sourceText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  languageText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 0,
  },
  repoTitleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  ownerText: {
    color: '#926f6a',
    fontSize: 17,
    fontWeight: '500',
    marginRight: 4,
    fontFamily: 'SpaceMono',
  },
  repoNameText: {
    color: '#bc000a',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  description: {
    color: '#1c1b1b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: 'SpaceMono',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  topicBadge: {
    backgroundColor: '#f0eded',
    borderColor: '#1c1b1b',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 0,
  },
  topicText: {
    color: '#00647f',
    fontSize: 11,
    fontWeight: '500',
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
    fontWeight: '500',
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
    gap: 4,
    backgroundColor: '#f0eded',
  },
  summarizeText: {
    color: '#bc000a',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  bookmarkBtn: {
    padding: 2,
  },
});
