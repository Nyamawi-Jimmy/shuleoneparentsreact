import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../constants/theme';
import { useSelectedChild } from '../context/SelectedChildContext';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1612531048118-826c64158142?w=200&h=200&fit=crop&crop=face';

interface ChildSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet modal that lists every linked child. The selected child has
 * a pink-gradient checkmark and ring. Tap any row to switch + close.
 *
 * Design language follows ParentHeader: soft pink top edge, rounded top corners,
 * subtle drop shadow.
 */
export const ChildSwitcherModal: React.FC<ChildSwitcherModalProps> = ({
  visible,
  onClose,
}) => {
  const { selectedChildId, selectChild, children } = useSelectedChild();

  const handlePick = (id: string) => {
    selectChild(id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Top edge: handle bar + soft pink tint */}
          <LinearGradient
            colors={['#FFE4ED', '#FFFFFF']}
            style={styles.sheetTop}
          >
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>Switch child</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Pick which child you want to view stats for.
            </Text>
          </LinearGradient>

          {/* Children list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {children.map((child) => {
              const isSelected = child.id === selectedChildId;
              const photo = child.photoUrl || PLACEHOLDER;
              return (
                <TouchableOpacity
                  key={child.id}
                  activeOpacity={0.85}
                  onPress={() => handlePick(child.id)}
                  style={[styles.row, isSelected && styles.rowSelected]}
                >
                  <View style={[styles.avatarRing, isSelected && styles.avatarRingSelected]}>
                    <Image source={{ uri: photo }} style={styles.avatarImg} />
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.childName}>{child.fullName}</Text>
                    <Text style={styles.childMeta}>
                      {child.grade} • {child.className}
                    </Text>
                    <Text style={styles.childSchool}>{child.schoolName}</Text>
                  </View>

                  {isSelected ? (
                    <LinearGradient
                      colors={['#FB7185', '#E11D48']}
                      style={styles.checkPill}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </LinearGradient>
                  ) : (
                    <View style={styles.checkPillEmpty} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Add child placeholder */}
            <TouchableOpacity activeOpacity={0.85} style={styles.addRow}>
              <View style={styles.addIcon}>
                <Feather name="plus" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.addLabel}>Add another child</Text>
                <Text style={styles.addSub}>Link an additional learner to your account</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 11, 24, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  sheetTop: {
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5D6DC',
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9b1239',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },

  list: {
    paddingTop: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#F1F1F4',
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  rowSelected: {
    borderColor: '#FB7185',
    backgroundColor: '#FFF5F8',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#F1F1F4',
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  avatarRingSelected: {
    borderColor: '#FB7185',
    borderWidth: 3,
  },
  avatarImg: { width: '100%', height: '100%' },
  childName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  childMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  childSchool: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
  checkPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  checkPillEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },

  // Add child row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFE4ED',
    borderStyle: 'dashed',
    backgroundColor: '#FFF8FB',
    marginTop: 4,
  },
  addIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFE4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  addSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
});
