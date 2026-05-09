// Pairing screen.
//   - Parent role: requests a 6-digit code from the backend and shows it big.
//   - Child role: enters the 6-digit code (or scans a QR; QR is omitted from
//     the scaffold to keep this file small — drop in react-native-camera-kit's
//     CameraScreen with `scanBarcode` enabled to add it).

import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { useSettingsStore } from '@/store/settings';
import { ensureSignedIn } from '@/services/auth';
import { generatePairingCode, claimPairingCode } from '@/services/pairing';

export function PairingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const role = useSettingsStore((s) => s.role);

  React.useEffect(() => { void ensureSignedIn(); }, []);

  if (role === 'parent') return <ParentPair onPaired={() => nav.replace('ParentStandby')} />;
  if (role === 'child') return <ChildPair onPaired={() => nav.replace('ChildListening')} />;
  return (
    <View style={styles.container}>
      <Text style={styles.body}>Pick a role first.</Text>
      <Btn label="Choose role" onPress={() => nav.replace('RolePicker')} />
    </View>
  );
}

function ParentPair({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  const refreshCode = React.useCallback(async () => {
    setBusy(true);
    try {
      const r = await generatePairingCode();
      setCode(r.code);
    } catch {
      Alert.alert('Could not get a pairing code', 'Check the signaling server is running.');
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => { void refreshCode(); }, [refreshCode]);
  // Re-render to show the "expired" state after 5 minutes.
  React.useEffect(() => {
    const t = setInterval(force, 30_000);
    return () => clearInterval(t);
  }, []);

  // Poll the backend every 3 s to find out if the Child has claimed our code.
  React.useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        // /auth/me returns the current pair if any.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { refreshSelf } = require('@/services/pairing');
        await refreshSelf();
        if (useSettingsStore.getState().pair) {
          if (!stopped) onPaired();
        }
      } catch { /* ignore polling errors */ }
    };
    const interval = setInterval(tick, 3000);
    return () => { stopped = true; clearInterval(interval); };
  }, [onPaired]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pair with your Child Device</Text>
      <Text style={styles.body}>
        On the Child Device, choose “Child Device” and enter the code below.
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{code ?? '— — — — — —'}</Text>
        <Text style={styles.codeHint}>Expires in 5 minutes</Text>
      </View>
      <Btn label="Generate new code" variant="secondary" onPress={refreshCode} loading={busy} />
    </ScrollView>
  );
}

function ChildPair({ onPaired }: { onPaired: () => void }) {
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Code must be 6 digits.');
      return;
    }
    setBusy(true);
    try {
      await claimPairingCode(code);
      onPaired();
    } catch {
      Alert.alert('Pairing failed', 'The code may be expired or invalid.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Enter the pairing code</Text>
      <Text style={styles.body}>
        On the Parent Device, choose “Parent Device” and read the 6-digit code shown there.
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="123456"
        placeholderTextColor={colors.textDim}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <Btn label="Pair" onPress={submit} loading={busy} disabled={code.length !== 6} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: spacing.lg },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  codeText: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: 8 },
  codeHint: { color: colors.textDim, fontSize: 13 },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 30,
    letterSpacing: 8,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    borderRadius: radius.md,
  },
});
