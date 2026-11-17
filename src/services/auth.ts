import { supabase } from '../lib/supabase';
import { savePendingAvatar, uploadProfilePhoto } from './profile';

export async function authenticateWithEmail(
  fullName: string,
  email: string,
  password: string,
  createAccount: boolean,
  photo: File | null,
) {
  if (!supabase) return { error: new Error('Supabase is not configured.'), needsEmailConfirmation: false, photoMessage: '' };

  const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
  const lastName = lastNameParts.join(' ');
  const response = createAccount
    ? await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim(), first_name: firstName, last_name: lastName } },
      })
    : await supabase.auth.signInWithPassword({ email, password });

  let photoMessage = '';
  if (!response.error && createAccount && photo) {
    try {
      if (response.data.session && response.data.user) {
        await uploadProfilePhoto(response.data.user.id, photo);
      } else {
        await savePendingAvatar(email, photo);
      }
    } catch {
      photoMessage = ' Your account was created, but the photo could not be saved. Add it after signing in.';
    }
  }

  // Sign-up can create a session when Supabase email confirmation is disabled.
  // Keep the experience consistent by signing out after account creation.
  if (!response.error && createAccount && response.data.session) {
    await supabase.auth.signOut();
  }

  return {
    error: response.error,
    needsEmailConfirmation: createAccount && !response.data.session && !response.error,
    photoMessage,
  };
}

export async function authenticateWithGoogle() {
  if (!supabase) return { error: new Error('Supabase is not configured.') };

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'openid email profile',
    },
  });
  return { error };
}
