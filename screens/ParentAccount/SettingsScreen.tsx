import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { useAuth } from '../../context/AuthContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';

export const SettingsScreen: React.FC = () => {
  const { colors, mode, scheme, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { signOut, user } = useAuth();
  const { parent, refresh: refreshProfile, updateProfile, changePassword } = useParentProfile();
  const { children } = useSelectedChild();

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/chooser' as any);
        }},
      ],
    );
  };

  const appearanceLabel = mode === 'system'
    ? `System (${scheme === 'dark' ? 'Dark' : 'Light'})`
    : mode === 'dark' ? 'Dark' : 'Light';

  return (
    <View style={styles.safe}>
      <GradientAppBar title="Settings" subtitle="Profile, preferences & account" showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            {parent.photoUrl ? (
              <Image source={{ uri: parent.photoUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.profileInitials}>{parent.initials || '?'}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {parent.name || `${parent.firstName} ${parent.lastName}`.trim() || 'Parent'}
            </Text>
            <Text style={styles.profileSub}>{parent.email || parent.phone || '—'}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setEditOpen(true)} style={styles.editBtn}>
            <Feather name="edit-2" size={14} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuGroup}>
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="person-circle-outline" size={20} color={colors.primary} />}
            iconBg={colors.primarySoft}
            label="Edit Profile" sub="Name, photo, email, phone"
            onPress={() => setEditOpen(true)}
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="lock-closed" size={18} color={colors.purple} />}
            iconBg={colors.purpleLight}
            label="Change Password" sub="Update your account password"
            onPress={() => setPasswordOpen(true)}
            divider
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="people" size={18} color={colors.info} />}
            iconBg={colors.infoSoft}
            label="Linked Children"
            sub={`${children.length} child${children.length === 1 ? '' : 'ren'} on this account`}
            onPress={() => router.push('/choose-child' as any)}
            divider
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="folder-open" size={18} color={colors.success} />}
            iconBg={colors.successSoft}
            label="Documents" sub="Statements, receipts & report cards"
            onPress={() => router.push('/documents' as any)}
            divider
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="diamond" size={18} color={colors.purple} />}
            iconBg={colors.purpleLight}
            label="Plans & subscriptions" sub="AI Learning, Coding, live bus tracking"
            onPress={() => router.push('/subscriptions' as any)}
            divider
          />
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.menuGroup}>
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="notifications" size={18} color={colors.warning} />}
            iconBg={colors.warningSoft}
            label="Notifications" sub="Push, SMS, WhatsApp, email"
            onPress={() => router.push('/notifications' as any)}
          />
          <Row colors={colors} styles={styles}
            icon={<MaterialCommunityIcons name="translate" size={18} color={colors.success} />}
            iconBg={colors.successSoft}
            label="Language" sub="English"
            onPress={() => Alert.alert('Coming soon', 'Language switching is in development.')}
            divider
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name={scheme === 'dark' ? 'moon' : 'sunny'} size={18} color={colors.subjectComputer} />}
            iconBg={scheme === 'dark' ? '#1F2E48' : '#E0E7FF'}
            label="Appearance"
            sub={appearanceLabel}
            onPress={() => setAppearanceOpen(true)}
            divider
          />
        </View>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.menuGroup}>
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="help-circle" size={20} color={colors.info} />}
            iconBg={colors.infoSoft}
            label="Help Center" sub="Frequently asked questions"
            onPress={() => Alert.alert('Help', 'Help center is in development.')}
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="document-text" size={18} color={colors.textSecondary} />}
            iconBg={colors.scheme === 'dark' ? '#2A3744' : '#F3F4F6'}
            label="Terms & Privacy" sub="How we handle your data"
            onPress={() => Alert.alert('Coming soon', 'Terms page is in development.')}
            divider
          />
          <Row colors={colors} styles={styles}
            icon={<Ionicons name="information-circle" size={18} color={colors.textSecondary} />}
            iconBg={colors.scheme === 'dark' ? '#2A3744' : '#F3F4F6'}
            label="About" sub="ShuleOne by Educraft • v1.0.0"
            onPress={() => {}}
            divider disabled
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleSignOut} style={styles.signOutCard}>
          <View style={styles.signOutIcon}>
            <Ionicons name="log-out" size={18} color={colors.danger} />
          </View>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Appearance picker sheet */}
      <AppearanceSheet
        visible={appearanceOpen}
        mode={mode}
        onClose={() => setAppearanceOpen(false)}
        onSelect={async (m) => {
          await setMode(m);
          setAppearanceOpen(false);
        }}
      />

      <EditProfileSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        initial={{
          firstName: parent.firstName || '',
          lastName: parent.lastName || '',
          email: parent.email || '',
          phone: parent.phone || '',
        }}
        onSubmit={async (vals) => {
          await updateProfile(vals);
          await refreshProfile();
        }}
      />

      <ChangePasswordSheet
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSubmit={async (current, next) => {
          await changePassword({ currentPassword: current, newPassword: next });
        }}
      />
    </View>
  );
};

