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
  const { children, selectedChild, selectChild } = useSelectedChild();

  const [appearanceOpen, setAppearanceOpen] = useState(false);

  // Inline profile form — mirrors the web Settings Profile card.
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const resetProfileForm = useCallback(() => {
    setPName(parent.name || `${parent.firstName} ${parent.lastName}`.trim());
    setPEmail(parent.email || '');
    setPPhone(parent.phone || '');
    setProfileDirty(false);
    setProfileMsg(null);
  }, [parent.name, parent.firstName, parent.lastName, parent.email, parent.phone]);
  useFocusEffect(useCallback(() => { resetProfileForm(); }, [resetProfileForm]));
  const editField = (setter: (v: string) => void) => (v: string) => { setter(v); setProfileDirty(true); };
  const saveProfile = async () => {
    if (!pName.trim()) { setProfileMsg({ ok: false, text: 'Name is required.' }); return; }
    setProfileSaving(true); setProfileMsg(null);
    try {
      await updateProfile({ name: pName.trim(), email: pEmail.trim() || null, phone: pPhone.trim() || null });
      await refreshProfile();
      setProfileDirty(false);
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch (e: any) {
      setProfileMsg({ ok: false, text: e?.message || 'Could not save your profile.' });
    } finally { setProfileSaving(false); }
  };

  // Inline security form — mirrors the web Security card.
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const savePassword = async () => {
    setPwMsg(null);
    if (pwNext.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (pwNext !== pwConfirm) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return; }
    if (!accessToken) return;
    setPwSaving(true);
    try {
      await changeParentPassword(accessToken, { currentPassword: pwCurrent, newPassword: pwNext });
      setPwMsg({ ok: true, text: 'Password updated.' });
      setPwCurrent(''); setPwNext(''); setPwConfirm('');
    } catch {
      setPwMsg({ ok: false, text: 'Could not update — check your current password.' });
    } finally { setPwSaving(false); }
  };

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
        {/* Profile — identity + inline editable fields, like the web card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
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
          </View>

          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput style={styles.fieldInput} value={pName} onChangeText={editField(setPName)}
            placeholder="Your name" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput style={styles.fieldInput} value={pEmail} onChangeText={editField(setPEmail)}
            placeholder="you@example.com" placeholderTextColor={colors.textTertiary}
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.fieldLabel}>PHONE</Text>
          <TextInput style={styles.fieldInput} value={pPhone} onChangeText={editField(setPPhone)}
            placeholder="07XX XXX XXX" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" />

          {profileMsg && (
            <Text style={[styles.formMsg, { color: profileMsg.ok ? colors.success : colors.danger }]}>{profileMsg.text}</Text>
          )}
          {profileDirty && (
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.7} disabled={profileSaving} onPress={resetProfileForm}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, profileSaving && { opacity: 0.6 }]} activeOpacity={0.85}
                disabled={profileSaving} onPress={saveProfile}>
                {profileSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Linked children — switch the active child, like the web card */}
        <Text style={styles.sectionLabel}>LINKED CHILDREN</Text>
        <View style={styles.menuGroup}>
          {children.map((c, i) => {
            const active = c.studentId === selectedChild?.studentId;
            return (
              <View key={c.studentId} style={[styles.childRow, i > 0 && styles.deviceDivider]}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childInitials}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.childName} numberOfLines={1}>{c.fullName}</Text>
                  <Text style={styles.childMeta} numberOfLines={1}>
                    {[c.classLabel, c.schoolName].filter(Boolean).join(' · ')}
                  </Text>
                  {!!c.admNo && <Text style={styles.childAdm}>Admission: {c.admNo}</Text>}
                </View>
                {active ? (
                  <View style={styles.activeChip}><Text style={styles.activeChipText}>Active</Text></View>
                ) : (
                  <TouchableOpacity style={styles.switchBtn} activeOpacity={0.7} onPress={() => selectChild(c.studentId)}>
                    <Text style={styles.switchBtnText}>Switch</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Language — the web's EN/SW picker */}
        <Text style={styles.sectionLabel}>LANGUAGE</Text>
        <View style={styles.langRow}>
          {[
            { id: 'en', label: 'English', native: 'English' },
            { id: 'sw', label: 'Swahili', native: 'Kiswahili' },
          ].map((l) => {
            const active = l.id === 'en';
            return (
              <TouchableOpacity key={l.id} activeOpacity={0.8}
                style={[styles.langCard, active && { borderColor: colors.primary, backgroundColor: colors.primarySofter }]}
                onPress={() => { if (!active) Alert.alert('Coming soon', 'Swahili translations are coming to the app soon.'); }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langLabel}>{l.label}</Text>
                  <Text style={styles.langNative}>{l.native}</Text>
                </View>
                {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
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

        {/* Security — inline change-password, like the web card */}
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={[styles.menuGroup, { padding: 14 }]}>
          <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
          <TextInput style={styles.fieldInput} value={pwCurrent} onChangeText={setPwCurrent}
            secureTextEntry autoCapitalize="none" placeholder="••••••••" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
          <TextInput style={styles.fieldInput} value={pwNext} onChangeText={setPwNext}
            secureTextEntry autoCapitalize="none" placeholder="At least 8 characters" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
          <TextInput style={styles.fieldInput} value={pwConfirm} onChangeText={setPwConfirm}
            secureTextEntry autoCapitalize="none" placeholder="Repeat the new password" placeholderTextColor={colors.textTertiary} />
          {pwMsg && (
            <Text style={[styles.formMsg, { color: pwMsg.ok ? colors.success : colors.danger }]}>{pwMsg.text}</Text>
          )}
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.saveBtn, (pwSaving || !pwCurrent || !pwNext) && { opacity: 0.5 }]}
              activeOpacity={0.85} disabled={pwSaving || !pwCurrent || !pwNext} onPress={savePassword}>
              {pwSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
                <><Ionicons name="lock-closed" size={13} color="#FFF" /><Text style={styles.saveBtnText}>Update password</Text></>
              )}
            </TouchableOpacity>
          </View>
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

    // Inline profile + security forms
    profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.border },
    fieldLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.8, marginTop: 10, marginBottom: 5 },
    fieldInput: {
      borderWidth: 1, borderColor: c.border, borderRadius: 11, backgroundColor: c.background,
      paddingHorizontal: 12, height: 44, fontSize: 13.5, fontFamily: fonts.regular, color: c.text,
    },
    formMsg: { fontSize: 12, fontFamily: fonts.semibold, marginTop: 10 },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    ghostBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11 },
    ghostBtnText: { fontSize: 13, fontFamily: fonts.bold, color: c.textSecondary },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10,
    },
    saveBtnText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },

    // Linked children
    childRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    childAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
    childInitials: { fontSize: 13, fontFamily: fonts.extrabold, color: c.primary },
    childName: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    childMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    childAdm: { fontSize: 10.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    activeChip: { backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    activeChipText: { fontSize: 11, fontFamily: fonts.bold, color: c.primary },
    switchBtn: { borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    switchBtnText: { fontSize: 12, fontFamily: fonts.bold, color: c.textSecondary },

    // Language picker
    langRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
    langCard: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card,
      borderRadius: 14, padding: 13,
    },
    langLabel: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    langNative: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },

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
