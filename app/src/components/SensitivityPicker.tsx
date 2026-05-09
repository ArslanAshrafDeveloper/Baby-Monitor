// Three-way sensitivity picker (Low / Medium / High). Avoids native slider deps.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Sensitivity } from '@/types';

interface Props {
  value: Sensitivity;
  onChange: (s: Sensitivity) => void;
}

const OPTIONS: { v: Sensitivity; label: string }[] = [
  { v: 'low', label: 'Low' },
  { v: 'medium', label: 'Medium' },
  { v: 'high', label: 'High' },
];

export function SensitivityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = opt.v === value;
        return (
          <Pressable
            key={opt.v}
            onPress={() => onChange(opt.v)}
            style={[styles.opt, active && styles.optActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  opt: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  optActive: { backgroundColor: colors.accentSoft },
  label: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  labelActive: { color: colors.text },
});
