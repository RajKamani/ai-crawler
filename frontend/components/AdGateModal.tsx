import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface AdGateModalProps {
  isVisible: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  isAdLoaded: boolean;
}

export const AdGateModal: React.FC<AdGateModalProps> = ({
  isVisible,
  onClose,
  onWatchAd,
  isAdLoaded,
}) => {
  const colors = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.primary }]}>LIMIT REACHED</Text>
            <Pressable onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Description */}
          <View style={styles.content}>
            <Text style={[styles.mainText, { color: colors.text }]}>
              You have exhausted your daily limit of 5 free AI summary generations.
            </Text>
            <Text style={[styles.subText, { color: colors.tabIconDefault }]}>
              Watch a short video ad to earn +1 summary generation credit.
            </Text>
          </View>

          {/* Footer Action Buttons */}
          <View style={styles.footer}>
            <Pressable
              disabled={!isAdLoaded}
              onPress={onWatchAd}
              style={({ pressed }) => [
                styles.adBtn,
                {
                  backgroundColor: isAdLoaded ? colors.primary : colors.surfaceContainer,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="play-circle-outline" size={22} color={isAdLoaded ? '#FFFFFF' : colors.tabIconDefault} />
              <Text style={[styles.adBtnText, { color: isAdLoaded ? '#FFFFFF' : colors.tabIconDefault }]}>
                {isAdLoaded ? 'WATCH VIDEO AD (+1)' : 'LOADING AD...'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: colors.surfaceContainer,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>NOT NOW</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    padding: 20,
    alignItems: 'stretch',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  closeIcon: {
    padding: 2,
  },
  content: {
    marginBottom: 24,
    gap: 12,
  },
  mainText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
    lineHeight: 20,
  },
  subText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    gap: 10,
  },
  adBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
  },
  adBtnText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
  },
  cancelBtn: {
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 14,
  },
});
