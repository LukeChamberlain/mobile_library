import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const AVATAR_BUCKET = 'avatars';
const PENDING_AVATAR_KEY = 'mobile-library-pending-avatar';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export type UserProfile = {
  name: string;
  firstName: string;
  email: string;
  avatarUrl: string | null;
};

export function getUserProfile(user: User): UserProfile {
  const metadata = user.user_metadata ?? {};
  const name = stringValue(metadata.full_name)
    || stringValue(metadata.name)
    || [stringValue(metadata.first_name), stringValue(metadata.last_name)].filter(Boolean).join(' ')
    || user.email?.split('@')[0]
    || 'Reader';
  const firstName = stringValue(metadata.given_name)
    || stringValue(metadata.first_name)
    || name.trim().split(/\s+/)[0]
    || 'Reader';

  return {
    name,
    firstName,
    email: user.email ?? '',
    avatarUrl: stringValue(metadata.avatar_url) || stringValue(metadata.picture) || null,
  };
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  validateAvatar(file);

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error: profileError } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
  if (profileError) throw profileError;
  return data.publicUrl;
}

export function validateAvatar(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.');
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('Choose an image smaller than 2 MB.');
  }
}

export async function savePendingAvatar(email: string, file: File): Promise<void> {
  validateAvatar(file);
  const dataUrl = await readFileAsDataUrl(file);
  localStorage.setItem(PENDING_AVATAR_KEY, JSON.stringify({ email: email.toLowerCase(), dataUrl, name: file.name }));
}

export async function uploadPendingAvatarFor(user: User): Promise<boolean> {
  const stored = localStorage.getItem(PENDING_AVATAR_KEY);
  if (!stored || !user.email) return false;

  const pending = JSON.parse(stored) as { email: string; dataUrl: string; name: string };
  if (pending.email !== user.email.toLowerCase()) return false;

  const response = await fetch(pending.dataUrl);
  const blob = await response.blob();
  const file = new File([blob], pending.name, { type: blob.type });
  await uploadProfilePhoto(user.id, file);
  localStorage.removeItem(PENDING_AVATAR_KEY);
  return true;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the selected photo.'));
    });
    reader.addEventListener('error', () => reject(new Error('Could not read the selected photo.')));
    reader.readAsDataURL(file);
  });
}
