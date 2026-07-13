import { apiFetch } from '../config/api';
import { ChildTransport, OptOut, OptOutRequest, TransportTrip } from './transport.types';

/** GET /api/parent/transport/children */
export function getTransportChildren(accessToken: string) {
  return apiFetch<ChildTransport[]>('/api/parent/transport/children', { accessToken });
}

/** GET /api/parent/children/{studentId}/transport/trips?days=14 (Premium — may 402). */
export function getChildTransportTrips(accessToken: string, studentId: number, days = 14) {
  return apiFetch<TransportTrip[]>(
    `/api/parent/children/${studentId}/transport/trips?days=${days}`,
    { accessToken },
  );
}

/** GET /api/parent/children/{studentId}/transport/opt-outs */
export function listOptOuts(accessToken: string, studentId: number) {
  return apiFetch<OptOut[]>(
    `/api/parent/children/${studentId}/transport/opt-outs`,
    { accessToken },
  );
}

/** POST /api/parent/children/{studentId}/transport/opt-outs */
export function createOptOut(accessToken: string, studentId: number, body: OptOutRequest) {
  return apiFetch<OptOut>(
    `/api/parent/children/${studentId}/transport/opt-outs`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/** DELETE /api/parent/children/{studentId}/transport/opt-outs/{optOutId} */
export function deleteOptOut(accessToken: string, studentId: number, optOutId: number) {
  return apiFetch<void>(
    `/api/parent/children/${studentId}/transport/opt-outs/${optOutId}`,
    { method: 'DELETE', accessToken },
  );
}
