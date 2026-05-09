import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSettingsStore } from '@/store/settings';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { RolePickerScreen } from '@/screens/RolePickerScreen';
import { PairingScreen } from '@/screens/PairingScreen';
import { ChildListeningScreen } from '@/screens/ChildListeningScreen';
import { ParentStandbyScreen } from '@/screens/ParentStandbyScreen';
import { ParentLiveAlertScreen } from '@/screens/ParentLiveAlertScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { AboutScreen } from '@/screens/AboutScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  RolePicker: undefined;
  Pairing: undefined;
  ChildListening: undefined;
  ParentStandby: undefined;
  ParentLiveAlert: undefined;
  Settings: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const role = useSettingsStore((s) => s.role);
  const hasPair = useSettingsStore((s) => !!s.pair);
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);

  const initialRoute: keyof RootStackParamList = !hasOnboarded
    ? 'Onboarding'
    : role === 'unset'
    ? 'RolePicker'
    : !hasPair
    ? 'Pairing'
    : role === 'child'
    ? 'ChildListening'
    : 'ParentStandby';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerStyle: { backgroundColor: '#0B1020' },
        headerTintColor: '#E7ECF7',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0B1020' },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RolePicker" component={RolePickerScreen} options={{ title: 'Choose role' }} />
      <Stack.Screen name="Pairing" component={PairingScreen} options={{ title: 'Pair devices' }} />
      <Stack.Screen name="ChildListening" component={ChildListeningScreen} options={{ title: 'Child device' }} />
      <Stack.Screen name="ParentStandby" component={ParentStandbyScreen} options={{ title: 'Parent device' }} />
      <Stack.Screen
        name="ParentLiveAlert"
        component={ParentLiveAlertScreen}
        options={{ title: 'Listening', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </Stack.Navigator>
  );
}
