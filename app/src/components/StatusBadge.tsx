import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Tone = 'idle' | 'good' | 'warn' | 'alert';

interface Props { tone: Tone; label: string }

export function StatusBadge({ tone, label }: Props) {
  const dotColor =
    tone === 'good' ? colors.success
    : tone === 'warn' ? colors.warning
    : tone === 'alert' ? colors.danger
    : colors.textDim;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
