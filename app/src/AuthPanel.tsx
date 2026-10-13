import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import './auth.css';

interface AuthPanelProps {
  client: SupabaseClient;
  onClose: () => void;
}

export default function AuthPanel({ client, onClose }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (error || confirmation) statusRef.current?.focus();
  }, [error, confirmation]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setConfirmation(false);
    try {
      const credentials = { email: email.trim(), password };
      const result = mode === 'signin'
        ? await client.auth.signInWithPassword(credentials)
        : await client.auth.signUp({
          ...credentials,
          // Keep a deployment subdirectory and discard query/hash parameters.
          options: { emailRedirectTo: new URL('./', window.location.href).href },
        });
      if (!mounted.current) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setPassword('');
      if (result.data.session) {
        onClose();
      } else if (mode === 'signup') {
        setConfirmation(true);
      } else {
        setError('Sign-in did not return a session. Please try again.');
      }
    } catch {
      if (mounted.current) setError('We couldn’t reach the sign-in service. Check your connection and try again.');
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function switchMode() {
    if (inFlight.current) return;
    setMode(current => current === 'signin' ? 'signup' : 'signin');
    setPassword('');
    setError('');
    setConfirmation(false);
  }

  return <section className="auth-page" aria-labelledby="auth-title">
    <div className="auth-card">
      <button className="auth-back" type="button" onClick={onClose} disabled={busy}>← Back to planner</button>
      <span className="auth-mark">wmp</span>
      <h1 id="auth-title">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
      <p className="auth-description">{mode === 'signin'
        ? 'Your meal plan and pantry, saved to your account.'
        : 'Keep your meal plan and pantry in sync across devices.'}</p>
      {confirmation ? <div className="auth-confirmation" ref={statusRef} role="status" tabIndex={-1}>
        <h2>Check your inbox.</h2>
        <p>If this address can be registered, a confirmation link will arrive by email. Follow it to finish setting up your account. Check spam if you don’t see it.</p>
        <p>Already have an account? You can sign in below.</p>
      </div> : <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
          value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} autoFocus />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={event => setPassword(event.target.value)} minLength={8} required disabled={busy}
          aria-describedby={mode === 'signup' ? 'auth-password-help' : undefined} />
        {mode === 'signup' && <p className="auth-help" id="auth-password-help">Use at least 8 characters.</p>}
        {error && <div className="auth-error" ref={statusRef} role="alert" tabIndex={-1}>{error}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
          {!busy && <span aria-hidden="true">→</span>}
        </button>
      </form>}
      <div className="auth-switch">
        <span>{mode === 'signin' ? 'New to weeknight?' : 'Already have an account?'}</span>
        <button type="button" onClick={switchMode} disabled={busy}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button>
      </div>
    </div>
  </section>;
}
