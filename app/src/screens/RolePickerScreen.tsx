import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useSettingsStore } from '@/store/settings';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function RolePickerScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setRole = useSettingsStore((s) => s.setRole);

  const pick = (role: 'child' | 'parent') => {
    setRole(role);
    nav.replace('Pairing');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Which device is this?</Text>
      <Text style={styles.subtitle}>
        You can change this later in Settings.
      </Text>

      <Pressable style={styles.card} onPress={() => pick('child')}>
        <Text style={styles.h3}>Child Device</Text>
        <Text style={styles.body}>
          Place this phone near the crib. It listens for cries and wakes the Parent Device when needed.
        </Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => pick('parent')}>
        <Text style={styles.h3}>Parent Device</Text>
        <Text style={styles.body}>
          Carry this phone. It rings when the Child Device detects a cry, plays the room audio, and lets you talk back.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: spacing.lg },
  subtitle: { color: colors.textDim, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  h3: { color: colors.text, fontSize: 20, fontWeight: '600' },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
});
