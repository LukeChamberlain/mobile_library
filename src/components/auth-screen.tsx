import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';

export function AuthScreen() {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submitEmailAuth() {
    if (!supabase) {
      setMessage('Connect your Supabase project to enable sign-in.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMessage('Enter an email and a password with at least 6 characters.');
      return;
    }

    setBusy(true);
    setMessage('');
    const result = isCreatingAccount
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
    } else if (isCreatingAccount && !result.data.session) {
      setMessage('Account created. Check your email to confirm it, then sign in.');
    }
  }

  async function signInWithProvider(provider: Provider) {
    if (!supabase) {
      setMessage('Connect your Supabase project to enable sign-in.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const redirectTo = ExpoLinking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (error) throw error;

      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const callback = ExpoLinking.parse(result.url);
          const code = callback.queryParams?.code;
          if (typeof code === 'string') {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          }
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete sign-in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>YOUR PERSONAL READING SPACE</Text>
      <Text style={styles.title}>Mobile Library</Text>
      <Text style={styles.subtitle}>Sign in to start building your shelf.</Text>

      {!isSupabaseConfigured && (
        <Text style={styles.setupNotice}>
          Add your Supabase project URL and publishable key to .env.local to enable accounts.
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        style={styles.providerButton}
        onPress={() => signInWithProvider('google')}
        disabled={busy || !isSupabaseConfigured}>
        <Text style={styles.providerButtonText}>Continue with Google</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.providerButton}
        onPress={() => signInWithProvider('apple')}
        disabled={busy || !isSupabaseConfigured}>
        <Text style={styles.providerButtonText}>Continue with Apple</Text>
      </Pressable>

      <View style={styles.divider}><View style={styles.rule} /><Text style={styles.dividerText}>or use email</Text><View style={styles.rule} /></View>

      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor="#7c827c"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={isCreatingAccount ? 'new-password' : 'password'}
        secureTextEntry
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#7c827c"
        value={password}
        onChangeText={setPassword}
      />
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}

      <Pressable
        accessibilityRole="button"
        style={[styles.primaryButton, (busy || !isSupabaseConfigured) && styles.disabledButton]}
        onPress={submitEmailAuth}
        disabled={busy || !isSupabaseConfigured}>
        <Text style={styles.primaryButtonText}>
          {busy ? 'Please wait…' : isCreatingAccount ? 'Create account' : 'Sign in with email'}
        </Text>
      </Pressable>

      <Pressable onPress={() => { setIsCreatingAccount(!isCreatingAccount); setMessage(''); }}>
        <Text style={styles.switchText}>
          {isCreatingAccount ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: '#f5f4ef', paddingHorizontal: 24, paddingVertical: 36 },
  eyebrow: { color: '#617367', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#1f352a', fontSize: 34, fontWeight: '700', marginTop: 8 },
  subtitle: { color: '#626a63', fontSize: 16, marginTop: 8, marginBottom: 24 },
  setupNotice: { color: '#765b2d', backgroundColor: '#f2e9d5', borderRadius: 10, padding: 12, marginBottom: 16, lineHeight: 20 },
  providerButton: { height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 10 },
  providerButtonText: { color: '#25372c', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  rule: { flex: 1, height: 1, backgroundColor: '#d9ddd6' },
  dividerText: { color: '#758177', fontSize: 13 },
  input: { height: 50, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 15, color: '#1f352a', fontSize: 16, marginBottom: 10 },
  message: { color: '#8b4c39', lineHeight: 20, marginVertical: 8 },
  primaryButton: { height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#315c48', marginTop: 4 },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  switchText: { color: '#315c48', textAlign: 'center', fontSize: 14, fontWeight: '600', marginTop: 20 },
});
