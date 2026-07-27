import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../../services/api/authApi';
import { LiquidBackground, GlassCard } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import type { AuthScreenProps } from '../../../navigation/types';

type Props = AuthScreenProps<'OTPVerify'>;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OTPScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { mobileNo } = route.params;
  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (!text && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) { setError('Enter all 6 digits.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.verifyOTP({ mobileNo, otp: code });
      navigation.replace('Login');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authApi.sendOTP(mobileNo);
      setCountdown(RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch { /* silent */ }
  };

  const masked = mobileNo.replace(/(\d{2})\d{5}(\d{3})/, '$1XXXXX$2');

  return (
    <LiquidBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Verify Your{'\n'}Mobile Number</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.mobileNo}>+91 {masked}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null, i === otp.findIndex((d) => !d) && styles.otpBoxActive]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Timer / Resend */}
          <View style={styles.timerRow}>
            {countdown > 0 ? (
              <Text style={styles.timer}>Resend in <Text style={styles.timerBold}>0:{String(countdown).padStart(2, '0')}</Text></Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resend}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.cta, isLoading && { opacity: 0.6 }]} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={Colors.navy} /> : <Text style={styles.ctaText}>Verify & Continue →</Text>}
          </TouchableOpacity>

          <GlassCard style={styles.noteCard} variant="info">
            <Text style={styles.noteText}>Never share this OTP with anyone, including Karins support.</Text>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingHorizontal: Spacing[5] },
  backBtn:      { width: 38, height: 38, backgroundColor: Colors.glass.bg, borderWidth: 1, borderColor: Colors.glass.border, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[8] },
  backArrow:    { fontSize: 18, color: Colors.white },
  title:        { fontSize: FontSize['4xl'], fontWeight: '800', color: Colors.white, lineHeight: 38, marginBottom: Spacing[3] },
  subtitle:     { fontSize: FontSize.base, color: Colors.text.subtle, lineHeight: 22, marginBottom: Spacing[8] },
  mobileNo:     { color: Colors.text.secondary, fontWeight: '600' },
  otpRow:       { flexDirection: 'row', gap: 10, marginBottom: Spacing[3] },
  otpBox:       { flex: 1, height: 56, backgroundColor: Colors.glass.bg, borderWidth: 1.5, borderColor: Colors.glass.border, borderRadius: Radius.lg, textAlign: 'center', fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.white },
  otpBoxFilled: { borderColor: Colors.glass.borderStrong },
  otpBoxActive: { borderColor: 'rgba(0,113,197,0.6)', shadowColor: 'rgba(0,113,197,0.2)', shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, shadowOpacity: 1 },
  error:        { color: Colors.dangerLight, fontSize: FontSize.sm, marginBottom: Spacing[2] },
  timerRow:     { alignItems: 'center', marginBottom: Spacing[8] },
  timer:        { fontSize: FontSize.base, color: Colors.text.subtle },
  timerBold:    { color: Colors.infoLight, fontWeight: '600' },
  resend:       { fontSize: FontSize.base, color: Colors.infoLight, fontWeight: '600' },
  cta:          { backgroundColor: Colors.yellow, borderRadius: Radius.lg, padding: Spacing[4], alignItems: 'center', marginBottom: Spacing[4] },
  ctaText:      { fontSize: FontSize.lg, fontWeight: '800', color: Colors.navy },
  noteCard:     { padding: 12 },
  noteText:     { fontSize: FontSize.sm, color: Colors.infoLight, lineHeight: 18 },
});
