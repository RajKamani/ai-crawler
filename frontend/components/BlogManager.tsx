import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface BlogItem {
  id: string;
  blog_name: string;
  blog_url: string;
  is_active: boolean;
  last_crawled_at?: string;
}

interface BlogManagerProps {
  blogs: BlogItem[];
  suggestions: Array<{ name: string; url: string }>;
  isLoading: boolean;
  onAddBlog: (name: string, url: string) => Promise<void>;
  onRemoveBlog: (id: string) => Promise<void>;
  onToggleBlog: (id: string, isActive: boolean) => Promise<void>;
}

export const BlogManager: React.FC<BlogManagerProps> = ({
  blogs,
  suggestions,
  isLoading,
  onAddBlog,
  onRemoveBlog,
  onToggleBlog,
}) => {
  const colors = useTheme();
  const isDark = colors.isDark;
  const [blogName, setBlogName] = useState('');
  const [blogUrl, setBlogUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Record<string, 'toggle' | 'delete'>>({});

  const handleAdd = async (name: string, url: string) => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      setErrorMsg('Both name and RSS URL are required');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddBlog(trimmedName, trimmedUrl);
      setBlogName('');
      setBlogUrl('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not parse RSS feed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    setUpdatingItems((prev) => ({ ...prev, [id]: 'toggle' }));
    setErrorMsg('');
    try {
      await onToggleBlog(id, isActive);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle blog.');
    } finally {
      setUpdatingItems((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleRemove = async (id: string) => {
    setUpdatingItems((prev) => ({ ...prev, [id]: 'delete' }));
    setErrorMsg('');
    try {
      await onRemoveBlog(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove blog.');
    } finally {
      setUpdatingItems((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Title & Description */}
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>ADD CUSTOM BLOG RSS FEED</Text>
      <Text style={[styles.description, { color: colors.text }]}>
        Add any valid RSS or Atom feed URL to aggregate posts in your personalized feed.
      </Text>

      {/* Input Fields */}
      <View style={styles.form}>
        <TextInput
          style={[
            styles.input, 
            { backgroundColor: colors.surfaceContainer, color: colors.text, borderColor: colors.border },
            errorMsg ? styles.inputError : null
          ]}
          placeholder="BLOG NAME (E.G. TECHCRUNCH AI)"
          placeholderTextColor={colors.tabIconDefault}
          value={blogName}
          onChangeText={(text) => {
            setBlogName(text);
            if (errorMsg) setErrorMsg('');
          }}
          editable={!isSubmitting}
        />
        <TextInput
          style={[
            styles.input, 
            { backgroundColor: colors.surfaceContainer, color: colors.text, borderColor: colors.border },
            errorMsg ? styles.inputError : null
          ]}
          placeholder="RSS FEED URL"
          placeholderTextColor={colors.tabIconDefault}
          value={blogUrl}
          onChangeText={(text) => {
            setBlogUrl(text);
            if (errorMsg) setErrorMsg('');
          }}
          editable={!isSubmitting}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <Pressable
          style={[
            styles.submitButton, 
            { backgroundColor: colors.primary, borderColor: colors.border },
            isSubmitting ? styles.submitButtonDisabled : null
          ]}
          onPress={() => handleAdd(blogName, blogUrl)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>ADD BLOG FEED</Text>
            </>
          )}
        </Pressable>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Suggestions */}
      <Text style={[styles.subTitle, { color: colors.primary }]}>QUICK ADD POPULAR FEEDS</Text>
      <View style={styles.suggestionsContainer}>
        {suggestions.map((blog, idx) => {
          // Check if already added
          const isAdded = blogs.some(
            (item) => item.blog_url.toLowerCase() === blog.url.toLowerCase()
          );

          return (
            <Pressable
              key={idx}
              style={[
                styles.suggestionChip,
                { backgroundColor: colors.surfaceContainer, borderColor: colors.border },
                isAdded ? styles.suggestionChipAdded : null,
              ]}
              onPress={() => !isAdded && handleAdd(blog.name, blog.url)}
              disabled={isAdded || isSubmitting}
            >
              <Text style={[styles.suggestionText, { color: colors.text }]}>{blog.name.toUpperCase()}</Text>
              {isAdded && (
                <Ionicons name="checkmark-circle" size={12} color={colors.tabIconDefault} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Added List */}
      <Text style={[styles.subTitle, { color: colors.primary }]}>YOUR CUSTOM BLOGS ({blogs.length})</Text>

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : blogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="rss" size={30} color={colors.text} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>NO CUSTOM BLOGS ADDED YET.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {blogs.map((item) => {
            const updatingType = updatingItems[item.id];
            const isUpdating = !!updatingType;

            return (
              <View key={item.id} style={[styles.listItem, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }, isUpdating && { opacity: 0.6 }]}>
                <View style={styles.listItemLeft}>
                  <FontAwesome5 name="rss" size={14} color={colors.primary} />
                  <View style={styles.blogMeta}>
                    <Text style={[styles.blogName, { color: colors.text }]}>{item.blog_name.toUpperCase()}</Text>
                    <Text style={[styles.blogUrl, { color: colors.tabIconDefault }]} numberOfLines={1}>
                      {item.blog_url}
                    </Text>
                  </View>
                </View>

                <View style={styles.listItemRight}>
                  {updatingType === 'toggle' ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                  ) : (
                    <Switch
                      value={item.is_active}
                      onValueChange={(val) => handleToggle(item.id, val)}
                      trackColor={{ false: isDark ? '#2c2b2b' : '#dcd9d9', true: isDark ? 'rgba(255, 79, 79, 0.3)' : 'rgba(188, 0, 10, 0.3)' }}
                      thumbColor={item.is_active ? colors.primary : colors.tabIconDefault}
                      disabled={isUpdating}
                    />
                  )}
                  <Pressable
                    style={[styles.deleteBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.primary }, isUpdating && { opacity: 0.5 }]}
                    onPress={() => handleRemove(item.id)}
                    disabled={isUpdating}
                  >
                    {updatingType === 'delete' ? (
                      <ActivityIndicator size="small" color="#bc000a" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#bc000a" />
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#1c1b1b',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  description: {
    color: '#926f6a',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'SpaceMono',
    marginBottom: 16,
  },
  form: {
    gap: 10,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#f0eded',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    color: '#1c1b1b',
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
  inputError: {
    borderColor: '#bc000a',
  },
  submitButton: {
    backgroundColor: '#bc000a',
    borderRadius: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1c1b1b',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#926f6a',
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  errorText: {
    color: '#bc000a',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  subTitle: {
    color: '#bc000a',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    marginTop: 20,
    marginBottom: 10,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0eded',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    gap: 4,
  },
  suggestionChipAdded: {
    backgroundColor: '#dcd9d9',
    opacity: 0.5,
  },
  suggestionText: {
    color: '#1c1b1b',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#926f6a',
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fcf9f8',
    borderRadius: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1c1b1b',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  blogMeta: {
    flex: 1,
  },
  blogName: {
    color: '#1c1b1b',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  blogUrl: {
    color: '#926f6a',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    backgroundColor: '#f0eded',
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#bc000a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
