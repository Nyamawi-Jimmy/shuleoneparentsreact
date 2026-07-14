// Lightweight, dependency-free calendar picker (works in Expo Go). Lets the
// parent pick ANY future date — a month grid with prev/next navigation; past
// dates before `minIso` are disabled.
import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (iso: string) => void;
  /** Currently selected ISO date (yyyy-MM-dd), highlighted. */
  selected?: string | null;
  /** Earliest selectable ISO date (inclusive). Defaults to today. */
  minIso?: string;
  accent?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const DatePickerModal: React.FC<Props> = ({ visible, onClose, onSelect, selected, minIso, accent }) => {
  const { colors } = useTheme();
  const tint = accent || colors.primary;

  const todayIso = useMemo(() => {
    const d = new Date();
    return toIso(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const floor = minIso || todayIso;

  const initial = selected || floor;
  const [cursor, setCursor] = useState(() => {
    const [y, m] = initial.split('-').map(Number);
    return { y, m: (m || 1) - 1 };
  });

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const shift = (delta: number) => {
    setCursor((c) => {
      const m = c.m + delta;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });
  };

  const styles = makeStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.month}>{MONTHS[cursor.m]} {cursor.y}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.dowRow}>
            {DOW.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}
          </View>

          <View style={styles.grid}>
            {grid.map((day, i) => {
              if (day == null) return <View key={i} style={styles.cell} />;
              const iso = toIso(cursor.y, cursor.m, day);
              const disabled = iso < floor;
              const isSel = iso === selected;
              const isToday = iso === todayIso;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  activeOpacity={0.7}
                  disabled={disabled}
                  onPress={() => { onSelect(iso); onClose(); }}
                >
                  <View style={[
                    styles.day,
                    isSel && { backgroundColor: tint },
                    !isSel && isToday && { borderWidth: 1.5, borderColor: tint },
                  ]}>
                    <Text style={[
                      styles.dayText,
                      disabled && styles.dayDisabled,
                      isSel && { color: '#fff', fontFamily: fonts.extrabold },
                      !isSel && isToday && { color: tint, fontFamily: fonts.bold },
                    ]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function makeStyles(c: any) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,17,26,0.55)', justifyContent: 'center', padding: 22 },
    sheet: {
      backgroundColor: c.card, borderRadius: 22, padding: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    navBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.backgroundAlt },
    month: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    dowRow: { flexDirection: 'row', marginTop: 6, marginBottom: 4 },
    dow: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: fonts.bold, color: c.textTertiary },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontSize: 14, fontFamily: fonts.medium, color: c.text },
    dayDisabled: { color: c.textTertiary, opacity: 0.35 },
    closeBtn: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
    closeText: { fontSize: 13.5, fontFamily: fonts.bold, color: c.textSecondary },
  });
}
