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
import { useTheme } from '@/hooks/useTheme';

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
  const colors = useTheme();
  const isDark = colors.background === '#141313';
  const [newSub, setNewSub] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingItems, setUpdatingItems] = useState<Record<string, 'toggle' | 'delete'>>({});

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

  const handleToggle = async (id: string, isActive: boolean) => {
    setUpdatingItems((prev) => ({ ...prev, [id]: 'toggle' }));
    setErrorMsg('');
    try {
      await onToggleSubreddit(id, isActive);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle subreddit.');
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
      await onRemoveSubreddit(id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove subreddit.');
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
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>ADD CUSTOM SUBREDDIT</Text>
      <Text style={[styles.description, { color: colors.text }]}>
        Posts will be fetched unfiltered from custom subreddits.
      </Text>

      {/* Input Box Row */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input, 
            { backgroundColor: colors.surfaceContainer, color: colors.text, borderColor: colors.border },
            errorMsg ? styles.inputError : null
          ]}
          placeholder="E.G. R/SELFHOSTED OR PYTHON"
          placeholderTextColor={colors.tabIconDefault}
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
          style={[
            styles.addButton, 
            { backgroundColor: colors.primary, borderColor: colors.border },
            isSubmitting ? styles.addButtonDisabled : null
          ]}
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
      <Text style={[styles.subTitle, { color: colors.primary }]}>QUICK ADD SUGGESTIONS</Text>
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
                { backgroundColor: colors.surfaceContainer, borderColor: colors.border },
                isAdded ? styles.suggestionChipAdded : null,
              ]}
              onPress={() => !isAdded && handleAdd(sub.name)}
              disabled={isAdded || isSubmitting}
            >
              <Text style={[styles.suggestionText, { color: colors.text }]}>{sub.name.toUpperCase()}</Text>
              {isAdded && (
                <Ionicons name="checkmark-circle" size={12} color={colors.tabIconDefault} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Added List */}
      <Text style={[styles.subTitle, { color: colors.primary }]}>YOUR CUSTOM SUBREDDITS ({subreddits.length})</Text>
      
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : subreddits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="reddit" size={32} color={colors.text} />
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>NO CUSTOM SUBREDDITS ADDED YET.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {subreddits.map((item) => {
            const updatingType = updatingItems[item.id];
            const isUpdating = !!updatingType;

            return (
              <View key={item.id} style={[styles.listItem, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }, isUpdating && { opacity: 0.6 }]}>
                <View style={styles.listItemLeft}>
                  <FontAwesome5 name="reddit-alien" size={16} color={colors.primary} />
                  <Text style={[styles.subredditName, { color: colors.text }]}>{item.subreddit_name.toUpperCase()}</Text>
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
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={colors.primary} />
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
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
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
  addButton: {
    backgroundColor: '#bc000a',
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#926f6a',
    opacity: 0.5,
  },
  errorText: {
    color: '#bc000a',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    marginBottom: 12,
  },
  subTitle: {
    color: '#bc000a',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
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
  },
  subredditName: {
    color: '#1c1b1b',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
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