// =================================================================
// Appearance picker sheet
// =================================================================
const AppearanceSheet: React.FC<{
  visible: boolean;
  mode: ThemeMode;
  onClose: () => void;
  onSelect: (mode: ThemeMode) => void;
}> = ({ visible, mode, onClose, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const options: { mode: ThemeMode; label: string; sub: string; icon: any }[] = [
    { mode: 'light',  label: 'Light',  sub: 'Bright surfaces, dark text',          icon: 'sunny' },
    { mode: 'dark',   label: 'Dark',   sub: 'Dim surfaces, easier on the eyes',   icon: 'moon' },
    { mode: 'system', label: 'System', sub: 'Match your device setting',           icon: 'phone-portrait' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Appearance</Text>
          <TouchableOpacity hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={styles.sheetIntro}>
            Choose how ShuleOne looks. "System" follows your phone's setting.
          </Text>

          {options.map((opt) => {
            const active = opt.mode === mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                activeOpacity={0.85}
                onPress={() => onSelect(opt.mode)}
                style={[
                  styles.appearanceOption,
                  active && {
                    borderColor: colors.primary,
                    borderWidth: 2,
                    backgroundColor: colors.primarySoft,
                  },
                ]}
              >
                <View style={[
                  styles.appearanceIcon,
                  { backgroundColor: active ? colors.primary : colors.primarySoft },
                ]}>
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? '#FFFFFF' : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appearanceLabel}>{opt.label}</Text>
                  <Text style={styles.appearanceSub}>{opt.sub}</Text>
                </View>
                {active && (
                  <View style={styles.appearanceCheck}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
};

// =================================================================
// Row component
// =================================================================
interface RowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  divider?: boolean;
  disabled?: boolean;
  colors: ColorPalette;
  styles: any;
}
const Row: React.FC<RowProps> = ({ icon, iconBg, label, sub, onPress, divider, disabled, colors, styles }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={disabled ? 1 : 0.7}
    disabled={disabled}
    style={[styles.row, divider && styles.rowDivider, disabled && { opacity: 0.7 }]}
  >
    <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
    </View>
    {!disabled && <Feather name="chevron-right" size={16} color={colors.textTertiary} />}
  </TouchableOpacity>
);

// =================================================================
// Edit profile sheet
// =================================================================
const EditProfileSheet: React.FC<{
  visible: boolean; onClose: () => void;
  initial: { firstName: string; lastName: string; email: string; phone: string };
  onSubmit: (vals: { firstName: string; lastName: string; email: string; phone: string }) => Promise<void>;
}> = ({ visible, onClose, initial, onSubmit }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setFirstName(initial.firstName);
      setLastName(initial.lastName);
      setEmail(initial.email);
      setPhone(initial.phone);
    }
  }, [visible]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ firstName, lastName, email, phone });
      Alert.alert('Profile updated', 'Your changes have been saved.');
      onClose();
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Could not save your changes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <TouchableOpacity hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Field colors={colors} styles={styles} label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
          <Field colors={colors} styles={styles} label="Last Name" value={lastName} onChange={setLastName} placeholder="Last name" />
          <Field colors={colors} styles={styles} label="Email" value={email} onChange={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field colors={colors} styles={styles} label="Phone" value={phone} onChange={setPhone} placeholder="0712 345 678" keyboardType="phone-pad" />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const ChangePasswordSheet: React.FC<{
  visible: boolean; onClose: () => void;
  onSubmit: (current: string, next: string) => Promise<void>;
}> = ({ visible, onClose, onSubmit }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { if (visible) { setCurrent(''); setNext(''); setConfirm(''); } }, [visible]);

  const handleSubmit = async () => {
    if (next.length < 6) { Alert.alert('Password too short', 'Min 6 characters.'); return; }
    if (next !== confirm) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await onSubmit(current, next);
      Alert.alert('Password changed', 'Your password has been updated.');
      onClose();
    } catch (e: any) {
      Alert.alert('Could not change password', e?.message ?? 'Check current password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Change Password</Text>
          <TouchableOpacity hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Field colors={colors} styles={styles} label="Current password" value={current} onChange={setCurrent} placeholder="Current password" secureTextEntry />
          <Field colors={colors} styles={styles} label="New password" value={next} onChange={setNext} placeholder="At least 6 characters" secureTextEntry />
          <Field colors={colors} styles={styles} label="Confirm new password" value={confirm} onChange={setConfirm} placeholder="Re-enter new password" secureTextEntry />

          <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={submitting} style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>Update password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const Field: React.FC<{
  label: string; value: string; onChange: (s: string) => void;
  placeholder?: string; keyboardType?: any; secureTextEntry?: boolean;
  colors: ColorPalette; styles: any;
}> = ({ label, value, onChange, placeholder, keyboardType, secureTextEntry, colors, styles }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
    />
  </View>
);

// =================================================================
// Theme-aware styles factory
// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16 },

    // Profile card floats over the app bar edge
    profileCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      padding: 14, borderRadius: 18,
      borderWidth: 1, borderColor: c.border,
      marginTop: -20,
      shadowColor: c.primaryDeep,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14, elevation: 5,
    },
    profileAvatar: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 14, overflow: 'hidden',
    },
    profileInitials: { color: c.primary, fontSize: 16, fontWeight: '900' },
    profileName: { fontSize: 15, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    profileSub: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
    },
    editBtnText: { color: c.primary, fontSize: 12, fontWeight: '800' },

    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: c.primary,
      letterSpacing: 0.6, marginTop: 24, marginBottom: 8, marginLeft: 4,
    },
    menuGroup: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 4, elevation: 1,
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    rowDivider: { borderTopWidth: 1, borderTopColor: c.border },
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', marginRight: 14,
    },
    rowLabel: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    rowSub: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    signOutCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.dangerSoft,
      paddingVertical: 14, borderRadius: 16,
      marginTop: 28, gap: 8,
    },
    signOutIcon: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    signOutText: { color: c.danger, fontSize: 14, fontWeight: '800' },

    // sheet
    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
    sheetIntro: { fontSize: 13, color: c.textSecondary, lineHeight: 18, marginBottom: 16, fontWeight: '500' },

    appearanceOption: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 14, padding: 14, marginBottom: 10, gap: 14,
    },
    appearanceIcon: {
      width: 42, height: 42, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    appearanceLabel: { fontSize: 15, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    appearanceSub: { fontSize: 12, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
    appearanceCheck: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    // form fields
    label: {
      fontSize: 11.5, fontWeight: '700', color: c.textSecondary,
      letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase',
    },
    input: {
      backgroundColor: c.scheme === 'dark' ? c.card : c.backgroundAlt,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, color: c.text, fontWeight: '500',
    },
    primaryBtn: {
      backgroundColor: c.primary,
      paddingVertical: 14, borderRadius: 14,
      alignItems: 'center', marginTop: 12,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  });
}
