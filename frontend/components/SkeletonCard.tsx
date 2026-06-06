import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonCardProps {
  containerHeight: number;
}

const ShimmerBlock: React.FC<{
  width: number | string;
  height: number;
  style?: any;
}> = ({ width, height, style }) => {
  const colors = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: colors.surfaceContainer,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ containerHeight }) => {
  const colors = useTheme();
  const headerHeight = Math.floor(containerHeight * 0.28);
  const footerHeight = 36;
  const contentHeight = containerHeight - headerHeight - footerHeight;

  return (
    <View style={[styles.card, { height: containerHeight, backgroundColor: colors.background }]}>
      {/* Header shimmer */}
      <ShimmerBlock width="100%" height={headerHeight} />

      {/* Content area */}
      <View
        style={[
          styles.bodyContainer,
          {
            height: contentHeight,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Title lines */}
        <ShimmerBlock width="90%" height={18} style={styles.titleLine} />
        <ShimmerBlock width="65%" height={18} style={styles.titleLine} />

        {/* Divider */}
        <ShimmerBlock width="100%" height={1} style={{ marginBottom: 14, marginTop: 6 }} />

        {/* Body lines */}
        <ShimmerBlock width="100%" height={12} style={styles.bodyLine} />
        <ShimmerBlock width="95%" height={12} style={styles.bodyLine} />
        <ShimmerBlock width="88%" height={12} style={styles.bodyLine} />
        <ShimmerBlock width="100%" height={12} style={styles.bodyLine} />
        <ShimmerBlock width="72%" height={12} style={styles.bodyLine} />

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Action button placeholder */}
        <ShimmerBlock width="100%" height={44} />
      </View>

      {/* Footer shimmer */}
      <View
        style={[
          styles.footer,
          {
            height: footerHeight,
            backgroundColor: colors.surfaceContainer,
            borderTopColor: colors.border,
          },
        ]}
      >
        <ShimmerBlock width="55%" height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
  },
  bodyContainer: {
    padding: 20,
    borderWidth: 1,
    flexDirection: 'column',
  },
  titleLine: {
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginBottom: 14,
    marginTop: 6,
  },
  bodyLine: {
    marginBottom: 10,
  },
  footer: {
    borderTopWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
