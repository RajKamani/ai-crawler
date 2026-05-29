import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../utils/supabase';
import { useTheme } from '@/hooks/useTheme';

// Completes the OAuth session redirect handling for web/browser environments
WebBrowser.maybeCompleteAuthSession();

export const AuthScreen: React.FC = () => {
  const colors = useTheme();
  const isDark = colors.background === '#141313';
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
      } else {
        const redirectUrl = Linking.createURL('/');
        console.log('Signup Email Redirect URL:', redirectUrl);
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;

        // If email confirmation is enabled, guide the user
        if (data.session) {
          setErrorMsg(null);
        } else {
          setErrorMsg('Sign up successful! Please check your email for confirmation.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const redirectUrl = Linking.createURL('/');
      console.log('Google Auth Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No authentication URL returned from Supabase.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // 1. Check query parameters
        const parsedUrl = Linking.parse(result.url);
        if (parsedUrl.queryParams) {
          accessToken = parsedUrl.queryParams.access_token as string || null;
          refreshToken = parsedUrl.queryParams.refresh_token as string || null;
        }

        // 2. Check hash fragment (Supabase standard redirect)
        if (!accessToken || !refreshToken) {
          const hashIndex = result.url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = result.url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            accessToken = params.get('access_token');
            refreshToken = params.get('refresh_token');
          }
        }

        // 3. Manual hash parsing fallback
        if (!accessToken || !refreshToken) {
          const hashIndex = result.url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = result.url.substring(hashIndex + 1);
            const parts = hash.split('&');
            const params: Record<string, string> = {};
            parts.forEach((part) => {
              const [key, value] = part.split('=');
              if (key && value) {
                params[key] = decodeURIComponent(value);
              }
            });
            accessToken = params['access_token'] || null;
            refreshToken = params['refresh_token'] || null;
          }
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          throw new Error('Authentication tokens were not returned in the redirect URL.');
        }
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Google sign in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Text style={[styles.appName, { color: colors.text }]}>AI CONTENT CRAWLER</Text>
          <Text style={[styles.tagline, { color: colors.primary }]}>BRUTALIST TECH INTELLIGENCE AGGREGATOR</Text>
        </View>

        {/* Form Box */}
        <View style={[styles.formContainer, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </Text>

          {errorMsg && (
            <View style={[styles.errorBox, { backgroundColor: isDark ? '#2c1414' : '#fcf0ef', borderColor: colors.primary }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.primary} style={styles.errorIcon} />
              <Text style={[styles.errorText, { color: colors.primary }]}>{errorMsg}</Text>
            </View>
          )}

          {/* Google Sign In Button */}
          <Pressable
            style={[styles.googleButton, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.border }, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} style={styles.googleIcon} />
            <Text style={[styles.googleButtonText, { color: colors.text }]}>CONTINUE WITH GOOGLE</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.tabIconDefault }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Email field */}
          <Text style={[styles.label, { color: colors.primary }]}>EMAIL ADDRESS</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceContainer, color: colors.text }]}
            placeholder="developer@local.host"
            placeholderTextColor={colors.tabIconDefault}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {/* Password field */}
          <Text style={[styles.label, { color: colors.primary }]}>PASSWORD</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surfaceContainer, color: colors.text }]}
            placeholder="••••••••"
            placeholderTextColor={colors.tabIconDefault}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Submit Button */}
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderColor: colors.border, shadowColor: colors.border }, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>
                {mode === 'login' ? 'ENTER DASHBOARD' : 'SIGN UP'}
              </Text>
            )}
          </Pressable>

          {/* Toggle Mode Button */}
          <Pressable
            style={styles.toggleButton}
            onPress={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setErrorMsg(null);
            }}
          >
            <Text style={[styles.toggleButtonText, { color: colors.text }]}>
              {mode === 'login'
                ? 'Need an account? Sign up here'
                : 'Already have an account? Log in here'}
            </Text>
          </Pressable>
        </View>

        {/* Info Block */}
        <View style={styles.footerInfo}>
          <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>SECURED VIA SUPABASE CRYPTO PROTOCOLS</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 6,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    color: '#1c1b1b',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    color: '#bc000a',
    letterSpacing: 1,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fcf9f8',
    borderWidth: 2,
    borderColor: '#1c1b1b',
    padding: 24,
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'SpaceMono-Bold',
    color: '#1c1b1b',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    color: '#bc000a',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 2,
    borderColor: '#1c1b1b',
    backgroundColor: '#f0eded',
    paddingHorizontal: 12,
    marginBottom: 18,
    fontFamily: 'SpaceMono',
    fontSize: 14,
    color: '#1c1b1b',
  },
  button: {
    height: 48,
    backgroundColor: '#bc000a',
    borderWidth: 2,
    borderColor: '#1c1b1b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fcf9f8',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
  },
  toggleButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 12,
    fontFamily: 'SpaceMono',
    color: '#1c1b1b',
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: '#fcf0ef',
    borderWidth: 1,
    borderColor: '#bc000a',
    padding: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#bc000a',
    fontSize: 12,
    fontFamily: 'SpaceMono',
    flex: 1,
  },
  footerInfo: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    fontFamily: 'SpaceMono',
    color: '#926f6a',
  },
  googleButton: {
    height: 48,
    backgroundColor: '#fcf9f8',
    borderWidth: 2,
    borderColor: '#1c1b1b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#1c1b1b',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1c1b1b',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'SpaceMono-Bold',
    color: '#926f6a',
  },
});
