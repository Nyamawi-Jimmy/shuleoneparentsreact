// =================================================================
// Transport types.
// =================================================================

export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | string;
export type TripDirection = 'TO_SCHOOL' | 'FROM_SCHOOL' | string;
export type SeatStatus = 'ASSIGNED' | 'UNASSIGNED' | string;

export interface OptOut {
  id: number | null;
  date: string | null;            // ISO yyyy-MM-dd
  note: string | null;
}

export interface OptOutRequest {
  date: string;                   // yyyy-MM-dd
  note?: string | null;
}

export interface TransportTrip {
  tripDate: string | null;        // ISO yyyy-MM-dd
  direction: string | null;       // PICKUP | DROPOFF
  tripStatus: string | null;
  plateNo: string | null;
  routeCode: string | null;
  seatStatus: string | null;
  boardedAt: string | null;
  arrivedAt: string | null;
  droppedAt: string | null;
}

export interface ChildTransport {
  studentId: number | null;
  studentName: string | null;
  onTransport: boolean | null;
  routeCode: string | null;
  routeName: string | null;
  pickupPointName: string | null;
  tripId: number | null;
  tripStatus: TripStatus | null;
  tripDirection: TripDirection | null;
  vehiclePlate: string | null;
  seatStatus: SeatStatus | null;
  trackingUrl: string | null;
  optedOutToday: boolean | null;
  upcomingOptOuts: OptOut[] | null;
}

/** A geocoded point on the child's route, or an anchor (school / their stop). */
export interface TransportPoint {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * GET /api/parent/children/{id}/transport/live — the same payload the web
 * parent map consumes, so both surfaces stay in step.
 *
 * `routePolyline` is a Google-encoded overview polyline of the road route from
 * the bus to this child's stop. It is null whenever Directions is unavailable
 * (no key, quota, or a stale fix), in which case the map falls back to a
 * straight line — so treat it as optional, never assume it is present.
 */
export interface TransportLive {
  active: boolean | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speedKmh: number | null;
  stale: boolean | null;
  ageSeconds: number | null;
  recordedAt: string | null;
  etaMinutes: number | null;
  etaTargetName: string | null;
  routePolyline: string | null;
  routeStops: TransportPoint[] | null;
  pickupPoint: TransportPoint | null;
  school: TransportPoint | null;
  vehiclePlate: string | null;
  direction: TripDirection | null;
  tripId: number | null;
  seatStatus: SeatStatus | null;
}
