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
        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Drag Handle indicator */}
          <View style={styles.dragHandle} />

          {/* Header Row */}
          <View style={styles.header}>
            <View style={styles.sparkleTitle}>
              <Ionicons name="sparkles" size={18} color="#bc000a" />
              <Text style={styles.headerText}>AI TAKEAWAYS</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#1c1b1b" />
            </Pressable>
          </View>

          {/* Post Title Context */}
          <Text style={styles.postTitle} numberOfLines={2}>
            {postTitle}
          </Text>

          {/* Content Area */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#bc000a" />
                <Text style={styles.loadingText}>Groq Llama 3.3 is reading and summarizing...</Text>
              </View>
            ) : (
              <View style={styles.summaryContainer}>
                {summary ? (
                  <MarkdownRenderer content={summary} />
                ) : (
                  <Text style={styles.summaryText}>No summary available.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.footer}>
            <Pressable style={styles.actionBtn} onPress={onClose}>
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
    maxHeight: '75%',
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

