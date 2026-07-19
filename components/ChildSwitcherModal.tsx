import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { fonts } from '../constants/theme';
import { useSelectedChild } from '../context/SelectedChildContext';

interface ChildSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

// Stable per-child accent so each child keeps the same colour.
const ACCENTS: (keyof ColorPalette)[] = ['primary', 'info', 'success', 'warning', 'purple', 'danger'];

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';
}

export const ChildSwitcherModal: React.FC<ChildSwitcherModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild, selectChild, children } = useSelectedChild();

  const pick = (id: number) => { selectChild(id); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Your children</Text>
              <Text style={styles.subtitle}>Choose whose day you want to see.</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={19} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {children.map((child, i) => {
              const active = selectedChild?.studentId === child.studentId;
              const accent = colors[ACCENTS[i % ACCENTS.length]] as string;
              const soft = accent + '1A';
              const isInactive = (child as any).active === false;
              return (
                <TouchableOpacity
                  key={child.studentId}
                  activeOpacity={0.8}
                  onPress={() => pick(child.studentId)}
                  style={[styles.row, active && { borderColor: colors.primary, backgroundColor: colors.primarySofter }]}
                >
                  <View style={[styles.avatar, { backgroundColor: soft }]}>
                    {/* Real photo when the child has one; initials are the fallback. */}
                    {child.photoUrl ? (
                      <Image source={{ uri: child.photoUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={[styles.avatarText, { color: accent }]}>{initials(child.fullName || (child as any).name)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, isInactive && { color: colors.textTertiary }]} numberOfLines={1}>
                      {child.fullName || (child as any).name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[child.className, (child as any).streamName].filter(Boolean).join(' ')}
                      {child.schoolName ? `  •  ${child.schoolName}` : ''}
                    </Text>
                  </View>
                  {active ? (
                    <View style={styles.viewingPill}>
                      <Ionicons name="checkmark" size={13} color="#FFF" />
                      <Text style={styles.viewingText}>Viewing</Text>
                    </View>
                  ) : isInactive ? (
                    <Text style={styles.inactiveTag}>Inactive</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              );
            })}
            {children.length === 0 && (
              <Text style={styles.empty}>No children linked to this account yet.</Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      paddingTop: 10, paddingBottom: 8,
    },
    handle: { alignSelf: 'center', width: 40, height: 4.5, borderRadius: 999, backgroundColor: c.border, marginBottom: 6 },
    header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 16 },
    title: { fontSize: 19, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3 },
    closeBtn: {
      width: 34, height: 34, borderRadius: 17, backgroundColor: c.backgroundAlt,
      alignItems: 'center', justifyContent: 'center',
    },

    row: {
      flexDirection: 'row', alignItems: 'center', gap: 13,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 13,
    },
    avatar: {
      width: 46, height: 46, borderRadius: 23,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', // clip the photo to the circle
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { fontSize: 15, fontFamily: fonts.extrabold },
    name: { fontSize: 15, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    meta: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    viewingPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    viewingText: { color: '#FFF', fontSize: 11, fontFamily: fonts.bold },
    inactiveTag: { fontSize: 11, fontFamily: fonts.semibold, color: c.textTertiary },
    empty: { fontSize: 13, color: c.textSecondary, textAlign: 'center', paddingVertical: 24, fontFamily: fonts.regular },
  });
}
