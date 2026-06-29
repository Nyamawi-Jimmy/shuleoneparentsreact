// =================================================================
// Call types - mirrors InviteBody, SignalBody from the OpenAPI.
// Backend endpoints return generic strings (JSON-encoded payloads),
// so we type the parsed-server shapes explicitly here.
// =================================================================

import { ChatRole } from './chat.types';

export interface InviteBody {
  calleeId: number;
  calleeRole: ChatRole;
}

export interface SignalBody {
  /**
   * Stringified signalling payload (SDP offer/answer or ICE candidate
   * JSON). The backend just relays this through the WebSocket bus to
   * the peer.
   */
  payload: string;
}

// =================================================================
// Parsed-server response shapes (decoded from `string` responses)
// =================================================================

/** Decoded /api/parent/call/invite response */
export interface InviteResponse {
  callId: string;
  // Whatever else the backend includes (status, etc.)
  [k: string]: any;
}

/** Decoded /api/parent/call/turn response */
export interface TurnConfig {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
}

/** Decoded /api/parent/call/ws-info response */
export interface WsInfo {
  url: string;                        // wss://... STOMP endpoint
  topicPrefix?: string;               // e.g. '/topic/call'
  destinationPrefix?: string;         // e.g. '/app/call'
  [k: string]: any;
}

// =================================================================
// Call state machine (client-side)
// =================================================================
export type CallState =
  | 'idle'
  | 'dialing'         // outgoing - waiting for callee to accept
  | 'ringing'         // incoming - waiting for our user to accept
  | 'connecting'      // accepted - negotiating WebRTC
  | 'in_call'         // active media
  | 'ended'
  | 'failed';

export type CallDirection = 'outgoing' | 'incoming';

export interface CallSession {
  callId: string;
  peerId: number;
  peerRole: ChatRole;
  peerName: string;
  direction: CallDirection;
  state: CallState;
  startedAt: number;                  // epoch ms when we transition to in_call
  errorMessage?: string;
}

// =================================================================
// Signal payload shapes (we wrap WebRTC SDP/ICE in a typed envelope)
// =================================================================
export type CallSignalKind = 'offer' | 'answer' | 'ice' | 'hangup';

export interface CallSignalEnvelope {
  kind: CallSignalKind;
  sdp?: any;          // RTCSessionDescriptionInit
  candidate?: any;    // RTCIceCandidateInit
}
