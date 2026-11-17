import { useEffect, useState, type FormEvent } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { MAX_AVATAR_SIZE, validateAvatar } from '../../services/profile';

type AuthViewProps = {
  onSubmit: (fullName: string, email: string, password: string, createAccount: boolean, photo: File | null) => Promise<{
    accountCreated: true;
    emailConfirmationRequired: boolean;
    email: string;
    photoMessage: string;
  } | void>;
  onGoogle: () => Promise<void>;
  message: string;
  busy: boolean;
};

export function AuthView({ onSubmit, onGoogle, message, busy }: AuthViewProps) {
  const [createAccount, setCreateAccount] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [confirmation, setConfirmation] = useState<{
    emailConfirmationRequired: boolean;
    email: string;
    photoMessage: string;
  } | null>(null);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const passwordRules = [
    { label: 'At least 9 characters', valid: password.length >= 9 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /\d/.test(password) },
    { label: 'One special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const passwordIsValid = passwordRules.every((rule) => rule.valid);
  const passwordsMatch = password === passwordConfirmation;
  const monogram = fullName.trim().charAt(0).toUpperCase() || 'M';

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (!selected) return;

    try {
      validateAvatar(selected);
      setPhoto(selected);
      setFormError('');
    } catch (error) {
      setPhoto(null);
      setFormError(error instanceof Error ? error.message : 'Choose a valid photo.');
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();

    if (createAccount) {
      if (!fullName.trim()) {
        setFormError('Enter your name to create an account.');
        return;
      }
      if (!passwordIsValid) {
        setFormError('Your password needs to meet each requirement below.');
        return;
      }
      if (!passwordsMatch) {
        setFormError('The passwords do not match.');
        return;
      }
    }

    void onSubmit(fullName.trim(), email, password, createAccount, photo).then((result) => {
      if (!result?.accountCreated) return;
      setCreateAccount(false);
      setFullName('');
      setPassword('');
      setPasswordConfirmation('');
      setPhoto(null);
      setFormError('');
      setConfirmation({
        emailConfirmationRequired: result.emailConfirmationRequired,
        email: result.email,
        photoMessage: result.photoMessage,
      });
    });
  }

  function switchForm() {
    setCreateAccount(!createAccount);
    setFormError('');
    setPassword('');
    setPasswordConfirmation('');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <a className="brand auth-brand" href="#top"><span className="brand-mark"><img src="/blue-ribbon-logo.webp" alt="" /></span> Blue Ribbon</a>
        <p className="eyebrow">A BETTER KIND OF BOOK FIND</p>
        <h1>{createAccount ? 'Create your account' : 'Welcome back'}</h1>
        <p className="subtitle">{createAccount ? 'Set up your profile and start building your shelf.' : 'Sign in to start building your shelf.'}</p>
        {!isSupabaseConfigured && <p className="setup-notice">Add your Supabase URL and publishable key to .env.local to enable accounts.</p>}
        <button className="provider-button" type="button" onClick={() => void onGoogle()} disabled={!isSupabaseConfigured || busy}>
          Continue with Google
        </button>
        <div className="divider"><span>or use email</span></div>

        <form onSubmit={handleSubmit}>
          {createAccount && <>
            <label className="field-label" htmlFor="full-name">Name</label>
            <input
              id="full-name"
              name="fullName"
              autoComplete="name"
              placeholder="Your first and last name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
            <div className="avatar-picker">
              {previewUrl
                ? <img className="avatar avatar-preview" src={previewUrl} alt="Selected profile photo preview" />
                : <div className="avatar avatar-monogram" aria-label={`Profile monogram ${monogram}`}>{monogram}</div>}
              <div className="avatar-controls">
                <label className="field-label" htmlFor="profile-photo">Profile photo <span>(optional)</span></label>
                <input id="profile-photo" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                <small>JPG, PNG, or WebP · up to {MAX_AVATAR_SIZE / 1024 / 1024} MB</small>
              </div>
              {photo && <button type="button" className="remove-photo" onClick={() => setPhoto(null)}>Remove</button>}
            </div>
          </>}

          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={createAccount ? 'new-password' : 'current-password'}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {createAccount && <>
            <ul className="password-rules" aria-label="Password requirements">
              {passwordRules.map((rule) => <li className={rule.valid ? 'valid' : ''} key={rule.label}>
                <span aria-hidden="true">{rule.valid ? '✓' : '○'}</span>{rule.label}
              </li>)}
            </ul>
            <label className="field-label" htmlFor="password-confirmation">Confirm password</label>
            <input
              id="password-confirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
            />
            {passwordConfirmation && <small className={passwordsMatch ? 'match-message valid' : 'match-message'}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </small>}
          </>}

          {(formError || message) && <p className="notice" role="status">{formError || message}</p>}
          <button className="primary-button full-width" type="submit" disabled={!isSupabaseConfigured || busy}>
            {busy ? 'Please wait…' : createAccount ? 'Create account' : 'Sign in with email'}
          </button>
        </form>

        <button className="switch-button" type="button" onClick={switchForm}>
          {createAccount ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </section>
      {confirmation && <div className="modal-backdrop">
        <section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <div className="confirmation-mark" aria-hidden="true">✓</div>
          <h2 id="confirmation-title">{confirmation.emailConfirmationRequired ? 'Check your email' : 'Account ready'}</h2>
          <p>{confirmation.emailConfirmationRequired
            ? <>If a new account was created for <strong>{confirmation.email}</strong>, check that inbox for a confirmation link. If you already use Google with this email, close this message and choose Continue with Google.</>
            : <>Your account is ready. Sign in with <strong>{confirmation.email}</strong> to continue.</>}</p>
          {confirmation.photoMessage && <p className="modal-note">{confirmation.photoMessage.trim()}</p>}
          <button className="primary-button full-width" type="button" onClick={() => setConfirmation(null)}>Go to sign in</button>
        </section>
      </div>}
    </main>
  );
}
