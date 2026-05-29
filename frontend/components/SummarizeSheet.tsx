import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTheme } from '@/hooks/useTheme';

interface SummarizeSheetProps {
  isVisible: boolean;
  onClose: () => void;
  postTitle: string;
  summary: string | null;
  isLoading: boolean;
}

export const SummarizeSheet: React.FC<SummarizeSheetProps> = ({
  isVisible,
  onClose,
  postTitle,
  summary,
  isLoading,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Backdrop dismiss pressable */}
        <Pressable style={styles.dismissArea} onPress={onClose} />
        
        {/* Bottom Sheet Container */}
        <View style={[styles.sheetContainer, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Drag Handle indicator */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          {/* Header Row */}
          <View style={styles.header}>
            <View style={styles.sparkleTitle}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={[styles.headerText, { color: colors.text }]}>AI TAKEAWAYS</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer, borderColor: colors.border }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Post Title Context */}
          <Text style={[styles.postTitle, { color: colors.tabIconDefault }]} numberOfLines={2}>
            {postTitle}
          </Text>

          {/* Content Area */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>Groq Llama 3.3 is reading and summarizing...</Text>
              </View>
            ) : (
              <View style={styles.summaryContainer}>
                {summary ? (
                  <MarkdownRenderer content={summary} />
                ) : (
                  <Text style={[styles.summaryText, { color: colors.text }]}>No summary available.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.footer}>
            <Pressable style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.border }]} onPress={onClose}>
              <Text style={styles.actionBtnText}>GOT IT, THANKS!</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#fcf9f8',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    borderBottomWidth: 0,
    height: '75%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#1c1b1b',
    borderRadius: 0,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sparkleTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: '#1c1b1b',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  closeBtn: {
    backgroundColor: '#f0eded',
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTitle: {
    color: '#926f6a',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'SpaceMono',
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#926f6a',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
  },
  summaryContainer: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletPoint: {
    marginTop: 4,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    color: '#1c1b1b',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontFamily: 'SpaceMono',
  },
  nonBulletText: {
    fontWeight: '700',
    color: '#1c1b1b',
  },
  footer: {
    paddingHorizontal: 20,
  },
  actionBtn: {
    backgroundColor: '#bc000a',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#1c1b1b',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});

