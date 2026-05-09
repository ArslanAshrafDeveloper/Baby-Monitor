// Child Device main screen.
// Starts the cry-detection pipeline + WebRTC peer-conn (in callee mode).

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { StatusBadge } from '@/components/StatusBadge';
import { VuMeter } from '@/components/VuMeter';
import { SensitivityPicker } from '@/components/SensitivityPicker';
import { useSettingsStore } from '@/store/settings';
import { useSessionStore } from '@/store/session';
import { CryDetector } from '@/services/audio/cryDetector';
import { WebRTCSession } from '@/services/webrtc';
import { signaling } from '@/services/signaling';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function ChildListeningScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sensitivity = useSettingsStore((s) => s.sensitivity);
  const setSensitivity = useSettingsStore((s) => s.setSensitivity);
  const level = useSessionStore((s) => s.level);
  const connection = useSessionStore((s) => s.connection);
  const setConnection = useSessionStore((s) => s.setConnection);
  const setLevel = useSessionStore((s) => s.setLevel);

  const detectorRef = React.useRef<CryDetector | null>(null);
  const rtcRef = React.useRef<WebRTCSession | null>(null);
  const [smoothed, setSmoothed] = React.useState(0);

  React.useEffect(() => {
    signaling.connect();

    const det = new CryDetector();
    detectorRef.current = det;
    det.on({
      onLevel: (rms) => setLevel(rms),
      onScore: (_p, smooth) => setSmoothed(smooth),
      onCryDetected: async () => {
        // Wake-on-cry already pinged the backend from inside the detector.
        // Now spin up the WebRTC session and wait for the parent's offer.
        if (rtcRef.current) return;
        const rtc = new WebRTCSession();
        rtcRef.current = rtc;
        setConnection('connecting');
        await rtc.start({
          role: 'child',
          initiator: false,
          onRemoteStream: () => setConnection('connected'),
          onClosed: () => {
            setConnection('ended');
            rtcRef.current = null;
            // Give a moment, then return to idle.
            setTimeout(() => setConnection('idle'), 1500);
          },
        });
      },
    });
    void det.start();

    return () => {
      det.stop();
      detectorRef.current = null;
      rtcRef.current?.end();
      rtcRef.current = null;
      signaling.close();
    };
  }, [setConnection, setLevel]);

  const tone = connection === 'connected' ? 'alert' : connection === 'connecting' ? 'warn' : 'good';
  const label =
    connection === 'connected' ? 'Streaming to parent…'
    : connection === 'connecting' ? 'Cry detected — connecting…'
    : 'Listening';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBadge tone={tone} label={label} />
      <View style={styles.center}>
        <VuMeter level={level} cry={smoothed} />
        <Text style={styles.scoreLabel}>
          Cry probability: {(smoothed * 100).toFixed(0)}%
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h3}>Sensitivity</Text>
        <SensitivityPicker value={sensitivity} onChange={setSensitivity} />
        <Text style={styles.bodyDim}>
          Higher sensitivity triggers earlier but may pick up more false positives.
        </Text>
      </View>

      <Btn label="Settings" variant="secondary" onPress={() => nav.navigate('Settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  scoreLabel: { color: colors.textDim, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    gap: spacing.md,
  },
  h3: { color: colors.text, fontSize: 18, fontWeight: '600' },
  bodyDim: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
