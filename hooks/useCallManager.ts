import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  inviteCall, acceptCall, rejectCall, endCall, signalCall,
  getTurnConfig, getWsInfo,
} from '../api/call';
import {
  CallSession, CallState, CallSignalEnvelope, TurnConfig, WsInfo,
} from '../api/call.types';
import { ChatRole } from '../api/chat.types';

/**
 * Indicates whether we are running in an environment that supports
 * voice calls. Expo Go cannot load `react-native-webrtc` (native module),
 * so the screens will render a "needs dev build" message in that case.
 */
export function isCallingSupported(): boolean {
  try {
    require.resolve('react-native-webrtc');
    return true;
  } catch {
    return false;
  }
}

interface UseCallManagerArgs {
  /** For outgoing calls. */
  outgoing?: { peerId: number; peerRole: ChatRole; peerName: string };
  /** For incoming calls (delivered via push notification). */
  incoming?: { callId: string; peerId: number; peerRole: ChatRole; peerName: string };
}

/**
 * Headless call manager. Handles:
 *   - Backend invite/accept/reject/end/signal HTTP calls
 *   - WebRTC PeerConnection lifecycle (lazy-loaded native module)
 *   - STOMP WebSocket connection for signaling (lazy-loaded)
 *
 * Returns a CallSession plus action callbacks. The UI in CallScreen
 * is purely presentational.
 */
