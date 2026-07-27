/**
 * Request Demo — public lead capture, mirroring the web `/signup`
 * (ProductEnquiryForm) flow so both clients hit the same enquiry lifecycle.
 *
 * Steps against POST /enquiry/submit:
 *   0a. mobile only              → OTP_SENT (+ enquiryId)
 *   0b. enquiryId + otp + mobile → OTP_VERIFIED
 *   1.  full form + product ids  → ENQUIRY_SUBMITTED (HTTP 201)
 *
 * Existing customers get LOGIN_REQUIRED and are redirected to Sign In — the
 * demo form is for prospects only. Company / fleet size ride inside `message`
 * because the enquiry table has no dedicated columns for them.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { enquiryApi } from '../../../services/api/enquiryApi';
import { getApiErrorMessage } from '../../../services/api/client';
import { LiquidBackground, GlassCard } from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import type { AuthScreenProps } from '../../../navigation/types';
import {
  DEMO_FLEET_SIZES,
  type FeaturedProduct,
} from '../../../types/enquiry';

type Props = AuthScreenProps<'RequestDemo'>;

const MOBILE_LENGTH = 10;
const OTP_LENGTH = 4;
const PINCODE_LENGTH = 6;

// Public legal pages on the web portal — same targets as the signup form links.
const TERMS_URL = 'https://fleet.karins.in/terms-of-use';
const PRIVACY_URL = 'https://fleet.karins.in/privacy-policy';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_PATTERN = /^\d{6}$/;

interface DemoFormData {
  name: string;
  email: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fleetSize: string;
}

interface DemoFormErrors {
  name?: string;
  email?: string;
  company?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fleetSize?: string;
  selectedProducts?: string;
  terms?: string;
  address?: string;
}

const EMPTY_FORM: DemoFormData = {
  name: '',
  email: '',
  company: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  fleetSize: '',
};

export default function RequestDemoScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // step 0 = mobile/OTP, 1 = details form, 2 = thank-you (web numbering).
  const [step, setStep] = useState(0);
  const [isOtpSent, setOtpSent] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMobileFieldError, setMobileFieldError] = useState(false);

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  // enquiryId ties OTP verify + final submit to the row created on OTP send.
  const [enquiryId, setEnquiryId] = useState<number | undefined>();

  const [formData, setFormData] = useState<DemoFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<DemoFormErrors>({});
  const [selectedProducts, setSelectedProducts] = useState<Array<string | number>>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [features, setFeatures] = useState<FeaturedProduct[]>([]);
  const [areProductsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const { data } = await enquiryApi.getFeaturedProducts();
        if (!cancelled) setFeatures(data.result ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load modules. Pull back and try again.'));
        }
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const updateField = <K extends keyof DemoFormData>(key: K, value: DemoFormData[K]) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (!digit && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleSendOtp = async () => {
    setError('');
    setMobileFieldError(false);

    if (mobile.length !== MOBILE_LENGTH) {
      setMobileFieldError(true);
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const { data } = await enquiryApi.submit({ mobileNo: mobile });

      // Existing customers must sign in — demo capture is for prospects only.
      if (data.status === 'LOGIN_REQUIRED') {
        Alert.alert('Already a customer', data.message, [
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      if (data.enquiryId) setEnquiryId(data.enquiryId);
      if (data.status === 'OTP_SENT') {
        setOtpSent(true);
        setOtp(Array(OTP_LENGTH).fill(''));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== OTP_LENGTH) {
      setError('Enter a valid 4-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { data } = await enquiryApi.submit({
        enquiryId,
        otp: enteredOtp,
        mobileNo: mobile,
      });

      if (data.status === 'OTP_VERIFIED') {
        setStep(1);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string | number) => {
    setSelectedProducts((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
    setFormErrors((current) => ({ ...current, selectedProducts: undefined }));
  };

  const allModulesSelected =
    features.length > 0 && selectedProducts.length === features.length;

  const toggleAllModules = () => {
    if (allModulesSelected) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(features.map((item) => item.id));
    }
    setFormErrors((current) => ({ ...current, selectedProducts: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: DemoFormErrors = {};

    if (!formData.name.trim()) errors.name = 'Please enter your full name';
    if (!formData.email.trim()) {
      errors.email = 'Please enter your work email';
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.company.trim()) {
      errors.company = 'Please enter your company or fleet name';
    }
    if (!formData.city.trim()) errors.city = 'Please enter your city';
    if (!formData.state.trim()) errors.state = 'Please enter your state';
    if (!formData.pincode.trim()) {
      errors.pincode = 'Please enter your pincode';
    } else if (!PINCODE_PATTERN.test(formData.pincode)) {
      errors.pincode = 'Pincode must be 6 digits';
    }
    if (!formData.fleetSize) errors.fleetSize = 'Please select your fleet size';
    if (selectedProducts.length === 0) {
      errors.selectedProducts = 'Please select at least one module';
    }
    if (!termsAccepted) {
      errors.terms = 'Please accept the terms to continue';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Map backend field messages onto the matching input, matching web behaviour. */
  const applyBackendFieldError = (backendMsg: string) => {
    const lowerMsg = backendMsg.toLowerCase();
    if (lowerMsg.includes('email')) setFormErrors({ email: backendMsg });
    else if (lowerMsg.includes('name')) setFormErrors({ name: backendMsg });
    else if (lowerMsg.includes('city')) setFormErrors({ city: backendMsg });
    else if (lowerMsg.includes('pincode')) setFormErrors({ pincode: backendMsg });
    else if (lowerMsg.includes('state')) setFormErrors({ state: backendMsg });
    else if (lowerMsg.includes('address')) setFormErrors({ address: backendMsg });
    else if (lowerMsg.includes('product')) setFormErrors({ selectedProducts: backendMsg });
    else setError(backendMsg || 'Error occurred');
  };

  const handleSubmitDemo = async () => {
    setError('');
    if (!validateForm()) return;

    // Company and fleet size have no enquiry columns — pack them into message
    // exactly as the web form does so the notify email still shows them.
    const messageParts = [
      formData.company ? `Company: ${formData.company}` : '',
      formData.fleetSize ? `Fleet size: ${formData.fleetSize}` : '',
    ].filter(Boolean);

    setLoading(true);
    try {
      const { data } = await enquiryApi.submit({
        enquiryId,
        mobileNo: mobile,
        name: formData.name.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        selectedProducts,
        message: messageParts.join('\n'),
      });

      if (data.status === 'ENQUIRY_SUBMITTED') {
        setStep(2);
      }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Error occurred');
      applyBackendFieldError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      // OTP is already consumed — restart so a fresh code is issued.
      setStep(0);
      setOtpSent(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setEnquiryId(undefined);
      setError('');
      return;
    }
    if (step === 0 && isOtpSent) {
      setOtpSent(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      return;
    }
    navigation.goBack();
  };

  const openLegalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', url);
    }
  };

  return (
    <LiquidBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step !== 2 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          ) : null}

          {step === 0 ? (
            <>
              <Text style={styles.eyebrow}>GET STARTED</Text>
              <Text style={styles.title}>Verify your mobile number</Text>
              <Text style={styles.subtitle}>
                We'll send a one-time code to confirm your number before you request your free demo.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <GlassCard>
                <Text style={styles.label}>Mobile number</Text>
                <View style={[styles.inputWrapper, isOtpSent && styles.inputDisabled]}>
                  <View style={styles.flagRow}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.dialCode}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter mobile number"
                    placeholderTextColor={Colors.text.subtle}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    maxLength={MOBILE_LENGTH}
                    editable={!isOtpSent}
                    value={mobile}
                    onChangeText={(text) => setMobile(text.replace(/\D/g, ''))}
                    onSubmitEditing={isOtpSent ? undefined : handleSendOtp}
                  />
                </View>
                {hasMobileFieldError ? (
                  <Text style={styles.hint}>Please enter a valid 10-digit mobile number</Text>
                ) : null}

                {isOtpSent ? (
                  <>
                    <Text style={styles.label}>One-time password</Text>
                    <View style={styles.otpRow}>
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => { otpRefs.current[index] = ref; }}
                          style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                          value={digit}
                          onChangeText={(text) => handleOtpChange(text, index)}
                          keyboardType="number-pad"
                          maxLength={1}
                          selectTextOnFocus
                        />
                      ))}
                    </View>
                  </>
                ) : null}

                <TouchableOpacity
                  style={[styles.cta, isLoading && styles.ctaDisabled]}
                  onPress={isOtpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading
                    ? <ActivityIndicator color={Colors.navy} />
                    : (
                      <Text style={styles.ctaText}>
                        {isOtpSent ? 'Verify & continue →' : 'Send OTP →'}
                      </Text>
                    )}
                </TouchableOpacity>
              </GlassCard>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.eyebrow}>GET STARTED</Text>
              <Text style={styles.title}>Request your free demo</Text>
              <Text style={styles.subtitle}>
                Tell us about your fleet and our team will set up a personalised walkthrough.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <GlassCard>
                <Text style={styles.label}>Full name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor={Colors.text.subtle}
                    value={formData.name}
                    onChangeText={(text) => updateField('name', text)}
                    autoCapitalize="words"
                  />
                </View>
                {formErrors.name ? <Text style={styles.hint}>{formErrors.name}</Text> : null}

                <Text style={styles.label}>Work email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="you@company.com"
                    placeholderTextColor={Colors.text.subtle}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(text) => updateField('email', text)}
                  />
                </View>
                {formErrors.email ? <Text style={styles.hint}>{formErrors.email}</Text> : null}

                <Text style={styles.label}>Mobile</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <View style={styles.flagRow}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.dialCode}>+91</Text>
                  </View>
                  <Text style={[styles.input, styles.readonlyText]}>{mobile}</Text>
                </View>

                <Text style={styles.label}>Company / fleet</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Company name"
                    placeholderTextColor={Colors.text.subtle}
                    value={formData.company}
                    onChangeText={(text) => updateField('company', text)}
                  />
                </View>
                {formErrors.company ? <Text style={styles.hint}>{formErrors.company}</Text> : null}

                <Text style={styles.label}>Fleet size</Text>
                <View style={styles.chips}>
                  {DEMO_FLEET_SIZES.map((size) => {
                    const isActive = formData.fleetSize === size;
                    return (
                      <TouchableOpacity
                        key={size}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => updateField('fleetSize', size)}
                      >
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {formErrors.fleetSize ? <Text style={styles.hint}>{formErrors.fleetSize}</Text> : null}

                <Text style={styles.label}>City</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Chennai"
                    placeholderTextColor={Colors.text.subtle}
                    value={formData.city}
                    onChangeText={(text) => updateField('city', text)}
                    autoCapitalize="words"
                  />
                </View>
                {formErrors.city ? <Text style={styles.hint}>{formErrors.city}</Text> : null}

                <Text style={styles.label}>State</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tamil Nadu"
                    placeholderTextColor={Colors.text.subtle}
                    value={formData.state}
                    onChangeText={(text) => updateField('state', text)}
                    autoCapitalize="words"
                  />
                </View>
                {formErrors.state ? <Text style={styles.hint}>{formErrors.state}</Text> : null}

                <Text style={styles.label}>Pincode</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit pincode"
                    placeholderTextColor={Colors.text.subtle}
                    keyboardType="number-pad"
                    maxLength={PINCODE_LENGTH}
                    value={formData.pincode}
                    onChangeText={(text) => updateField('pincode', text.replace(/\D/g, ''))}
                  />
                </View>
                {formErrors.pincode ? <Text style={styles.hint}>{formErrors.pincode}</Text> : null}

                <Text style={styles.label}>Address (optional)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Street address"
                    placeholderTextColor={Colors.text.subtle}
                    value={formData.address}
                    onChangeText={(text) => updateField('address', text)}
                  />
                </View>
                {formErrors.address ? <Text style={styles.hint}>{formErrors.address}</Text> : null}

                <Text style={styles.label}>
                  Which modules interest you?{' '}
                  <Text style={styles.labelMuted}>(select all that apply)</Text>
                </Text>
                {areProductsLoading ? (
                  <ActivityIndicator color={Colors.yellow} style={{ marginVertical: Spacing[3] }} />
                ) : (
                  <View style={styles.chips}>
                    {features.map((item) => {
                      const isActive = selectedProducts.includes(item.id);
                      // Avoid decoding full-resolution API base64 icons into bitmaps
                      // for a 14px chip — Play flags that path for memory pressure.
                      const initial = (item.title?.trim()?.charAt(0) || '•').toUpperCase();
                      return (
                        <TouchableOpacity
                          key={String(item.id)}
                          style={[styles.chip, isActive && styles.chipActive]}
                          onPress={() => toggleProduct(item.id)}
                        >
                          <View style={[styles.moduleBadge, isActive && styles.moduleBadgeActive]}>
                            <Text style={[styles.moduleBadgeText, isActive && styles.chipTextActive]}>
                              {initial}
                            </Text>
                          </View>
                          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                            {item.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {features.length > 0 ? (
                      <TouchableOpacity
                        style={[styles.chip, styles.chipHighlight, allModulesSelected && styles.chipActive]}
                        onPress={toggleAllModules}
                      >
                        <Text style={[styles.chipText, allModulesSelected && styles.chipTextActive]}>
                          All modules
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                {formErrors.selectedProducts ? (
                  <Text style={styles.hint}>{formErrors.selectedProducts}</Text>
                ) : null}

                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => {
                    setTermsAccepted((current) => !current);
                    setFormErrors((current) => ({ ...current, terms: undefined }));
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted ? <Text style={styles.checkboxMark}>✓</Text> : null}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to Karins'{' '}
                    <Text style={styles.termsLink} onPress={() => openLegalUrl(TERMS_URL)}>
                      Terms of Use
                    </Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={() => openLegalUrl(PRIVACY_URL)}>
                      Privacy Statement
                    </Text>
                    , and consent to be contacted about this demo.
                  </Text>
                </TouchableOpacity>
                {formErrors.terms ? <Text style={styles.hint}>{formErrors.terms}</Text> : null}

                <TouchableOpacity
                  style={[styles.cta, isLoading && styles.ctaDisabled]}
                  onPress={handleSubmitDemo}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading
                    ? <ActivityIndicator color={Colors.navy} />
                    : <Text style={styles.ctaText}>Request my free demo →</Text>
                  }
                </TouchableOpacity>

                <Text style={styles.secureNote}>
                  25,000+ vehicles trust Karins Fleet · No obligation, no lock-in
                </Text>
              </GlassCard>
            </>
          ) : null}

          {step === 2 ? (
            <GlassCard style={styles.successCard}>
              <View style={styles.successIconWrap}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successTitle}>Thank you!</Text>
              <Text style={styles.successBody}>
                Your demo request has been submitted successfully. Our team will contact you at{' '}
                <Text style={styles.successMobile}>+91 {mobile}</Text> shortly.
              </Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>Go to sign in →</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : null}

          {step !== 2 ? (
            <TouchableOpacity style={styles.switchBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchText}>Already a customer? Sign in</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  kav:            { flex: 1 },
  scroll:         { flexGrow: 1, paddingHorizontal: Spacing[5], justifyContent: 'center' },
  backBtn:        { width: 38, height: 38, backgroundColor: Colors.glass.bg, borderWidth: 1, borderColor: Colors.glass.border, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[6] },
  backArrow:      { fontSize: 18, color: Colors.white },
  eyebrow:        { fontSize: FontSize.xs, color: Colors.infoLight, letterSpacing: 1.6, fontWeight: '700', marginBottom: Spacing[2] },
  title:          { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.white, marginBottom: Spacing[2] },
  subtitle:       { fontSize: FontSize.base, color: Colors.text.subtle, lineHeight: 22, marginBottom: Spacing[4] },
  errorBox:       { backgroundColor: Colors.dangerBg, borderRadius: Radius.md, padding: 10, marginBottom: Spacing[3] },
  errorText:      { color: Colors.dangerLight, fontSize: FontSize.sm, fontWeight: '500', lineHeight: 19 },
  label:          { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600', marginBottom: 8 },
  labelMuted:     { color: Colors.text.subtle, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.glass.bg, borderWidth: 1.5, borderColor: Colors.glass.border,
    borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  inputDisabled:  { opacity: 0.65 },
  flagRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, borderRightWidth: 1, borderRightColor: Colors.glass.border, paddingRight: 10 },
  flag:           { fontSize: 18 },
  dialCode:       { fontSize: FontSize.base, color: Colors.text.secondary, fontWeight: '500' },
  input:          { flex: 1, fontSize: FontSize.base, color: Colors.white, padding: 0 },
  readonlyText:   { color: Colors.text.subtle },
  hint:           { color: Colors.dangerLight, fontSize: FontSize.sm, marginTop: -4, marginBottom: 10 },
  otpRow:         { flexDirection: 'row', gap: 10, marginBottom: Spacing[3] },
  otpBox:         { flex: 1, height: 56, backgroundColor: Colors.glass.bg, borderWidth: 1.5, borderColor: Colors.glass.border, borderRadius: Radius.lg, textAlign: 'center', fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.white },
  otpBoxFilled:   { borderColor: Colors.glass.borderStrong },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.glass.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.glass.bg,
  },
  chipHighlight:  { borderColor: Colors.glass.borderStrong },
  chipActive:     { backgroundColor: Colors.glass.interactive, borderColor: 'rgba(0,113,197,0.55)' },
  chipText:       { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  moduleBadge: {
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glass.bgStrong,
  },
  moduleBadgeActive: { backgroundColor: 'rgba(255,193,7,0.25)' },
  moduleBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.text.secondary },
  termsRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: Colors.glass.borderStrong, backgroundColor: Colors.glass.bg,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.yellow, borderColor: Colors.yellow },
  checkboxMark:   { color: Colors.navy, fontWeight: '800', fontSize: 13 },
  termsText:      { flex: 1, fontSize: FontSize.sm, color: Colors.text.subtle, lineHeight: 19 },
  termsLink:      { color: Colors.infoLight, fontWeight: '600' },
  cta:            { backgroundColor: Colors.yellow, borderRadius: Radius.lg, padding: Spacing[4], alignItems: 'center', marginTop: Spacing[2] },
  ctaDisabled:    { opacity: 0.6 },
  ctaText:        { fontSize: FontSize.lg, fontWeight: '800', color: Colors.navy, letterSpacing: 0.3 },
  secureNote:     { textAlign: 'center', fontSize: FontSize.xs, color: Colors.text.subtle, lineHeight: 17, marginTop: Spacing[4] },
  switchBtn:      { alignSelf: 'center', marginTop: Spacing[4] },
  switchText:     { color: Colors.infoLight, fontSize: FontSize.base, fontWeight: '500' },
  successCard:    { alignItems: 'center', paddingVertical: Spacing[6] },
  successIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.successBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4],
  },
  successIcon:    { color: Colors.success, fontSize: 32, fontWeight: '800' },
  successTitle:   { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.white, marginBottom: Spacing[2] },
  successBody:    { fontSize: FontSize.base, color: Colors.text.subtle, textAlign: 'center', lineHeight: 22, marginBottom: Spacing[5] },
  successMobile:  { color: Colors.white, fontWeight: '700' },
});
