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
import { supabase } from '../utils/supabase';

export const AuthScreen: React.FC = () => {
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
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <Text style={styles.appName}>AI CONTENT CRAWLER</Text>
          <Text style={styles.tagline}>BRUTALIST TECH INTELLIGENCE AGGREGATOR</Text>
        </View>

        {/* Form Box */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </Text>

          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#bc000a" style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Email field */}
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="developer@local.host"
            placeholderTextColor="#926f6a"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {/* Password field */}
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#926f6a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Submit Button */}
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fcf9f8" />
            ) : (
              <Text style={styles.buttonText}>
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
            <Text style={styles.toggleButtonText}>
              {mode === 'login'
                ? 'Need an account? Sign up here'
                : 'Already have an account? Log in here'}
            </Text>
          </Pressable>
        </View>

        {/* Info Block */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>SECURED VIA SUPABASE CRYPTO PROTOCOLS</Text>
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
});
