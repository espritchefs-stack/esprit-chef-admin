import React, { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View, Alert, StatusBar } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '@/ctx/auth';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { signInAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const handleEmailLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
  };

  const handleEmailSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Check your email for the confirmation link or login if auto-confirmed.');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL('/(tabs)');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          // Supabase handles the session from the URL if deep linking is configured
        }
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Google login requires configuration in Supabase dashboard.');
    } finally {
      setLoading(false);
    }
  };

  // 코드값은 app_settings.guest_code에서 로드 — 앱 업데이트 없이 변경 가능
  const handleSecretCodeLogin = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('guest_code')
      .eq('id', 'global')
      .single();
    if (data?.guest_code && secretCode === data.guest_code) {
      Alert.alert('Success', 'Offline student access granted.');
      signInAsGuest();
    } else {
      Alert.alert('Error', 'Invalid secret code.');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ko' ? 'en' : 'ko';
    i18n.changeLanguage(newLang);
  };

  // 로그인 화면은 항상 Prussian Blue 다크 배경 고정
  const BG    = '#0A2342';
  const GOLD  = '#CAA876';
  const BORDER = 'rgba(255,255,255,0.12)';
  const PLACEHOLDER = 'rgba(255,255,255,0.30)';

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      {/* 시네마틱 히어로 배경 (다크 오버레이로 가독성 유지) */}
      <Image
        source={require('@/assets/images/login-hero.jpg')}
        style={styles.heroBg}
        contentFit="cover"
      />
      <View style={styles.heroOverlay} />
      {/* 언어 토글 */}
      <Pressable onPress={toggleLanguage} style={styles.languageToggle}>
        <ThemedText style={[styles.languageToggleText, { color: PLACEHOLDER }]}>
          {i18n.language === 'ko' ? 'EN' : 'KR'}
        </ThemedText>
      </Pressable>

      <View style={styles.formContainer}>
        {/* 로고 */}
        <View style={styles.logoBlock}>
          <ThemedText style={styles.logoEn}>ESPRIT</ThemedText>
          <ThemedText style={styles.logoKo}>에스프릿셰프 쿠킹아카데미</ThemedText>
        </View>

        {/* 이메일 로그인 섹션 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: PLACEHOLDER }]}>{t('member_login')}</ThemedText>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor={PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={[styles.input, { color: '#FFFFFF', borderBottomColor: BORDER }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={PLACEHOLDER}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { color: '#FFFFFF', borderBottomColor: BORDER }]}
          />
          <View style={styles.buttonRow}>
            {/* SIGN IN — gold fill */}
            <Pressable
              onPress={handleEmailLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.button, styles.halfButton,
                { backgroundColor: GOLD },
                pressed && { opacity: 0.85 }
              ]}
            >
              <ThemedText style={[styles.buttonText, { color: '#0A2342' }]}>
                {loading ? '···' : t('sign_in')}
              </ThemedText>
            </Pressable>

            {/* SIGN UP — outline */}
            <Pressable
              onPress={handleEmailSignUp}
              disabled={loading}
              style={({ pressed }) => [
                styles.button, styles.halfButton,
                { backgroundColor: 'transparent', borderWidth: 1, borderColor: GOLD },
                pressed && { opacity: 0.8 }
              ]}
            >
              <ThemedText style={[styles.buttonText, { color: GOLD }]}>
                {loading ? '···' : t('sign_up')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Google */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.googleButton,
              { borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.05)' },
              pressed && { opacity: 0.8 }
            ]}
          >
            <IconSymbol name="globe" size={16} color={PLACEHOLDER} style={{ marginRight: 8 }} />
            <ThemedText style={[styles.googleButtonText, { color: PLACEHOLDER }]}>
              {t('google_continue')}
            </ThemedText>
          </Pressable>
        </View>

        {/* OR 구분선 */}
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: BORDER }]} />
          <ThemedText style={[styles.orText, { color: PLACEHOLDER }]}>OR</ThemedText>
          <View style={[styles.divider, { backgroundColor: BORDER }]} />
        </View>

        {/* 오프라인 수강생 코드 입력 */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: PLACEHOLDER }]}>{t('offline_access')}</ThemedText>
          <TextInput
            placeholder={t('secret_code_placeholder')}
            placeholderTextColor={PLACEHOLDER}
            value={secretCode}
            onChangeText={setSecretCode}
            secureTextEntry
            style={[styles.inputCenter, { color: '#FFFFFF', borderColor: BORDER }]}
          />
          <Pressable
            onPress={handleSecretCodeLogin}
            style={({ pressed }) => [
              styles.outlineButton,
              { borderColor: GOLD },
              pressed && { opacity: 0.8 }
            ]}
          >
            <ThemedText style={[styles.outlineButtonText, { color: GOLD }]}>
              {t('enter_btn')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,35,66,0.55)',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageToggle: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 10,
  },
  languageToggleText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 40,
  },
  logoBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logoEn: {
    color: '#CAA876',       // gold-300
    fontSize: 36,
    letterSpacing: 12,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  logoKo: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    letterSpacing: 2,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 2,
  },
  input: {
    height: 48,
    borderBottomWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 1,
  },
  inputCenter: {
    height: 56,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 2,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 2,
  },
  googleButton: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  outlineButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  outlineButtonText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 11,
    letterSpacing: 2,
  },
});
