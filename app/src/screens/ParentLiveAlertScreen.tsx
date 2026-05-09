// The full-screen "incoming alert" view that handles a live audio session.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { Btn } from '@/components/Btn';
import { StatusBadge } from '@/components/StatusBadge';
import { TalkButton } from '@/components/TalkButton';
import { WebRTCSession } from '@/services/webrtc';
import { signaling } from '@/services/signaling';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function ParentLiveAlertScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const connection = useSessionStore((s) => s.connection);
  const setConnection = useSessionStore((s) => s.setConnection);
  const setRemoteStream = useSessionStore((s) => s.setRemoteStream);
  const setMicEnabled = useSessionStore((s) => s.setMicEnabled);

  const rtcRef = React.useRef<WebRTCSession | null>(null);

  React.useEffect(() => {
    signaling.connect();
    const rtc = new WebRTCSession();
    rtcRef.current = rtc;
    setConnection('connecting');
    rtc.start({
      role: 'parent',
      initiator: true,
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setConnection('connected');
      },
      onClosed: () => {
        setConnection('ended');
        setTimeout(() => {
          rtcRef.current = null;
          nav.goBack();
        }, 800);
      },
    });

    return () => {
      rtcRef.current?.end();
      rtcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTalk = () => { rtcRef.current?.setMicEnabled(true); setMicEnabled(true); };
  const stopTalk = () => { rtcRef.current?.setMicEnabled(false); setMicEnabled(false); };
  const end = () => { rtcRef.current?.end(); };

  const tone = connection === 'connected' ? 'good' : 'warn';
  const label =
    connection === 'connected' ? 'Live • listening to your baby'
    : connection === 'connecting' ? 'Connecting…'
    : connection === 'ended' ? 'Ended'
    : 'Idle';

  return (
    <View style={styles.container}>
      <StatusBadge tone={tone} label={label} />
      <View style={styles.center}>
        <Text style={styles.title}>Listening</Text>
        <Text style={styles.subtitle}>
          Hold the button below to speak to your baby.
        </Text>
        <TalkButton
          onPressIn={startTalk}
          onPressOut={stopTalk}
          disabled={connection !== 'connected'}
        />
      </View>
      <Btn label="End session" variant="danger" onPress={end} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: spacing.lg },
  subtitle: { color: colors.textDim, fontSize: 15 },
});
