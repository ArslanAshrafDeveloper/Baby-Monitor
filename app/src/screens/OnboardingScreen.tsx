import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// eslint-disable-next-line import/no-unresolved
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Platform } from 'react-native';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useSettingsStore } from '@/store/settings';
import { ensureSignedIn } from '@/services/auth';

export function OnboardingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const [busy, setBusy] = React.useState(false);

  const start = async () => {
    setBusy(true);
    try {
      // Request mic permission upfront — the app is useless without it.
      const perm = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;
      try { await request(perm); } catch { /* user can grant later */ }

      // Try to sign in, but don't block onboarding if the server isn't
      // reachable yet — pairing will retry. This keeps first-launch usable
      // even when the user hasn't pointed the app at a running server.
      ensureSignedIn().catch(() => { /* deferred to pairing */ });

      setOnboarded();
      nav.replace('RolePicker');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Baby Monitor</Text>
      <Text style={styles.subtitle}>
        Two devices. One listens by the crib, the other comes with you.
      </Text>

      <View style={styles.card}>
        <Text style={styles.h3}>How it works</Text>
        <Text style={styles.body}>
          1. Place one phone near your baby — it becomes the Child Device and listens for cries.{'\n'}
          2. Carry the other — when a cry is detected the Parent Device wakes you up and lets you hear the room.{'\n'}
          3. Hold the Talk button to speak back through the Child Device speaker.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>Privacy</Text>
        <Text style={styles.body}>
          Audio is end-to-end encrypted and never stored on our servers. The mic only streams after a cry is detected on-device.
        </Text>
      </View>

      <Btn label="Get started" onPress={start} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: 36, fontWeight: '700', marginTop: spacing.xl },
  subtitle: { color: colors.textDim, fontSize: 16, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  h3: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
});
