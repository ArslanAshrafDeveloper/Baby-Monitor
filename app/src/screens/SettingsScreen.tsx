import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { SensitivityPicker } from '@/components/SensitivityPicker';
import { useSettingsStore } from '@/store/settings';
import { unpair } from '@/services/pairing';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const role = useSettingsStore((s) => s.role);
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  const setSensitivity = useSettingsStore((s) => s.setSensitivity);
  const autoAnswer = useSettingsStore((s) => s.autoAnswer);
  const setAutoAnswer = useSettingsStore((s) => s.setAutoAnswer);
  const dnd = useSettingsStore((s) => s.doNotDisturb);
  const setDnd = useSettingsStore((s) => s.setDoNotDisturb);
  const signOut = useSettingsStore((s) => s.signOut);

  const handleUnpair = () => {
    Alert.alert('Unpair?', 'You will need a new code to re-pair.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unpair', style: 'destructive', onPress: async () => {
          try { await unpair(); nav.replace('Pairing'); }
          catch { Alert.alert('Could not unpair'); }
        } },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'This clears all local data on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut();
          nav.replace('Onboarding');
        } },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {role === 'child' && (
        <View style={styles.card}>
          <Text style={styles.h3}>Cry-detection sensitivity</Text>
          <SensitivityPicker value={sensitivity} onChange={setSensitivity} />
        </View>
      )}

      {role === 'parent' && (
        <>
          <Row
            label="Auto-answer alerts"
            sub="Connect immediately when a cry is detected, instead of asking you to tap."
            value={autoAnswer}
            onValueChange={setAutoAnswer}
          />
          <Row
            label="Do not disturb"
            sub="Silences alerts. The Child Device keeps listening."
            value={dnd}
            onValueChange={setDnd}
          />
        </>
      )}

      <View style={styles.card}>
        <Text style={styles.h3}>Pairing</Text>
        <Btn label="Unpair this device" variant="secondary" onPress={handleUnpair} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>About</Text>
        <Btn label="How it works & privacy" variant="secondary" onPress={() => nav.navigate('About')} />
      </View>

      <Btn label="Sign out" variant="danger" onPress={handleSignOut} />
    </ScrollView>
  );
}

interface RowProps {
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (b: boolean) => void;
}
function Row({ label, sub, value, onValueChange }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  h3: { color: colors.text, fontSize: 18, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textDim, fontSize: 13, marginTop: 4 },
});