export function useCallManager({ outgoing, incoming }: UseCallManagerArgs) {
  const { accessToken } = useAuth();

  const [session, setSession] = useState<CallSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  // ── Native handles (only present if react-native-webrtc is available) ───
  const pcRef = useRef<any>(null);                 // RTCPeerConnection
  const localStreamRef = useRef<any>(null);        // MediaStream
  const remoteStreamRef = useRef<any>(null);
  const stompClientRef = useRef<any>(null);        // STOMP Client
  const stompSubsRef = useRef<any[]>([]);          // STOMP subscriptions
  const supportedRef = useRef(isCallingSupported());

  // ── Boot the call (invite if outgoing, just open signaling if incoming) ───
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        if (!supportedRef.current) {
          setError('Voice calls require a dev build (react-native-webrtc not available).');
          return;
        }

        const [turn, ws] = await Promise.all([
          getTurnConfig(accessToken),
          getWsInfo(accessToken),
        ]);

        if (outgoing) {
          const res = await inviteCall(accessToken, {
            calleeId: outgoing.peerId,
            calleeRole: outgoing.peerRole,
          });
          if (cancelled) return;
          await startCall({
            callId: res.callId,
            peerId: outgoing.peerId,
            peerRole: outgoing.peerRole,
            peerName: outgoing.peerName,
            direction: 'outgoing',
            initialState: 'dialing',
            turn,
            ws,
          });
        } else if (incoming) {
          // For incoming we start in 'ringing' and wait for user to accept
          setSession({
            callId: incoming.callId,
            peerId: incoming.peerId,
            peerRole: incoming.peerRole,
            peerName: incoming.peerName,
            direction: 'incoming',
            state: 'ringing',
            startedAt: 0,
          });
          // Pre-warm the signaling connection so accept is instant
          await openSignaling(incoming.callId, ws);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Could not start call.');
        setSession((s) => s ? { ...s, state: 'failed', errorMessage: e?.message } : null);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // ── Internal: open STOMP signaling ────────────────────────────────
  const openSignaling = useCallback(async (callId: string, wsInfo: WsInfo) => {
    let StompModule: any;
    let SockJS: any;
    try {
      StompModule = require('@stomp/stompjs');
      try { SockJS = require('sockjs-client'); } catch { /* optional */ }
    } catch {
      throw new Error('STOMP client not installed. Run: npx expo install @stomp/stompjs sockjs-client');
    }

    const useSockJs = !!SockJS && wsInfo.url?.startsWith('http');
    const client = new StompModule.Client({
      webSocketFactory: useSockJs ? () => new SockJS(wsInfo.url) : undefined,
      brokerURL: useSockJs ? undefined : wsInfo.url,
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 2000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    const topicPrefix = wsInfo.topicPrefix ?? '/topic/call';

    client.onConnect = () => {
      // Subscribe to inbound signals for this call
      const sub = client.subscribe(`${topicPrefix}/${callId}/signal`, (msg: any) => {
        try {
          const env: CallSignalEnvelope = JSON.parse(msg.body);
          handleInboundSignal(env);
        } catch { /* ignore */ }
      });
      stompSubsRef.current.push(sub);

      // Subscribe to call lifecycle events (peer accepted / rejected / ended)
      const sub2 = client.subscribe(`${topicPrefix}/${callId}/lifecycle`, (msg: any) => {
        try {
          const evt = JSON.parse(msg.body);
          if (evt.type === 'ACCEPTED') {
            setSession((s) => s ? { ...s, state: 'connecting' } : null);
          } else if (evt.type === 'REJECTED') {
            setSession((s) => s ? { ...s, state: 'ended' } : null);
          } else if (evt.type === 'ENDED') {
            setSession((s) => s ? { ...s, state: 'ended' } : null);
            cleanup();
          }
        } catch { /* ignore */ }
      });
      stompSubsRef.current.push(sub2);
    };

    client.onStompError = (frame: any) => {
      setError(`Signaling error: ${frame.headers?.message ?? 'unknown'}`);
    };

    client.activate();
    stompClientRef.current = client;
  }, [accessToken]);

  // ── Internal: WebRTC setup ────────────────────────────────────────
  const startCall = useCallback(async (args: {
    callId: string;
    peerId: number;
    peerRole: ChatRole;
    peerName: string;
    direction: 'outgoing' | 'incoming';
    initialState: CallState;
    turn: TurnConfig;
    ws: WsInfo;
  }) => {
    const { callId, peerId, peerRole, peerName, direction, initialState, turn, ws } = args;
    setSession({
      callId, peerId, peerRole, peerName, direction,
      state: initialState, startedAt: 0,
    });

    let WebRTC: any;
    try {
      WebRTC = require('react-native-webrtc');
    } catch {
      throw new Error('react-native-webrtc not installed. Voice calls need a dev build.');
    }
    const { RTCPeerConnection, mediaDevices } = WebRTC;

    const pc = new RTCPeerConnection({ iceServers: turn.iceServers });
    pcRef.current = pc;

    // Mic only (no video for now)
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));

    pc.onicecandidate = (ev: any) => {
      if (ev.candidate) {
        sendSignal({ kind: 'ice', candidate: ev.candidate });
      }
    };
    pc.ontrack = (ev: any) => {
      remoteStreamRef.current = ev.streams[0];
      setSession((s) => s ? { ...s, state: 'in_call', startedAt: Date.now() } : null);
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'disconnected') {
        setSession((s) => s ? { ...s, state: 'failed' } : null);
      }
    };

    await openSignaling(callId, ws);

    if (direction === 'outgoing') {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      sendSignal({ kind: 'offer', sdp: offer });
    }
  }, []);

  // ── Send a signal envelope via the backend ────────────────────────
  const sendSignal = useCallback(async (envelope: CallSignalEnvelope) => {
    if (!accessToken || !session?.callId) return;
    try {
      await signalCall(accessToken, session.callId, {
        payload: JSON.stringify(envelope),
      });
    } catch { /* swallow - polling/retry could be added */ }
  }, [accessToken, session?.callId]);

  // ── Handle inbound signal from STOMP ──────────────────────────────
  const handleInboundSignal = useCallback(async (env: CallSignalEnvelope) => {
    const pc = pcRef.current;
    if (!pc) return;
    let WebRTC: any;
    try { WebRTC = require('react-native-webrtc'); } catch { return; }
    const { RTCSessionDescription, RTCIceCandidate } = WebRTC;

    try {
      if (env.kind === 'offer' && env.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(env.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ kind: 'answer', sdp: answer });
      } else if (env.kind === 'answer' && env.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(env.sdp));
      } else if (env.kind === 'ice' && env.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(env.candidate));
      } else if (env.kind === 'hangup') {
        cleanup();
        setSession((s) => s ? { ...s, state: 'ended' } : null);
      }
    } catch { /* ignore */ }
  }, [sendSignal]);

  // ── Public actions ────────────────────────────────────────────────
  const accept = useCallback(async () => {
    if (!accessToken || !session) return;
    setSession((s) => s ? { ...s, state: 'connecting' } : null);
    try {
      await acceptCall(accessToken, session.callId);
      // The WebRTC setup for incoming runs in startCall - reuse it
      const [turn, ws] = await Promise.all([
        getTurnConfig(accessToken), getWsInfo(accessToken),
      ]);
      await startCall({
        callId: session.callId,
        peerId: session.peerId,
        peerRole: session.peerRole,
        peerName: session.peerName,
        direction: 'incoming',
        initialState: 'connecting',
        turn, ws,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not accept call.');
      setSession((s) => s ? { ...s, state: 'failed' } : null);
    }
  }, [accessToken, session, startCall]);

  const reject = useCallback(async () => {
    if (!accessToken || !session) return;
    try { await rejectCall(accessToken, session.callId); } catch { /* ignore */ }
    cleanup();
    setSession((s) => s ? { ...s, state: 'ended' } : null);
  }, [accessToken, session]);

  const hangUp = useCallback(async () => {
    if (!accessToken || !session) return;
    try { await endCall(accessToken, session.callId); } catch { /* ignore */ }
    sendSignal({ kind: 'hangup' });
    cleanup();
    setSession((s) => s ? { ...s, state: 'ended' } : null);
  }, [accessToken, session, sendSignal]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks?.()?.[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((s) => !s);
    // Routing speaker output requires platform-specific audio session config;
    // safely no-op on Expo Go.
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    try { pcRef.current?.close?.(); } catch {}
    try { localStreamRef.current?.getTracks?.()?.forEach((t: any) => t.stop?.()); } catch {}
    try {
      stompSubsRef.current.forEach((s) => s?.unsubscribe?.());
      stompClientRef.current?.deactivate?.();
    } catch {}
    pcRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    stompSubsRef.current = [];
    stompClientRef.current = null;
  }, []);

  return {
    session,
    error,
    supported: supportedRef.current,
    micMuted,
    speakerOn,
    accept,
    reject,
    hangUp,
    toggleMic,
    toggleSpeaker,
  };
}
