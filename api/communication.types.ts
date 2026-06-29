// =================================================================
// Communication types - mirrors LiveClassDTO, TermEventDTO,
// AnnouncementDTO from the Spring OpenAPI spec.
// =================================================================

export type LiveClassStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | string;

export interface LiveClass {
  id: number | null;
  title: string | null;
  description: string | null;
  classNo: number | null;
  className: string | null;
  startsOn: string | null;        // ISO timestamp
  endsOn: string | null;
  status: LiveClassStatus | null;
}

export interface TermEvent {
  id: number | null;
  title: string | null;
  startDate: string | null;       // ISO date (yyyy-MM-dd)
  endDate: string | null;
  targetClass: string | null;
  className: string | null;
  description: string | null;
  schoolId: number | null;
}

export type AnnouncementType = 'NOTICE' | 'NEWSLETTER' | string;

export interface Announcement {
  id: string | null;              // string per the spec
  type: AnnouncementType | null;
  title: string | null;
  body: string | null;
  fileName: string | null;
  filePath: string | null;
  date: string | null;
  from: string | null;
  isNew: boolean | null;
}
