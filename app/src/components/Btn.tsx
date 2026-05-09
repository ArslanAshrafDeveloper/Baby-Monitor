// Primary/secondary buttons used across screens.

import React from 'react';
import { Pressable, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export function Btn({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const styleBase =
    variant === 'primary' ? styles.primary
    : variant === 'danger' ? styles.danger
    : styles.secondary;

  const labelStyle =
    variant === 'primary' ? styles.labelPrimary
    : variant === 'danger' ? styles.labelPrimary
    : styles.labelSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styleBase,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'secondary' ? colors.accent : '#0B1020'} />
        : <Text style={labelStyle}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  danger: { backgroundColor: colors.danger },
  labelPrimary: { color: '#0B1020', fontSize: 16, fontWeight: '700' },
  labelSecondary: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
