// Account menu for the parent shell — opened from the header avatar, so
// signing out is two taps from anywhere instead of Settings → scroll to the
// bottom. Mirrors the student TopBar's menu, and reuses the same confirm.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export const AccountMenu: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const go = (path: string) => { onClose(); router.push(path as any); };

  const confirmSignOut = () => {
    onClose();
    Alert.alert(
      'Sign out?',
      "You'll need to log in again to come back.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login' as any);
          },
        },
      ],
    );
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.menu, { top: insets.top + 56 }]}>
          <MenuItem styles={styles} colors={colors} icon="person-outline" label="My profile" onPress={() => go('/settings')} />
          <MenuItem styles={styles} colors={colors} icon="settings-outline" label="Settings" onPress={() => go('/settings')} />
          <MenuItem styles={styles} colors={colors} icon="help-buoy-outline" label="Help & support" onPress={() => go('/help')} />
          <View style={styles.divider} />
          <MenuItem styles={styles} colors={colors} icon="log-out-outline" label="Sign out" danger onPress={confirmSignOut} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const MenuItem: React.FC<{
  styles: any; colors: ColorPalette; icon: any; label: string; danger?: boolean; onPress: () => void;
}> = ({ styles, colors, icon, label, danger, onPress }) => (
  <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={onPress}>
    <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.textSecondary} />
    <Text style={[styles.itemText, danger && { color: colors.danger }]}>{label}</Text>
  </TouchableOpacity>
);

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.35)' },
  menu: {
    position: 'absolute', right: 14, minWidth: 208,
    backgroundColor: c.card, borderRadius: 16, paddingVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 9,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 15, paddingVertical: 12 },
  itemText: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
  divider: { height: 1, backgroundColor: c.border, marginHorizontal: 12, marginVertical: 4 },
});
