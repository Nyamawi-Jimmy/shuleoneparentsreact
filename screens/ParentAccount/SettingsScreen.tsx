import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { useAuth } from '../../context/AuthContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { listDevices, signOutDevice, DeviceSession } from '../../api/auth';
import { changeParentPassword } from '../../api/parent';
import { getBillingStatus } from '../../api/billing';
import { BillingStatus } from '../../api/billing.types';
import { fonts } from '../../constants/theme';

const fmtSeen = (iso?: string | null) => {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 2) return 'Active now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const subActive = (s?: string | null) => ['ACTIVE', 'SUBSCRIBED', 'TRIAL', 'TRIALING'].includes(String(s || '').toUpperCase());

export const SettingsScreen: React.FC = () => {
  const { colors, mode, scheme, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { signOut, user, accessToken } = useAuth();
  const { parent, refresh: refreshProfile, update: updateProfile } = useParentProfile();
  const { children, selectedChild } = useSelectedChild();

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  // Plans at a glance + active devices — same data the web Settings page shows.
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [devices, setDevices] = useState<DeviceSession[] | null>(null);
  const [devicesBusy, setDevicesBusy] = useState<string | null>(null);

  const loadExtras = useCallback(() => {
    if (!accessToken) return;
    getBillingStatus(accessToken).then(setBilling).catch(() => setBilling(null));
    listDevices(accessToken).then((d) => setDevices(Array.isArray(d) ? d : [])).catch(() => setDevices([]));
  }, [accessToken]);
  useFocusEffect(useCallback(() => { loadExtras(); }, [loadExtras]));

  const revokeDevice = async (id: string) => {
    if (!accessToken || devicesBusy) return;
    setDevicesBusy(id);
    try {
      await signOutDevice(accessToken, id);
      setDevices((rows) => (rows ?? []).filter((d) => d.id !== id));
    } catch {
      Alert.alert('Could not sign out', 'That device could not be signed out right now.');
    } finally { setDevicesBusy(null); }
  };

  // Entitlements, mirroring the web PlanRows.
  const childSub = billing?.childStatuses?.find((c: any) => c.studentId === selectedChild?.studentId) as any;
  const premiumActive = subActive(billing?.family?.status as any) || subActive(childSub?.status) || subActive(billing?.status as any);
  const hasCodingPlan = !!selectedChild && (selectedChild.codingSchool || selectedChild.codingOnly);
  const renews = (billing?.family as any)?.currentPeriodEnd || childSub?.currentPeriodEnd || childSub?.entitlementExpiresAt || null;
  const renewsLabel = renews ? new Date(renews).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

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

        {/* Plans at a glance — mirrors the web Settings PlanRows. */}
        <Text style={styles.sectionLabel}>YOUR PLANS</Text>
        <View style={styles.menuGroup}>
          <PlanRow colors={colors} styles={styles}
            icon={<Ionicons name="sparkles" size={18} color={colors.purple} />} iconBg={colors.purpleLight}
            title="AI Learning" active={premiumActive}
            desc={premiumActive
              ? (renewsLabel ? `Premium · renews ${renewsLabel}` : 'Premium · active')
              : 'Personalized practice, AI tutor & learning insights'}
          />
          <PlanRow colors={colors} styles={styles} divider
            icon={<MaterialCommunityIcons name="code-tags" size={18} color={colors.success} />} iconBg={colors.successSoft}
            title="Coding & Robotics" active={hasCodingPlan}
            badge={hasCodingPlan ? (selectedChild?.codingSchool ? 'Included by school' : 'Premium') : undefined}
            desc={hasCodingPlan
              ? (selectedChild?.codingSchool ? 'Provided by the school' : 'Included with Premium')
              : 'Interactive coding lessons, robotics projects & challenges'}
          />
          <PlanRow colors={colors} styles={styles} divider
            icon={<MaterialCommunityIcons name="bus-school" size={18} color={colors.info} />} iconBg={colors.infoSoft}
            title="Live bus tracking" active={premiumActive}
            desc={premiumActive ? 'Real-time bus location & arrival alerts' : 'Track the bus live and get arrival alerts'}
          />
          <TouchableOpacity style={styles.manageLink} activeOpacity={0.7} onPress={() => router.push('/subscriptions' as any)}>
            <Text style={styles.manageLinkText}>Manage plans</Text>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </TouchableOpacity>
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

        {/* Active devices — mirrors the web Settings device list. */}
        <Text style={styles.sectionLabel}>ACTIVE DEVICES</Text>
        <View style={styles.menuGroup}>
          {devices === null ? (
            <View style={styles.deviceEmpty}><ActivityIndicator size="small" color={colors.primary} /></View>
          ) : devices.length === 0 ? (
            <View style={styles.deviceEmpty}>
              <Text style={styles.deviceEmptyText}>No active devices recorded yet — new logins will appear here.</Text>
            </View>
          ) : (
            devices.map((d, i) => {
              const iconName = d.deviceType === 'desktop' ? 'desktop-outline' : d.deviceType === 'tablet' ? 'tablet-portrait-outline' : 'phone-portrait-outline';
              return (
                <View key={d.id ?? i} style={[styles.deviceRow, i > 0 && styles.deviceDivider]}>
                  <View style={styles.deviceIcon}>
                    <Ionicons name={iconName as any} size={17} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {d.deviceName || `${d.browser || 'App'} on ${d.os || 'device'}`}
                      </Text>
                      {d.current && (
                        <View style={styles.deviceChip}><Text style={styles.deviceChipText}>This device</Text></View>
                      )}
                    </View>
                    <Text style={styles.deviceMeta} numberOfLines={1}>
                      {d.ipAddress || 'Unknown network'} · {fmtSeen(d.lastSeenAt)}
                    </Text>
                  </View>
                  {!d.current && (
                    devicesBusy === d.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
                      : (
                        <TouchableOpacity hitSlop={8} onPress={() => d.id && revokeDevice(d.id)}>
                          <Text style={styles.deviceSignOut}>Sign out</Text>
                        </TouchableOpacity>
                      )
                  )}
                </View>
              );
            })
          )}
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
          if (!accessToken) throw new Error('Not signed in.');
          await changeParentPassword(accessToken, { currentPassword: current, newPassword: next });
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
            Choose how ShuleOne looks. “System” follows your phone’s setting.
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
// Plan status row — the web Settings PlanRow, mobile-sized.
// =================================================================
const PlanRow: React.FC<{
  colors: ColorPalette; styles: any; icon: React.ReactNode; iconBg: string;
  title: string; desc: string; active: boolean; badge?: string; divider?: boolean;
}> = ({ colors, styles, icon, iconBg, title, desc, active, badge, divider }) => (
  <View style={[styles.planRow, divider && styles.deviceDivider]}>
    <View style={[styles.planIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={styles.planTitleRow}>
        <Text style={styles.planTitle}>{title}</Text>
        {!!badge && <View style={styles.planBadge}><Text style={styles.planBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={styles.planDesc} numberOfLines={2}>{desc}</Text>
    </View>
    {active ? (
      <View style={[styles.planState, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="checkmark" size={11} color={colors.success} />
        <Text style={[styles.planStateText, { color: colors.success }]}>Active</Text>
      </View>
    ) : (
      <View style={[styles.planState, { backgroundColor: colors.backgroundAlt }]}>
        <Text style={[styles.planStateText, { color: colors.textTertiary }]}>Off</Text>
      </View>
    )}
  </View>
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

    // Plans at a glance
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    planIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
    planTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    planBadge: { backgroundColor: c.backgroundAlt, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    planBadgeText: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textSecondary },
    planDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2, lineHeight: 16 },
    planState: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    planStateText: { fontSize: 10.5, fontFamily: fonts.bold },
    manageLink: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
      paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border,
    },
    manageLinkText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },

    // Active devices
    deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    deviceDivider: { borderTopWidth: 1, borderTopColor: c.border },
    deviceIcon: {
      width: 36, height: 36, borderRadius: 10, backgroundColor: c.backgroundAlt,
      alignItems: 'center', justifyContent: 'center',
    },
    deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
    deviceName: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, flexShrink: 1 },
    deviceChip: { backgroundColor: c.successSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    deviceChipText: { fontSize: 9.5, fontFamily: fonts.bold, color: c.success },
    deviceMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    deviceSignOut: { fontSize: 12, fontFamily: fonts.bold, color: c.danger },
    deviceEmpty: { padding: 18, alignItems: 'center' },
    deviceEmptyText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 18 },

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
