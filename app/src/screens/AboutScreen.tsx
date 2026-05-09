import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>How it works</Text>
      <View style={styles.card}>
        <Text style={styles.body}>
          The Child Device listens with the microphone and runs an on-device cry-detection model. When a cry is detected, it asks our backend to wake the Parent Device with a high-priority push.
        </Text>
        <Text style={styles.body}>
          The Parent Device opens a peer-to-peer audio connection (WebRTC, encrypted with DTLS-SRTP) directly to the Child Device. Audio doesn’t pass through our servers — only the wake signal does.
        </Text>
        <Text style={styles.body}>
          Press and hold the Talk button on the Parent Device to speak through the Child Device speaker.
        </Text>
      </View>

      <Text style={styles.title}>Privacy</Text>
      <View style={styles.card}>
        <Text style={styles.body}>
          We do not record audio. No recording, no transcript, no cloud storage. The microphone activates only locally on the Child Device for the cry-detection model, and the live stream only opens after a cry is detected (or you tap Test call on the parent).
        </Text>
        <Text style={styles.body}>
          Pairing codes expire in five minutes and are single-use. Sign out from Settings to delete all local data on this device.
        </Text>
      </View>

      <Text style={styles.title}>Version</Text>
      <View style={styles.card}>
        <Text style={styles.body}>0.1.0 (scaffold)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  body: { color: colors.textDim, fontSize: 14, lineHeight: 21 },
});
