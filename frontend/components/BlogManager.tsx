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
  const [blogName, setBlogName] = useState('');
  const [blogUrl, setBlogUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <View style={styles.container}>
      {/* Title & Description */}
      <Text style={styles.sectionTitle}>Add Custom Blog RSS Feed</Text>
      <Text style={styles.description}>
        Add any valid RSS or Atom feed URL to aggregate posts in your personalized feed.
      </Text>

      {/* Input Fields */}
      <View style={styles.form}>
        <TextInput
          style={[styles.input, errorMsg ? styles.inputError : null]}
          placeholder="Blog Name (e.g. TechCrunch AI)"
          placeholderTextColor="#8E8E93"
          value={blogName}
          onChangeText={(text) => {
            setBlogName(text);
            if (errorMsg) setErrorMsg('');
          }}
          editable={!isSubmitting}
        />
        <TextInput
          style={[styles.input, errorMsg ? styles.inputError : null]}
          placeholder="RSS Feed URL"
          placeholderTextColor="#8E8E93"
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
          style={[styles.submitButton, isSubmitting ? styles.submitButtonDisabled : null]}
          onPress={() => handleAdd(blogName, blogUrl)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>Add Blog Feed</Text>
            </>
          )}
        </Pressable>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Suggestions */}
      <Text style={styles.subTitle}>Quick Add Popular Feeds</Text>
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
                isAdded ? styles.suggestionChipAdded : null,
              ]}
              onPress={() => !isAdded && handleAdd(blog.name, blog.url)}
              disabled={isAdded || isSubmitting}
            >
              <Text style={styles.suggestionText}>{blog.name}</Text>
              {isAdded && (
                <Ionicons name="checkmark-circle" size={12} color="#8E8E93" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Added List */}
      <Text style={styles.subTitle}>Your Custom Blogs ({blogs.length})</Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#FF2D55" style={{ marginVertical: 20 }} />
      ) : blogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="rss" size={30} color="#3A3A42" />
          <Text style={styles.emptyText}>No custom blogs added yet.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {blogs.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <FontAwesome5 name="rss" size={14} color="#FF2D55" />
                <View style={styles.blogMeta}>
                  <Text style={styles.blogName}>{item.blog_name}</Text>
                  <Text style={styles.blogUrl} numberOfLines={1}>
                    {item.blog_url}
                  </Text>
                </View>
              </View>

              <View style={styles.listItemRight}>
                <Switch
                  value={item.is_active}
                  onValueChange={(val) => onToggleBlog(item.id, val)}
                  trackColor={{ false: '#3A3A42', true: 'rgba(255, 45, 85, 0.4)' }}
                  thumbColor={item.is_active ? '#FF2D55' : '#8E8E93'}
                />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => onRemoveBlog(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A32',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  form: {
    gap: 10,
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#16161A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A32',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  submitButton: {
    backgroundColor: '#FF2D55', // Blog red
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  subTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#2A2A32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  suggestionChipAdded: {
    backgroundColor: 'rgba(42, 42, 50, 0.4)',
    opacity: 0.7,
  },
  suggestionText: {
    color: '#E5E5EA',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A32',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  blogUrl: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
