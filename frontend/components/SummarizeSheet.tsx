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
              <Ionicons name="sparkles" size={18} color="#9F62FF" />
              <Text style={styles.headerText}>AI Takeaways</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#8E8E93" />
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
                <ActivityIndicator size="large" color="#9F62FF" />
                <Text style={styles.loadingText}>Groq Llama 3.3 is reading and summarizing...</Text>
              </View>
            ) : (
              <View style={styles.summaryContainer}>
                {summary ? (
                  // Display bullet points formatted nicely
                  summary.split('\n').map((line, idx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return null;
                    
                    // Render bullet lines with distinct indicators
                    const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('*') || cleanLine.startsWith('•');
                    const text = isBullet ? cleanLine.substring(1).trim() : cleanLine;

                    return (
                      <View key={idx} style={styles.bulletRow}>
                        {isBullet && (
                          <View style={styles.bulletPoint}>
                            <Ionicons name="star" size={8} color="#9F62FF" />
                          </View>
                        )}
                        <Text style={[styles.summaryText, !isBullet && styles.nonBulletText]}>
                          {text}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.summaryText}>No summary available.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.footer}>
            <Pressable style={styles.actionBtn} onPress={onClose}>
              <Text style={styles.actionBtnText}>Got it, thanks!</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#16161A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A32',
    borderBottomWidth: 0,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A42',
    borderRadius: 2,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#2A2A32',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
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
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
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
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  nonBulletText: {
    fontWeight: '600',
    color: '#E5E5EA',
  },
  footer: {
    paddingHorizontal: 20,
  },
  actionBtn: {
    backgroundColor: '#9F62FF',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
