import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDriveDownload,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Unplug,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from './SEOHead';
import bundledFixtureXml from '../fixtures/utilityapi-demo-green-button.xml?raw';
import { getSupabaseConfig, isEdgeFetchEnabled } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import {
  activateUtilityApiDemo,
  pollUtilityApiDemo,
  revokeUtilityApiDemo,
  startUtilityApiDemo,
  syncUtilityApiDemo,
} from '../lib/utilityApiDemoClient';
import {
  buildUtilityApiDemoSessionFromXml,
  createEmptyUtilityApiDemoSession,
  createUtilityApiDemoSessionId,
  DEFAULT_UTILITY_API_DEMO_SCENARIO,
  deriveUtilityApiDemoStatus,
  hydrateUtilityApiDemoSession,
  trimUtilityApiDemoError,
  type UtilityApiDemoEdgePayload,
  type UtilityApiDemoPollPhase,
  type UtilityApiDemoSessionRecord,
  type UtilityApiDemoStatus,
} from '../lib/utilityApiDemo';
import {
  clearAllUtilityApiDemoSessions,
  clearActiveUtilityApiDemoPointer,
  deleteUtilityApiDemoSession,
  loadActiveUtilityApiDemoPointer,
  loadUtilityApiDemoSession,
  pruneUtilityApiDemoSessions,
  saveUtilityApiDemoSession,
} from '../lib/utilityApiDemoStorage';

const FEATURE_FLAG_ENABLED = import.meta.env.VITE_ENABLE_UTILITYAPI_DEMO === 'true';
const SUPABASE_AUTH_CONFIGURED = Boolean(getSupabaseConfig().url && getSupabaseConfig().anonKey);
const AUTH_DISCOVERY_DELAYS = [2, 4, 8, 15];
const COLLECTION_DELAYS = [5, 10, 15, 20];
const AUTH_PHASE_LIMIT_MS = 90 * 1000;
const COLLECTION_PHASE_LIMIT_MS = 180 * 1000;
const SYNC_PHASE_LIMIT_MS = 180 * 1000;
const FIXTURE_REPLAY_RECOVERY_CODES = new Set([
  'live_disabled',
  'rate_limiter_unavailable',
  'rate_limiter_failed',
  'operator_not_allowlisted',
  'monthly_start_budget_exhausted',
  'missing_operator_token',
  'invalid_operator_token',
]);

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
}

function buildStatusLabel(session: UtilityApiDemoSessionRecord | null): string {
  if (!session) return 'idle';
  return session.status.replace(/_/g, ' ');
}

function buildPhaseLabel(phase: UtilityApiDemoPollPhase): string {
  return phase.replace(/_/g, ' ');
}

function scheduleDelaySeconds(
  phase: UtilityApiDemoPollPhase,
  attemptCount: number,
  retryAfterSeconds: number | null,
): number {
  if (phase === 'sync') {
    return Math.max(retryAfterSeconds ?? 5, 5);
  }
  const delays = phase === 'authorization' ? AUTH_DISCOVERY_DELAYS : COLLECTION_DELAYS;
  return delays[Math.min(attemptCount, delays.length - 1)];
}

function phaseLimitMs(phase: UtilityApiDemoPollPhase): number {
  switch (phase) {
    case 'authorization':
      return AUTH_PHASE_LIMIT_MS;
    case 'collection':
      return COLLECTION_PHASE_LIMIT_MS;
    case 'sync':
      return SYNC_PHASE_LIMIT_MS;
    default:
      return 0;
  }
}

function schedulePolling(
  session: UtilityApiDemoSessionRecord,
  phase: UtilityApiDemoPollPhase,
  delaySeconds: number,
  resetPhase = false,
): UtilityApiDemoSessionRecord {
  const phaseStartedAt = resetPhase || !session.phaseStartedAt ? new Date().toISOString() : session.phaseStartedAt;
  const phaseAttemptCount = resetPhase ? 0 : session.phaseAttemptCount + 1;
  return hydrateUtilityApiDemoSession(session, {
    pollPhase: phase,
    phaseStartedAt,
    phaseAttemptCount,
    nextPollAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    retryAfterSeconds: delaySeconds,
  });
}

function stopPolling(
  session: UtilityApiDemoSessionRecord,
  phase: UtilityApiDemoPollPhase = 'stopped',
): UtilityApiDemoSessionRecord {
  return hydrateUtilityApiDemoSession(session, {
    pollPhase: phase,
    nextPollAt: null,
    phaseStartedAt: null,
    phaseAttemptCount: 0,
    retryAfterSeconds: null,
  });
}

