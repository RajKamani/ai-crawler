import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Switch,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

interface SubredditItem {
  id: string;
  subreddit_name: string;
  is_active: boolean;
  last_crawled_at?: string;
}

interface SubredditManagerProps {
  subreddits: SubredditItem[];
  suggestions: Array<{ name: string; description: string }>;
  isLoading: boolean;
  onAddSubreddit: (name: string) => Promise<void>;
  onRemoveSubreddit: (id: string) => Promise<void>;
  onToggleSubreddit: (id: string, isActive: boolean) => Promise<void>;
}

export const SubredditManager: React.FC<SubredditManagerProps> = ({
  subreddits,
  suggestions,
  isLoading,
  onAddSubreddit,
  onRemoveSubreddit,
  onToggleSubreddit,
}) => {
  const [newSub, setNewSub] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdd = async (nameToAdd: string) => {
    if (!nameToAdd.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddSubreddit(nameToAdd);
      setNewSub('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Subreddit could not be verified.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title & Description */}
      <Text style={styles.sectionTitle}>Add Custom Subreddit</Text>
      <Text style={styles.description}>
        Posts will be fetched unfiltered from custom subreddits.
      </Text>

      {/* Input Box Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errorMsg ? styles.inputError : null]}
          placeholder="e.g. r/selfhosted or python"
          placeholderTextColor="#8E8E93"
          value={newSub}
          onChangeText={(text) => {
            setNewSub(text);
            if (errorMsg) setErrorMsg('');
          }}
          editable={!isSubmitting}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.addButton, isSubmitting ? styles.addButtonDisabled : null]}
          onPress={() => handleAdd(newSub)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="add" size={24} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Popular Suggestions */}
      <Text style={styles.subTitle}>Quick Add Suggestions</Text>
      <View style={styles.suggestionsContainer}>
        {suggestions.map((sub, idx) => {
          // Check if already added
          const isAdded = subreddits.some(
            (item) =>
              item.subreddit_name.toLowerCase() === sub.name.toLowerCase()
          );

          return (
            <Pressable
              key={idx}
              style={[
                styles.suggestionChip,
                isAdded ? styles.suggestionChipAdded : null,
              ]}
              onPress={() => !isAdded && handleAdd(sub.name)}
              disabled={isAdded || isSubmitting}
            >
              <Text style={styles.suggestionText}>{sub.name}</Text>
              {isAdded && (
                <Ionicons name="checkmark-circle" size={12} color="#8E8E93" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Added List */}
      <Text style={styles.subTitle}>Your Custom Subreddits ({subreddits.length})</Text>
      
      {isLoading ? (
        <ActivityIndicator size="small" color="#9F62FF" style={{ marginVertical: 20 }} />
      ) : subreddits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="reddit" size={32} color="#3A3A42" />
          <Text style={styles.emptyText}>No custom subreddits added yet.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {subreddits.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <FontAwesome5 name="reddit-alien" size={16} color="#FF4500" />
                <Text style={styles.subredditName}>{item.subreddit_name}</Text>
              </View>
              
              <View style={styles.listItemRight}>
                <Switch
                  value={item.is_active}
                  onValueChange={(val) => onToggleSubreddit(item.id, val)}
                  trackColor={{ false: '#3A3A42', true: 'rgba(255, 69, 0, 0.4)' }}
                  thumbColor={item.is_active ? '#FF4500' : '#8E8E93'}
                />
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => onRemoveSubreddit(item.id)}
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
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
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
  addButton: {
    backgroundColor: '#FF4500', // Reddit orange
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 12,
  },
  subTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
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
  },
  subredditName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
