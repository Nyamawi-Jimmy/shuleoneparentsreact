import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// Temporary entry screen. Pick which app section to open, which sends them
// to the matching login screen. Replace with your real onboarding flow later.
export default function ChooserScreen() {
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.brand}>
                    <View style={styles.logoCircle}>
                        <MaterialCommunityIcons name="school" size={36} color="#FFF" />
                    </View>
                    <Text style={styles.brandName}>ShuleOne</Text>
                    <Text style={styles.brandSub}>by Educraft</Text>
                </View>

                <Text style={styles.heading}>Who's using the app?</Text>
                <Text style={styles.subheading}>
                    Pick a profile to continue. You can switch any time.
                </Text>

                {/* Parent option - routes to parent login */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/parent-login' as any)}
                    style={styles.cardWrap}
                >
                    <LinearGradient
                        colors={['#FB7185', '#E11D48']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                    >
                        <View style={styles.iconBubble}>
                            <Ionicons name="people" size={28} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Parent App</Text>
                            <Text style={styles.cardSub}>
                                School records, fees, reports, attendance and messages
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Student option - routes to student login */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push('/student-login' as any)}
                    style={styles.cardWrap}
                >
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                    >
                        <View style={styles.iconBubble}>
                            <Ionicons name="school" size={28} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Student App</Text>
                            <Text style={styles.cardSub}>
                                Learn, practice, code and track your progress
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.footer}>v1.0.0 · ShuleOne LMS</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FFF' },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 24,
    },
    brand: { alignItems: 'center', marginBottom: 36 },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: '#E11D48',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#E11D48',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 6,
    },
    brandName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2c2550',
        letterSpacing: -0.5,
    },
    brandSub: {
        fontSize: 13,
        color: '#6f679c',
        marginTop: 2,
        fontWeight: '500',
    },
    heading: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2c2550',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    subheading: {
        fontSize: 13.5,
        color: '#6f679c',
        marginBottom: 24,
        fontWeight: '500',
    },
    cardWrap: { marginBottom: 14 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 5,
    },
    iconBubble: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    cardSub: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 12,
        marginTop: 3,
        fontWeight: '500',
        lineHeight: 17,
    },
    footer: {
        marginTop: 'auto',
        fontSize: 11,
        color: '#9b94c4',
        textAlign: 'center',
        fontWeight: '500',
    },
});