function describeTerminalReason(reason: string | null): string {
  switch (reason) {
    case 'pending_manual_after':
      return 'UtilityAPI requires a manual step before the DEMO authorization can proceed.';
    case 'wait_to_login_after':
      return 'UtilityAPI is waiting for a login or external completion step.';
    case 'no_intervals':
      return 'The Green Button batch is valid but currently contains no interval readings.';
    case 'badlogin_after':
      return 'UtilityAPI reported a bad-login style failure for the DEMO authorization.';
    case 'revoked':
      return 'The DEMO authorization has been revoked.';
    case 'errored':
      return 'UtilityAPI returned an unrecoverable authorization or collection error.';
    default:
      return 'Polling has stopped and requires operator review.';
  }
}

function shouldStopPhase(session: UtilityApiDemoSessionRecord): boolean {
  if (!session.phaseStartedAt) return false;
  const elapsed = Date.now() - Date.parse(session.phaseStartedAt);
  const limit = phaseLimitMs(session.pollPhase);
  return limit > 0 && elapsed >= limit;
}

function summarizeEdgeError(payload: UtilityApiDemoEdgePayload): string {
  if (!payload.error) {
    return 'UtilityAPI demo action failed.';
  }
  if (payload.retry_after_seconds) {
    return `${payload.error} Retry after ${payload.retry_after_seconds} seconds.`;
  }
  return payload.error;
}

function shouldOfferFixtureReplayForEdgePayload(payload: UtilityApiDemoEdgePayload): boolean {
  if (payload.terminal_reason === 'no_intervals') return true;
  if (!payload.code) return false;
  return FIXTURE_REPLAY_RECOVERY_CODES.has(payload.code);
}

