import type { QueryResultRow } from 'pg';

import type { QueryClient } from '../../infrastructure/database/database-client.js';
export type MeetingType = 'PLANNED' | 'EXTRAORDINARY' | 'WORKING' | 'OTHER';
export type MeetingFormat = 'IN_PERSON' | 'VIDEO_CONFERENCE' | 'HYBRID' | 'OTHER';
export interface Meeting {
  id: string;
  meetingNumber: string | null;
  title: string;
  meetingType: MeetingType;
  meetingFormat: MeetingFormat;
  scheduledStartAt: Date;
  scheduledEndAt: Date | null;
  location: string | null;
}
export interface CreateMeetingInput {
  meetingNumber?: string | null;
  title: string;
  meetingType?: MeetingType;
  meetingFormat?: MeetingFormat;
  scheduledStartAt: Date;
  scheduledEndAt?: Date | null;
  location?: string | null;
}
interface MeetingRow extends QueryResultRow {
  id: string;
  meeting_number: string | null;
  title: string;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  scheduled_start_at: Date;
  scheduled_end_at: Date | null;
  location: string | null;
}
function mapMeeting(row: MeetingRow): Meeting {
  return {
    id: row.id,
    meetingNumber: row.meeting_number,
    title: row.title,
    meetingType: row.meeting_type,
    meetingFormat: row.meeting_format,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    location: row.location
  };
}
export class MeetingRepository {
  public constructor(private readonly database: QueryClient) {}
  public async create(input: CreateMeetingInput): Promise<Meeting> {
    const result = await this.database.query<MeetingRow>(
      `INSERT INTO meetings (meeting_number, title, meeting_type, meeting_format, scheduled_start_at, scheduled_end_at, location) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, meeting_number, title, meeting_type, meeting_format, scheduled_start_at, scheduled_end_at, location`,
      [
        input.meetingNumber ?? null,
        input.title,
        input.meetingType ?? 'PLANNED',
        input.meetingFormat ?? 'VIDEO_CONFERENCE',
        input.scheduledStartAt,
        input.scheduledEndAt ?? null,
        input.location ?? null
      ]
    );
    return mapMeeting(result.rows[0]!);
  }
  public async findById(meetingId: string): Promise<Meeting | null> {
    const result = await this.database.query<MeetingRow>(
      'SELECT id, meeting_number, title, meeting_type, meeting_format, scheduled_start_at, scheduled_end_at, location FROM meetings WHERE id = $1',
      [meetingId]
    );
    return result.rows[0] ? mapMeeting(result.rows[0]) : null;
  }
  public async findAll(): Promise<Meeting[]> {
    const result = await this.database.query<MeetingRow>(
      'SELECT id, meeting_number, title, meeting_type, meeting_format, scheduled_start_at, scheduled_end_at, location FROM meetings ORDER BY scheduled_start_at DESC, id DESC'
    );
    return result.rows.map(mapMeeting);
  }
}
