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
