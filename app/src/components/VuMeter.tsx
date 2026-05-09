import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';

const NUM_BARS = 24;

interface Props {
  /** 0..1 */
  level: number;
  /** Highlight bars red when smoothed cry probability is high. 0..1 */
  cry?: number;
}

export function VuMeter({ level, cry = 0 }: Props) {
  const active = Math.round(level * NUM_BARS);
  return (
    <View style={styles.row}>
      {Array.from({ length: NUM_BARS }).map((_, i) => {
        const on = i < active;
        const isCry = cry > 0.5 && i < Math.round(cry * NUM_BARS);
        return (
          <View
            key={i}
            style={[
              styles.bar,
              { height: 6 + i * 1.6 },
              on && { backgroundColor: isCry ? colors.cry : colors.accent },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    gap: 4,
  },
  bar: {
    width: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
});
