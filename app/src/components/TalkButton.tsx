import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
// eslint-disable-next-line import/no-unresolved
import HapticFeedback from 'react-native-haptic-feedback';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface Props {
  /** Press to start talking, release to stop. */
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

export function TalkButton({ onPressIn, onPressOut, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    if (disabled) return;
    try { HapticFeedback.trigger('impactMedium'); } catch { /* ignore */ }
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 24, bounciness: 6 }).start();
    onPressIn();
  };
  const release = () => {
    if (disabled) return;
    try { HapticFeedback.trigger('impactLight'); } catch { /* ignore */ }
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }).start();
    onPressOut();
  };

  return (
    <Pressable onPressIn={press} onPressOut={release} disabled={disabled}>
      <Animated.View
        style={[
          styles.outer,
          disabled && { opacity: 0.4 },
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.inner}>
          <Text style={styles.label}>Hold to Talk</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  inner: {
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: { color: '#0B1020', fontSize: 22, fontWeight: '700' },
});
