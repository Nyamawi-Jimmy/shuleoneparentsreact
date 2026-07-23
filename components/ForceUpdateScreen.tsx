// ForceUpdateScreen — the hard gate shown when the installed version is below
// the server's minimum. It fills the screen, has no dismiss and no back
// affordance, and the ONLY action is to open the Play Store. The user cannot
// reach the rest of the app until they update.
//
// Android's hardware back is trapped so it can't escape the gate.

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, BackHandler, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { fonts } from '../constants/theme';

export const ForceUpdateScreen: React.FC<{ storeUrl: string }> = ({ storeUrl }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // Trap hardware back so the gate can't be dismissed.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const openStore = async () => {
    // Prefer the Play app via the market: scheme; fall back to the web listing.
    const market = storeUrl.includes('play.google.com')
      ? storeUrl.replace('https://play.google.com/store/apps/details?id=', 'market://details?id=')
      : storeUrl;
    try {
      const ok = Platform.OS === 'android' && (await Linking.canOpenURL(market));
      await Linking.openURL(ok ? market : storeUrl);
    } catch {
      Linking.openURL(storeUrl).catch(() => {});
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.body}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.icon}
        >
          <MaterialCommunityIcons name="rocket-launch-outline" size={40} color="#FFF" />
        </LinearGradient>

        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body1}>
          A newer version of ShuleOne is available. Please update to continue —
          this version is no longer supported.
        </Text>

        <View style={styles.points}>
          <Point styles={styles} colors={colors} text="Latest features and fixes" />
          <Point styles={styles} colors={colors} text="Keeps your data secure" />
          <Point styles={styles} colors={colors} text="Takes less than a minute" />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity activeOpacity={0.85} onPress={openStore}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDeep]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.btn}
          >
            <Ionicons name="logo-google-playstore" size={18} color="#FFF" />
            <Text style={styles.btnText}>Update on Google Play</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Point: React.FC<{ styles: any; colors: ColorPalette; text: string }> = ({ styles, colors, text }) => (
  <View style={styles.point}>
    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
    <Text style={styles.pointText}>{text}</Text>
  </View>
);

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  icon: {
    width: 84, height: 84, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
  title: { fontSize: 24, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.5, textAlign: 'center' },
  body1: { fontSize: 14, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 12, maxWidth: 320 },
  points: { marginTop: 26, gap: 12, alignSelf: 'stretch', paddingHorizontal: 10 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointText: { fontSize: 13.5, fontFamily: fonts.medium, color: c.textSecondary },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderRadius: 16, paddingVertical: 16,
  },
  btnText: { color: '#FFF', fontSize: 15, fontFamily: fonts.bold },
});
