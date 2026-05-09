// Parent Device standby screen. Sits idle until either:
//   - a wake-on-cry push arrives, or
//   - the user taps "Test call" to manually open the channel.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { StatusBadge } from '@/components/StatusBadge';
import { onWake } from '@/services/push';
import { signaling } from '@/services/signaling';
import { useSettingsStore } from '@/store/settings';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function ParentStandbyScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pair = useSettingsStore((s) => s.pair);
  const [peerOnline, setPeerOnline] = React.useState(false);
  const [lastCry, setLastCry] = React.useState<number | null>(null);

  React.useEffect(() => {
    signaling.connect();
    const off = signaling.on((env) => {
      if (env.type === 'ping') setPeerOnline(env.payload.peerOnline);
    });
    onWake(() => {
      setLastCry(Date.now());
      nav.navigate('ParentLiveAlert');
    });
    return () => { off(); signaling.close(); };
  }, [nav]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge
        tone={peerOnline ? 'good' : 'warn'}
        label={peerOnline ? 'Child Device online' : 'Child Device offline'}
      />

      <View style={styles.card}>
        <Text style={styles.h3}>Status</Text>
        <Text style={styles.body}>
          {pair
            ? `Paired since ${new Date(pair.createdAt).toLocaleString()}.`
            : 'Not paired.'}
        </Text>
        <Text style={styles.body}>
          {lastCry
            ? `Last cry detected: ${new Date(lastCry).toLocaleTimeString()}`
            : 'No cries detected yet.'}
        </Text>
      </View>

      <Btn label="Test call" onPress={() => nav.navigate('ParentLiveAlert')} />
      <Btn label="Settings" variant="secondary" onPress={() => nav.navigate('Settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  h3: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
});
