import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTier, Tier, TIER_META } from '../TierContext';
import { useTokens } from '../tokens';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, useSchemeTick } from '../studentTheme';

const TIER_ORDER: Tier[] = ['sprout', 'explorer', 'voyager', 'scholar', 'campus'];

/**
 * Floating button (bottom-right, above tab bar) that opens a modal letting
 * the user switch age tier. Maps to the .agemode widget in the HTML.
 */
export const AgeSwitcher: React.FC = () => {
  const { tier, setTier } = useTier();
  const tokens = useTokens(tier);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
      >
        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <Text style={styles.fabIcon}>👁</Text>
          <Text style={styles.fabLabel}>{TIER_META[tier].label}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>👁 Age mode</Text>
            <Text style={styles.sheetSub}>
              Switch between age groups to preview each home layout.
            </Text>
            <View style={styles.options}>
              {TIER_ORDER.map((t) => {
                const meta = TIER_META[t];
                const selected = t === tier;
                return (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.85}
                    onPress={() => {
                      setTier(t);
                      setOpen(false);
                    }}
                    style={styles.optWrap}
                  >
                    {selected ? (
                      <LinearGradient
                        colors={[tokens.accent1, tokens.accent2]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.opt, styles.optActive]}
                      >
                        <Text style={[styles.optLabel, { color: '#fff' }]}>{meta.label}</Text>
                        <Text style={[styles.optSub, { color: '#fff', opacity: 0.85 }]}>
                          {meta.sublabel}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.opt}>
                        <Text style={styles.optLabel}>{meta.label}</Text>
                        <Text style={styles.optSub}>{meta.sublabel}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const makeSheet = (S: StudentColors) => StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 14,
    bottom: 84, // sits above the tab bar
    zIndex: 50,
    borderRadius: 999,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  fabIcon: { fontSize: 14 },
  fabLabel: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,37,80,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: S.ink },
  sheetSub: { fontSize: 12.5, color: S.inkSoft, marginTop: 4, marginBottom: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optWrap: { flexBasis: '48%', flexGrow: 1 },
  opt: {
    backgroundColor: S.ring,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  optActive: { shadowColor: '#5038A0', shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  optLabel: { color: S.inkSoft, fontWeight: '800', fontSize: 13 },
  optSub: { color: S.inkSoft, fontSize: 10.5, fontWeight: '600', marginTop: 2 },
});

const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

