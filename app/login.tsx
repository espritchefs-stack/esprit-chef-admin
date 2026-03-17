import React, { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View, Alert } from 'react-native';
import { useAuth } from '@/ctx/auth';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

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

  const handleSecretCodeLogin = () => {
    if (secretCode === 'VIP123') { 
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

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Pressable onPress={toggleLanguage} style={styles.languageToggle}>
        <ThemedText style={styles.languageToggleText}>
          {i18n.language === 'ko' ? 'EN' : 'KR'}
        </ThemedText>
      </Pressable>

      <View style={styles.formContainer}>
        <ThemedText type="title" style={styles.header}>
          {t('app_title')}
        </ThemedText>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>MEMBER LOGIN</ThemedText>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={[styles.input, { color: textColor, borderBottomColor: borderColor }]}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={[styles.input, { color: textColor, borderBottomColor: borderColor }]}
          />
          <Pressable 
            onPress={handleEmailLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: textColor },
              pressed && { opacity: 0.8 }
            ]}
          >
            <ThemedText style={[styles.buttonText, { color: backgroundColor }]}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </ThemedText>
          </Pressable>

          {/* Placeholder for real OAuth */}
          <Pressable 
            style={({ pressed }) => [
              styles.googleButton,
              { borderColor },
              pressed && { opacity: 0.8 }
            ]}
          >
            <IconSymbol name="globe" size={16} color={textColor} style={{ marginRight: 8 }} />
            <ThemedText style={styles.googleButtonText}>CONTINUE WITH GOOGLE</ThemedText>
          </Pressable>
        </View>

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <ThemedText style={styles.orText}>OR</ThemedText>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>OFFLINE STUDENT ACCESS</ThemedText>
          <TextInput
            placeholder={t('secret_code_placeholder')}
            placeholderTextColor="#666"
            value={secretCode}
            onChangeText={setSecretCode}
            secureTextEntry
            style={[styles.inputCenter, { color: textColor, borderColor }]}
          />
          <Pressable 
            onPress={handleSecretCodeLogin}
            style={({ pressed }) => [
              styles.outlineButton,
              { borderColor },
              pressed && { opacity: 0.8 }
            ]}
          >
            <ThemedText style={styles.outlineButtonText}>{t('enter_btn')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
    opacity: 0.5,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 40,
  },
  header: {
    textAlign: 'center',
    letterSpacing: 8,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 2,
    opacity: 0.5,
  },
  input: {
    height: 48,
    borderBottomWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 1,
  },
  inputCenter: {
    height: 56,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 2,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 2,
  },
  googleButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 12,
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
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
    opacity: 0.5,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12,
    letterSpacing: 2,
  },
});
