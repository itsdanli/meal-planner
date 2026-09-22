import { useEffect, useRef, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import App from './App';
import AuthPanel from './AuthPanel';
import { supabase } from './supabase';
import { loadCloudPlanner, saveCloudPlanner, normalizeWeek, CloudValidationError, type CloudSnapshot } from './cloud';
import type { PlannerState } from './types';

export default function ConnectedApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [authOpen, setAuthOpen] = useState(false);
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    // Let the SDK finish redirect recovery and initial session hydration before
    // displaying the sample. Never perform awaited auth work inside this callback.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
      if (next) setAuthOpen(false);
    });
    void supabase.auth.getSession().then(({ error }) => {
      if (error) { setSessionError(error.message); setReady(true); }
    }).catch(() => { setSessionError('Could not restore sign-in. Please try again.'); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <div className="connection-screen" role="status">Restoring your sign-in…</div>;
  if (session && supabase) return <CloudPlanner key={session.user.id} client={supabase} session={session} />;
  if (authOpen && supabase) return <AuthPanel client={supabase} onClose={() => setAuthOpen(false)} />;
  return <>{sessionError && <p role="alert" className="cloud-notice">{sessionError}</p>}<App key="sample" onSignIn={supabase ? () => setAuthOpen(true) : undefined} /></>;
}

function CloudPlanner({ client, session }: { client: SupabaseClient; session: Session }) {
  const [week, setWeek] = useState(() => normalizeWeek(new Date()));
  const [snapshot, setSnapshot] = useState<CloudSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [version, setVersion] = useState(0);
  const saveLock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSnapshot(null);
    setMessage('');
    setFailed(false);
    void loadCloudPlanner(client, session.user.id, week).then(result => {
      if (!active) return;
      setSnapshot(result);
      setVersion(v => v + 1);
    }).catch(error => {
      if (active) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Unable to load your household.'); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, session.user.id, week, reload]);

  async function signOut() {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { setMessage(`Sign-out failed: ${error.message}`); setFailed(true); }
  }
  async function save(state: PlannerState) {
    if (!snapshot || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setFailed(false);
    setMessage('Saving to your account…');
    try {
      const saved = await saveCloudPlanner(client, session.user.id, state, snapshot);
      setSnapshot(saved);
      setVersion(v => v + 1);
      setMessage('');
    } catch (error) {
      const validation = error instanceof CloudValidationError;
      setFailed(!validation);
      setMessage(validation ? error.message : `${error instanceof Error ? error.message : 'Save failed.'} Keep this tab open or export your list before reloading.`);
    } finally { saveLock.current = false; setSaving(false); }
  }
  if (loading) return <div className="connection-screen" role="status">Loading your household…</div>;
  if (!snapshot) return <div className="connection-screen"><h1>Let’s reconnect.</h1><p role="alert">{message}</p><button className="button primary" onClick={() => setReload(n => n + 1)}>Try again</button> <button className="button secondary" onClick={() => void signOut()}>Sign out</button></div>;
  return <App key={version} initialState={snapshot.state} account={session.user.email || 'Your household'}
    onSave={state => void save(state)} onSignOut={() => void signOut()} saving={saving}
    cloudMessage={message} cloudError={failed} onReload={() => setReload(n => n + 1)}
    onWeekChange={date => setWeek(normalizeWeek(date))} />;
}