const UtilityApiDemoPage: React.FC = () => {
  const [session, setSession] = useState<UtilityApiDemoSessionRecord | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [showFixtureReplayRecovery, setShowFixtureReplayRecovery] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorSession, setOperatorSession] = useState<Session | null>(null);
  const timerRef = useRef<number | null>(null);
  const edgeEnabled = isEdgeFetchEnabled();
  const liveControlsVisible = Boolean(operatorSession?.access_token);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await pruneUtilityApiDemoSessions();
      const activePointer = loadActiveUtilityApiDemoPointer();
      if (!activePointer?.sessionId) return;
      const loadedSession = await loadUtilityApiDemoSession(activePointer.sessionId);
      if (cancelled) return;
      if (loadedSession) {
        setSession(loadedSession);
      } else {
        clearActiveUtilityApiDemoPointer();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!SUPABASE_AUTH_CONFIGURED) {
      return undefined;
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthNotice('Supabase Auth session could not be restored for operator live mode.');
        return;
      }
      setOperatorSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sessionSnapshot) => {
      if (!mounted) return;
      setOperatorSession(sessionSnapshot);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!session || !edgeEnabled || isBusy || !session.nextPollAt || session.pollPhase === 'idle' || session.pollPhase === 'stopped') {
      return undefined;
    }

    const msUntilNextPoll = Math.max(Date.parse(session.nextPollAt) - Date.now(), 0);
    timerRef.current = window.setTimeout(() => {
      void runAutomaticStep(session);
    }, msUntilNextPoll);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [edgeEnabled, isBusy, session]);

  const intervalPreview = useMemo(() => (
    session?.parsedRows.slice(-48).map((row) => ({
      timestamp: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      demand_mw: row.demand_mw,
    })) ?? []
  ), [session?.parsedRows]);

  const isUpsampled = useMemo(
    () => session?.parsedRows.some((row) => row.quality_flags?.includes('upsampled_15min')) ?? false,
    [session?.parsedRows],
  );

  const forecastPreview = useMemo(() => {
    const yearly = session?.forecastPackage?.cases.expected.yearly ?? [];
    return yearly.map((row) => ({
      year: `Y${row.year}`,
      peak: row.peak_demand_mw,
      energy: row.annual_energy_gwh,
    }));
  }, [session?.forecastPackage]);

  const persistSession = async (nextSession: UtilityApiDemoSessionRecord) => {
    const { quotaExceeded } = await saveUtilityApiDemoSession(nextSession);
    setSession(nextSession);
    if (quotaExceeded) {
      setQuotaWarning('IndexedDB quota was exceeded. The active session pointer is preserved, but replay or reload may be required after refresh.');
    } else {
      setQuotaWarning(null);
    }
  };

  const withBusy = async (task: () => Promise<void>) => {
    setIsBusy(true);
    setNotice(null);
    setShowFixtureReplayRecovery(false);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  };

  const ensureLiveAccess = (): boolean => {
    if (!edgeEnabled) {
      setNotice('Live UtilityAPI actions are unavailable in the current environment. Use Fixture Replay to validate the parser and sales-demo surface offline.');
      setShowFixtureReplayRecovery(true);
      return false;
    }
    if (!SUPABASE_AUTH_CONFIGURED) {
      setNotice('Supabase Auth is not configured for operator live mode. Keep using Fixture Replay until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.');
      setShowFixtureReplayRecovery(true);
      return false;
    }
    if (!operatorSession?.access_token) {
      setNotice('Operator live mode requires an active Supabase magic-link session. Sign in from the Operator Live Access panel to continue.');
      setShowFixtureReplayRecovery(true);
      return false;
    }
    setShowFixtureReplayRecovery(false);
    return true;
  };

  const applyPollResponse = async (
    currentSession: UtilityApiDemoSessionRecord,
    response: UtilityApiDemoEdgePayload,
    originPhase: UtilityApiDemoPollPhase,
  ) => {
    const nextStatus = deriveUtilityApiDemoStatus(response, currentSession.status);
    let nextSession = hydrateUtilityApiDemoSession(currentSession, {
      status: nextStatus,
      authorizationUid: response.authorization_uid ?? currentSession.authorizationUid,
      referral: response.referral ?? currentSession.referral,
      meterUids: response.meter_uids ?? currentSession.meterUids,
      meterStates: response.meter_states ?? currentSession.meterStates,
      revoked: Boolean(response.revoked),
      lastError: null,
      terminalReason: response.terminal_reason ?? null,
      canActivate: Boolean(response.can_activate),
      canSync: Boolean(response.can_sync),
      retryAfterSeconds: response.next_poll_after_seconds ?? null,
    });

    if (nextStatus === 'pending_manual' || nextStatus === 'wait_to_login' || nextStatus === 'revoked' || nextStatus === 'error') {
      nextSession = stopPolling(nextSession);
      await persistSession(nextSession);
      setNotice(describeTerminalReason(nextSession.terminalReason));
      setShowFixtureReplayRecovery(nextSession.terminalReason === 'no_intervals');
      return;
    }

    if (nextStatus === 'no_intervals') {
      nextSession = stopPolling(nextSession);
      await persistSession(nextSession);
      setNotice('UtilityAPI reports that the batch is ready but contains no intervals. Use Fixture Replay to keep the sales demo flowing.');
      setShowFixtureReplayRecovery(true);
      return;
    }

    if (nextStatus === 'collection_ready' && nextSession.authorizationUid) {
      nextSession = schedulePolling(nextSession, 'sync', 0, true);
      await persistSession(nextSession);
      setNotice('Collection is ready. Auto-sync is queued for the full Green Button batch.');
      return;
    }

    if (nextStatus === 'meters_discovered') {
      nextSession = stopPolling(nextSession, 'idle');
      await persistSession(nextSession);
      setNotice('Authorization and meters are ready. Activate the 3-month collection when you want live history.');
      return;
    }

    if (nextStatus === 'auth_pending' || nextStatus === 'collection_pending') {
      const phase = nextStatus === 'auth_pending' ? 'authorization' : 'collection';
      nextSession = schedulePolling(
        nextSession,
        phase,
        scheduleDelaySeconds(phase, nextSession.phaseAttemptCount, response.next_poll_after_seconds ?? null),
      );
      if (shouldStopPhase(nextSession)) {
        nextSession = stopPolling(nextSession);
      await persistSession(nextSession);
      setNotice(`Auto-polling paused after the ${phase} window elapsed. Use Resume polling or Poll now to continue.`);
      setShowFixtureReplayRecovery(false);
      return;
    }
    await persistSession(nextSession);
    setNotice(originPhase === 'authorization'
      ? 'Authorization is still materializing. Auto-poll will continue within the bounded backoff window.'
      : 'Historical collection is still pending. Auto-poll will continue until the ready or timeout state is reached.');
    setShowFixtureReplayRecovery(false);
    return;
  }

  await persistSession(nextSession);
  setNotice('Authorization and meter state refreshed.');
  setShowFixtureReplayRecovery(false);
};

  const performPoll = async (currentSession: UtilityApiDemoSessionRecord, originPhase: UtilityApiDemoPollPhase) => {
    const response = await pollUtilityApiDemo({
      referral: currentSession.referral,
      authorizationUid: currentSession.authorizationUid,
    });
    if (response.error) {
      const errored = stopPolling(hydrateUtilityApiDemoSession(currentSession, {
        status: 'error',
        lastError: summarizeEdgeError(response),
        terminalReason: response.terminal_reason ?? 'errored',
      }));
      await persistSession(errored);
      setNotice(summarizeEdgeError(response));
      setShowFixtureReplayRecovery(shouldOfferFixtureReplayForEdgePayload(response));
      return;
    }
    await applyPollResponse(currentSession, response, originPhase);
  };

  const performSync = async (currentSession: UtilityApiDemoSessionRecord) => {
    if (!currentSession.authorizationUid) return;
    const response = await syncUtilityApiDemo({
      authorizationUid: currentSession.authorizationUid,
    });

    if (response.pending) {
      let pendingSession = hydrateUtilityApiDemoSession(currentSession, {
        status: deriveUtilityApiDemoStatus(response, currentSession.status),
        retryAfterSeconds: response.retry_after_seconds ?? 5,
      });
      pendingSession = schedulePolling(
        pendingSession,
        'sync',
        scheduleDelaySeconds('sync', pendingSession.phaseAttemptCount, response.retry_after_seconds ?? 5),
      );
      if (shouldStopPhase(pendingSession)) {
        pendingSession = stopPolling(pendingSession);
        await persistSession(pendingSession);
        setNotice('Auto-sync paused after the bounded sync window elapsed. Use Resume polling or Download XML & Build Forecast to continue.');
        setShowFixtureReplayRecovery(false);
        return;
      }
      await persistSession(pendingSession);
      setNotice(`Green Button XML is still being prepared. Auto-sync will retry after ${response.retry_after_seconds ?? 5} seconds.`);
      setShowFixtureReplayRecovery(false);
      return;
    }

    if (response.error || !response.raw_xml) {
      const errored = stopPolling(hydrateUtilityApiDemoSession(currentSession, {
        status: deriveUtilityApiDemoStatus(response, currentSession.status),
        lastError: summarizeEdgeError(response),
        terminalReason: response.terminal_reason ?? 'errored',
      }));
      await persistSession(errored);
      setNotice(summarizeEdgeError(response));
      setShowFixtureReplayRecovery(shouldOfferFixtureReplayForEdgePayload(response));
      return;
    }

    const syncedSession = buildUtilityApiDemoSessionFromXml({
      sessionId: currentSession.sessionId,
      mode: 'live',
      status: 'synced',
      scenario: currentSession.scenario,
      rawXml: response.raw_xml,
      referral: currentSession.referral,
      authorizationUid: currentSession.authorizationUid,
      meterUids: response.meter_uids ?? currentSession.meterUids,
      meterStates: response.meter_states ?? currentSession.meterStates,
      collectionDurationMonths: currentSession.collectionDurationMonths,
    });
    const finalized = stopPolling(hydrateUtilityApiDemoSession(syncedSession, {
      canActivate: currentSession.canActivate,
      canSync: false,
      terminalReason: syncedSession.status === 'no_intervals' ? 'no_intervals' : null,
    }), 'idle');
    await persistSession(finalized);
    setNotice(finalized.status === 'no_intervals'
      ? 'Green Button XML downloaded successfully but contained no interval rows. Fixture Replay remains available as the fallback demo path.'
      : 'Green Button XML downloaded and parsed locally. Heavy artifacts are persisted to IndexedDB.');
    setShowFixtureReplayRecovery(finalized.status === 'no_intervals');
  };

  const runAutomaticStep = async (sessionSnapshot: UtilityApiDemoSessionRecord) => {
    if (!ensureLiveAccess()) {
      if (sessionSnapshot.pollPhase !== 'idle' && sessionSnapshot.pollPhase !== 'stopped') {
        await persistSession(stopPolling(sessionSnapshot));
      }
      return;
    }
    await withBusy(async () => {
      if (sessionSnapshot.pollPhase === 'sync' || (sessionSnapshot.canSync && !sessionSnapshot.rawXml)) {
        await performSync(sessionSnapshot);
      } else {
        await performPoll(sessionSnapshot, sessionSnapshot.pollPhase === 'collection' ? 'collection' : 'authorization');
      }
    });
  };

  const handleFixtureReplay = () => withBusy(async () => {
    const sessionId = createUtilityApiDemoSessionId();
    const replaySession = buildUtilityApiDemoSessionFromXml({
      sessionId,
      mode: 'fixture',
      status: 'replayed',
      scenario: DEFAULT_UTILITY_API_DEMO_SCENARIO,
      rawXml: bundledFixtureXml,
    });
    await persistSession(replaySession);
    setNotice('Bundled fixture replay loaded without any edge-network request.');
    setShowFixtureReplayRecovery(false);
  });

  const handleStartLive = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    const sessionId = createUtilityApiDemoSessionId();
    const emptySession = createEmptyUtilityApiDemoSession(
      sessionId,
      'live',
      'auth_pending',
      DEFAULT_UTILITY_API_DEMO_SCENARIO,
    );
    setSession(emptySession);
    const { quotaExceeded } = await saveUtilityApiDemoSession(emptySession);
    if (quotaExceeded) {
      setQuotaWarning('IndexedDB quota was exceeded. The active session pointer is preserved, but replay or reload may be required after refresh.');
    } else {
      setQuotaWarning(null);
    }

    const response = await startUtilityApiDemo(DEFAULT_UTILITY_API_DEMO_SCENARIO);
    if (response.error) {
      const errored = stopPolling(hydrateUtilityApiDemoSession(emptySession, {
        status: 'error',
        lastError: summarizeEdgeError(response),
      }));
      await persistSession(errored);
      setNotice(summarizeEdgeError(response));
      setShowFixtureReplayRecovery(shouldOfferFixtureReplayForEdgePayload(response));
      return;
    }

    await applyPollResponse(emptySession, response, 'authorization');
    if (response.reused) {
      setNotice('Reused the existing operator DEMO authorization and refreshed its live UtilityAPI state.');
    } else if ((response.stage ?? 'authorization_pending') === 'authorization_pending') {
      setNotice('UtilityAPI DEMO authorization created. Auto-poll has started for authorization discovery.');
    }
    setShowFixtureReplayRecovery(false);
  });

  const handlePollNow = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session) return;
    if (session.canSync && !session.rawXml) {
      await performSync(session);
      return;
    }
    await performPoll(session, session.pollPhase === 'collection' ? 'collection' : 'authorization');
  });

  const handleResumePolling = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session) return;
    if (session.status === 'auth_pending') {
      const resumed = schedulePolling(stopPolling(session, 'authorization'), 'authorization', 0, true);
      await persistSession(resumed);
      setNotice('Authorization polling resumed.');
      setShowFixtureReplayRecovery(false);
      return;
    }
    if (session.status === 'collection_pending') {
      const resumed = schedulePolling(stopPolling(session, 'collection'), 'collection', 0, true);
      await persistSession(resumed);
      setNotice('Collection polling resumed.');
      setShowFixtureReplayRecovery(false);
      return;
    }
    if (session.status === 'collection_ready' || (session.canSync && !session.rawXml)) {
      const resumed = schedulePolling(stopPolling(session, 'sync'), 'sync', 0, true);
      await persistSession(resumed);
      setNotice('XML sync polling resumed.');
      setShowFixtureReplayRecovery(false);
      return;
    }
    setNotice('There is no resumable live polling phase for the current session.');
    setShowFixtureReplayRecovery(false);
  });

  const handleStopPolling = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session) return;
    await persistSession(stopPolling(session));
    setNotice('Auto-polling stopped. Use Resume polling or Poll now to continue.');
    setShowFixtureReplayRecovery(false);
  });

  const handleActivate = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session?.authorizationUid || session.meterUids.length === 0) return;
    const response = await activateUtilityApiDemo({
      authorizationUid: session.authorizationUid,
      meterUids: session.meterUids,
    });
    if (response.error) {
      const errored = stopPolling(hydrateUtilityApiDemoSession(session, {
        status: 'error',
        lastError: summarizeEdgeError(response),
      }));
      await persistSession(errored);
      setNotice(summarizeEdgeError(response));
      setShowFixtureReplayRecovery(shouldOfferFixtureReplayForEdgePayload(response));
      return;
    }

    const nextSession = schedulePolling(hydrateUtilityApiDemoSession(session, {
      status: 'collection_pending',
      collectionDurationMonths: Number(response.collection_duration_months ?? 3),
      canActivate: true,
      canSync: false,
      lastError: null,
      terminalReason: null,
    }), 'collection', scheduleDelaySeconds('collection', 0, response.next_poll_after_seconds ?? 5), true);
    await persistSession(nextSession);
    setNotice('Historical collection requested with a hard 3-month cap. Auto-poll is now watching for collection readiness.');
    setShowFixtureReplayRecovery(false);
  });

  const handleSync = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session) return;
    await performSync(session);
  });

  const handleRevoke = () => withBusy(async () => {
    if (!ensureLiveAccess()) return;
    if (!session?.authorizationUid) return;
    const response = await revokeUtilityApiDemo({
      authorizationUid: session.authorizationUid,
    });
    if (response.error) {
      const errored = stopPolling(hydrateUtilityApiDemoSession(session, {
        status: 'error',
        lastError: summarizeEdgeError(response),
      }));
      await persistSession(errored);
      setNotice(summarizeEdgeError(response));
      setShowFixtureReplayRecovery(shouldOfferFixtureReplayForEdgePayload(response));
      return;
    }
    await persistSession(stopPolling(hydrateUtilityApiDemoSession(session, {
      status: 'revoked',
      revoked: true,
      terminalReason: 'revoked',
      lastError: null,
    }), 'idle'));
    setNotice('UtilityAPI demo authorization revoked.');
    setShowFixtureReplayRecovery(false);
  });

  const handleSendMagicLink = async () => {
    const normalizedEmail = operatorEmail.trim().toLowerCase();
    if (!SUPABASE_AUTH_CONFIGURED) {
      setAuthNotice('Supabase Auth is not configured for operator live mode in this environment.');
      return;
    }
    if (!normalizedEmail) {
      setAuthNotice('Enter an operator email address before requesting a magic link.');
      return;
    }

    setIsSendingMagicLink(true);
    setAuthNotice(null);
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/utilityapi-demo`
        : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      if (error) {
        setAuthNotice(error.message.trim() || 'Magic-link sign-in failed.');
        return;
      }
      setAuthNotice(`Magic link sent to ${normalizedEmail}. Open it on this device to unlock live UtilityAPI actions.`);
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleOperatorSignOut = async () => {
    if (!SUPABASE_AUTH_CONFIGURED) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthNotice(error.message.trim() || 'Operator sign-out failed.');
      return;
    }
    setAuthNotice('Operator session cleared. Fixture Replay remains available publicly.');
  };

  const handleDeleteSession = () => withBusy(async () => {
    if (!session) return;
    await deleteUtilityApiDemoSession(session.sessionId);
    setSession(null);
    setNotice('Demo session removed from IndexedDB and sessionStorage.');
  });

  const handleClearAll = () => withBusy(async () => {
    await clearAllUtilityApiDemoSessions();
    setSession(null);
    setNotice('All UtilityAPI demo sessions cleared.');
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="utilityapi-demo-page">
      <SEOHead
        title="UtilityAPI Demo Lane | CEIP"
        description="Separate UtilityAPI-backed sales demo for Green Button XML rehearsal without changing London Hydro readiness."
        path="/utilityapi-demo"
      />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              <ShieldAlert className="h-4 w-4" />
              UtilityAPI DEMO only
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">UtilityAPI Demo Lane</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Separate sales-demo route for UtilityAPI DEMO authorizations and Green Button XML replay. This surface does not
                unlock London Hydro or Alectra submission readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700 px-3 py-1">Not London Hydro readiness</span>
              <span className="rounded-full border border-slate-700 px-3 py-1">Not Alectra readiness</span>
              <span className="rounded-full border border-slate-700 px-3 py-1">3-month live collection cap</span>
              <span className="rounded-full border border-slate-700 px-3 py-1">Fixture replay is fully client-bundled</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <div className="font-medium text-slate-100">Current state</div>
            <div className="mt-2">Status: <span className="font-semibold uppercase tracking-[0.18em] text-cyan-300">{buildStatusLabel(session)}</span></div>
            <div>Mode: <span className="font-medium">{session?.mode ?? 'none'}</span></div>
            <div>Edge live mode: <span className="font-medium">{edgeEnabled ? 'reachable' : 'disabled'}</span></div>
            <div>Operator auth: <span className="font-medium">{SUPABASE_AUTH_CONFIGURED ? 'configured' : 'missing'}</span></div>
            <div>Operator session: <span className="font-medium">{liveControlsVisible ? 'active' : 'required for live mode'}</span></div>
            <div>Auto phase: <span className="font-medium">{session ? buildPhaseLabel(session.pollPhase) : 'none'}</span></div>
            <div>Navigation flag: <span className="font-medium">{FEATURE_FLAG_ENABLED ? 'visible' : 'direct route only'}</span></div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6" data-testid="utilityapi-demo-stepper">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Demo controls</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Live mode uses UtilityAPI DEMO only. Replay mode uses a bundled XML fixture and makes zero edge-network requests.
                </p>
              </div>
              {isBusy ? <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" /> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleFixtureReplay}
                disabled={isBusy}
              >
                <HardDriveDownload className="h-4 w-4" />
                Fixture Replay
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4" data-testid="utilityapi-demo-operator-panel">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Operator Live Access</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Fixture Replay stays public. Live UtilityAPI DEMO actions require a Supabase magic-link session and an allowlisted operator email.
                  </p>
                </div>
                {liveControlsVisible ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleOperatorSignOut}
                    disabled={isSendingMagicLink}
                  >
                    Sign out operator
                  </button>
                ) : null}
              </div>

              {liveControlsVisible ? (
                <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  Operator session active for <span className="font-semibold">{operatorSession?.user?.email ?? 'unknown operator'}</span>. Live UtilityAPI controls are unlocked below.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Operator email</span>
                    <input
                      type="email"
                      value={operatorEmail}
                      onChange={(event) => setOperatorEmail(event.target.value)}
                      placeholder="operator@company.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                      disabled={!SUPABASE_AUTH_CONFIGURED || isSendingMagicLink}
                    />
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleSendMagicLink}
                    disabled={!SUPABASE_AUTH_CONFIGURED || isSendingMagicLink}
                  >
                    {isSendingMagicLink ? 'Sending magic link...' : 'Email magic link'}
                  </button>
                </div>
              )}

              {!liveControlsVisible ? (
                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleFixtureReplay}
                    disabled={isBusy}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Continue with Fixture Replay
                  </button>
                </div>
              ) : null}

              {!SUPABASE_AUTH_CONFIGURED ? (
                <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Supabase Auth is not configured in this environment, so public Fixture Replay remains the only supported mode until `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.
                </div>
              ) : null}

              {authNotice ? (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200">
                  {authNotice}
                </div>
              ) : null}
            </div>

            {liveControlsVisible ? (
              <div className="mt-6 flex flex-wrap gap-3" data-testid="utilityapi-demo-live-controls">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleStartLive}
                  disabled={isBusy || !edgeEnabled}
                >
                  <PlayCircle className="h-4 w-4" />
                  Launch Live Demo
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handlePollNow}
                  disabled={isBusy || !session || (!session.referral && !session.authorizationUid)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Poll now
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleResumePolling}
                  disabled={isBusy || !edgeEnabled || !session}
                >
                  <PlayCircle className="h-4 w-4" />
                  Resume polling
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleStopPolling}
                  disabled={isBusy || !session || session.pollPhase === 'idle' || session.pollPhase === 'stopped'}
                >
                  <PauseCircle className="h-4 w-4" />
                  Stop auto-polling
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleActivate}
                  disabled={isBusy || !session?.authorizationUid || session.meterUids.length === 0}
                >
                  <Database className="h-4 w-4" />
                  Activate 3 Months
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleSync}
                  disabled={isBusy || !session?.authorizationUid || (!session.canSync && session.status !== 'collection_ready' && session.status !== 'no_intervals')}
                >
                  <HardDriveDownload className="h-4 w-4" />
                  Download XML & Build Forecast
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-700/60 px-4 py-2 text-sm font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleRevoke}
                  disabled={isBusy || !session?.authorizationUid || session.revoked}
                >
                  <Unplug className="h-4 w-4" />
                  Revoke Demo Authorization
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Live UtilityAPI controls stay hidden until an operator session is active. Public visitors can keep using <span className="font-semibold text-slate-100">Fixture Replay</span> without any network dependency.
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              {[
                { key: 'auth_pending', label: '1. Auth pending' },
                { key: 'meters_discovered', label: '2. Meters discovered' },
                { key: 'collection_pending', label: '3. Collecting history' },
                { key: session?.mode === 'fixture' ? 'replayed' : 'synced', label: '4. Forecast ready' },
              ].map((step) => {
                const active = session?.status === step.key
                  || (step.key === 'meters_discovered' && ['collection_pending', 'collection_ready', 'pending_manual', 'wait_to_login', 'no_intervals', 'synced', 'revoked'].includes(session?.status ?? ''))
                  || (step.key === 'synced' && session?.status === 'replayed');
                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border p-4 text-sm ${active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100' : 'border-slate-800 bg-slate-950/40 text-slate-400'}`}
                  >
                    <div className="flex items-center gap-2">
                      {active ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border border-current" />}
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {!edgeEnabled ? (
              <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="flex items-start gap-2">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                  Live UtilityAPI actions are unavailable in the current environment. Use <span className="font-semibold">Fixture Replay</span> to validate the parser and sales-demo surface offline.
                </div>
              </div>
            ) : null}
          </section>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold">Session metadata</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-400">Session ID</dt>
                <dd className="font-mono text-xs text-slate-100">{session?.sessionId ?? 'No active session'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Referral</dt>
                <dd>{session?.referral ?? 'Pending'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Authorization UID</dt>
                <dd className="font-mono text-xs text-slate-100">{session?.authorizationUid ?? 'Pending'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Meter UIDs</dt>
                <dd>{session?.meterUids.length ? session.meterUids.join(', ') : 'No meters yet'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Collection duration</dt>
                <dd>{session?.collectionDurationMonths ? `${session.collectionDurationMonths} months` : 'Not activated'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Next poll</dt>
                <dd>{formatTimestamp(session?.nextPollAt ?? null)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Terminal reason</dt>
                <dd>{session?.terminalReason ? describeTerminalReason(session.terminalReason) : 'None'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Storage model</dt>
                <dd>IndexedDB for XML/rows/package, sessionStorage pointer only</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleDeleteSession}
                disabled={isBusy || !session}
              >
                <Trash2 className="h-4 w-4" />
                Delete Session
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleClearAll}
                disabled={isBusy}
              >
                <RotateCcw className="h-4 w-4" />
                Clear All Demo Sessions
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Hold line</div>
              <p className="mt-2">
                This route does not write to utility connector account tables, does not modify submission readiness, and does not replace the London Hydro bridge program.
              </p>
              <Link className="mt-3 inline-block text-cyan-300 hover:text-cyan-200" to="/utility-demand-forecast">
                Return to utility-demand-forecast
              </Link>
            </div>
          </aside>
        </div>

        {notice ? (
          <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>{notice}</div>
              {showFixtureReplayRecovery ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleFixtureReplay}
                  disabled={isBusy}
                >
                  <RotateCcw className="h-4 w-4" />
                  Continue with Fixture Replay
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {quotaWarning ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            {quotaWarning}
          </div>
        ) : null}
        {session?.lastError ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {session.lastError}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6" data-testid="utilityapi-demo-summary">
            <h2 className="text-lg font-semibold">Replay summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Intervals" value={session?.summary?.intervalRowCount ?? 0} testId="utilityapi-demo-interval-count" />
              <SummaryTile label="Peak demand" value={session?.summary?.peakDemandMw ? `${session.summary.peakDemandMw.toFixed(2)} MW` : 'Not ready'} />
              <SummaryTile label="Average demand" value={session?.summary?.averageDemandMw ? `${session.summary.averageDemandMw.toFixed(2)} MW` : 'Not ready'} />
              <SummaryTile label="Coverage end" value={formatTimestamp(session?.summary?.coverageEnd ?? null)} />
            </div>

            <div className="mt-6 h-72 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 text-sm font-medium text-slate-200">Interval preview</div>
              {intervalPreview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={intervalPreview}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timestamp" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="demand_mw" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Run Fixture Replay or complete a live sync to render interval history.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6" data-testid="utilityapi-demo-forecast">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">Forecast surface</h2>
              {isUpsampled && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
                  data-testid="upsampling-badge"
                >
                  <Zap className="h-3 w-3" />
                  AI Upsampling Active: 60m → 15m
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Uses the existing Ontario Green Button XML parser and utility forecast package builder. Parsed artifacts are persisted to IndexedDB under the active session id.
            </p>
            <div className="mt-6 h-72 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-3 text-sm font-medium text-slate-200">Expected case preview</div>
              {forecastPreview.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastPreview}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="peak" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Forecast artifacts appear here after XML parsing completes.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">Warnings</div>
              {session?.summary?.warnings.length ? (
                <ul className="mt-2 space-y-2">
                  {session.summary.warnings.slice(0, 5).map((warning) => (
                    <li key={warning} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-500">No parser or forecast warnings recorded for the current session.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

function SummaryTile({ label, value, testId }: { label: string; value: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-100" data-testid={testId}>{value}</div>
    </div>
  );
}

export default UtilityApiDemoPage;
