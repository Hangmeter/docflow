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
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  location: string | null;
  conferenceUrl: string | null;
  nextMeetingAt: Date | null;
  specialNotes: string | null;
}
export interface MeetingListItem extends Meeting {
  protocolStatus: string | null;
  chairperson: string | null;
  openTaskCount: number;
}
export interface CreateMeetingInput {
  meetingNumber?: string | null | undefined;
  title: string;
  meetingType?: MeetingType | undefined;
  meetingFormat?: MeetingFormat | undefined;
  scheduledStartAt: Date;
  scheduledEndAt?: Date | null | undefined;
  location?: string | null | undefined;
  conferenceUrl?: string | null | undefined;
  nextMeetingAt?: Date | null | undefined;
  specialNotes?: string | null | undefined;
}
export interface MeetingListQuery {
  search?: string | undefined;
  meetingType?: MeetingType | undefined;
  protocolStatus?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  limit: number;
  offset: number;
}
interface MeetingRow extends QueryResultRow {
  id: string;
  meeting_number: string | null;
  title: string;
  meeting_type: MeetingType;
  meeting_format: MeetingFormat;
  scheduled_start_at: Date;
  scheduled_end_at: Date | null;
  actual_start_at: Date | null;
  actual_end_at: Date | null;
  location: string | null;
  conference_url: string | null;
  next_meeting_at: Date | null;
  special_notes: string | null;
  protocol_status: string | null;
  chairperson: string | null;
  open_task_count: string;
}
function map(row: MeetingRow): Meeting {
  return {
    id: row.id,
    meetingNumber: row.meeting_number,
    title: row.title,
    meetingType: row.meeting_type,
    meetingFormat: row.meeting_format,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    actualStartAt: row.actual_start_at,
    actualEndAt: row.actual_end_at,
    location: row.location,
    conferenceUrl: row.conference_url,
    nextMeetingAt: row.next_meeting_at,
    specialNotes: row.special_notes
  };
}
const COLUMNS =
  'm.id,m.meeting_number,m.title,m.meeting_type,m.meeting_format,m.scheduled_start_at,m.scheduled_end_at,m.actual_start_at,m.actual_end_at,m.location,m.conference_url,m.next_meeting_at,m.special_notes';
export class MeetingRepository {
  public constructor(private readonly database: QueryClient) {}
  public async create(input: CreateMeetingInput): Promise<Meeting> {
    const r = await this.database.query<MeetingRow>(
      `INSERT INTO meetings (meeting_number,title,meeting_type,meeting_format,scheduled_start_at,scheduled_end_at,location,conference_url,next_meeting_at,special_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,meeting_number,title,meeting_type,meeting_format,scheduled_start_at,scheduled_end_at,actual_start_at,actual_end_at,location,conference_url,next_meeting_at,special_notes`,
      [
        input.meetingNumber ?? null,
        input.title,
        input.meetingType ?? 'PLANNED',
        input.meetingFormat ?? 'VIDEO_CONFERENCE',
        input.scheduledStartAt,
        input.scheduledEndAt ?? null,
        input.location ?? null,
        input.conferenceUrl ?? null,
        input.nextMeetingAt ?? null,
        input.specialNotes ?? null
      ]
    );
    return map(r.rows[0]!);
  }
  public async findById(id: string): Promise<Meeting | null> {
    const r = await this.database.query<MeetingRow>(
      `SELECT ${COLUMNS} FROM meetings m WHERE m.id=$1`,
      [id]
    );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  public async findAll(
    query: MeetingListQuery = { limit: 25, offset: 0 }
  ): Promise<MeetingListItem[]> {
    const r = await this.database.query<MeetingRow>(
      `SELECT ${COLUMNS},p.status::text AS protocol_status,chair.full_name AS chairperson,COALESCE(tasks.open_task_count,0)::text AS open_task_count FROM meetings m LEFT JOIN protocols p ON p.meeting_id=m.id LEFT JOIN LATERAL (SELECT pe.full_name FROM meeting_participants mp JOIN persons pe ON pe.id=mp.person_id WHERE mp.meeting_id=m.id AND mp.participant_role='CHAIRPERSON' ORDER BY mp.id LIMIT 1) chair ON true LEFT JOIN LATERAL (SELECT count(*) AS open_task_count FROM tasks t JOIN decisions d ON d.id=t.decision_id JOIN discussions ds ON ds.id=d.discussion_id JOIN protocols source_p ON source_p.id=ds.protocol_id WHERE source_p.meeting_id=m.id AND t.status NOT IN ('COMPLETED','CANCELLED')) tasks ON true WHERE ($1::text IS NULL OR m.title ILIKE '%'||$1||'%' OR m.meeting_number ILIKE '%'||$1||'%') AND ($2::meeting_type IS NULL OR m.meeting_type=$2) AND ($3::protocol_status IS NULL OR p.status=$3) AND ($4::timestamptz IS NULL OR m.scheduled_start_at >= $4) AND ($5::timestamptz IS NULL OR m.scheduled_start_at <= $5) ORDER BY m.scheduled_start_at DESC,m.id DESC LIMIT $6 OFFSET $7`,
      [
        query.search ?? null,
        query.meetingType ?? null,
        query.protocolStatus ?? null,
        query.from ?? null,
        query.to ?? null,
        query.limit,
        query.offset
      ]
    );
    return r.rows.map((row) => ({
      ...map(row),
      protocolStatus: row.protocol_status,
      chairperson: row.chairperson,
      openTaskCount: Number(row.open_task_count)
    }));
  }
  public async update(id: string, input: CreateMeetingInput): Promise<Meeting | null> {
    const r = await this.database.query<MeetingRow>(
      `UPDATE meetings SET meeting_number=$2,title=$3,meeting_type=$4,meeting_format=$5,scheduled_start_at=$6,scheduled_end_at=$7,location=$8,conference_url=$9,next_meeting_at=$10,special_notes=$11,updated_at=now() WHERE id=$1 RETURNING id,meeting_number,title,meeting_type,meeting_format,scheduled_start_at,scheduled_end_at,actual_start_at,actual_end_at,location,conference_url,next_meeting_at,special_notes`,
      [
        id,
        input.meetingNumber ?? null,
        input.title,
        input.meetingType ?? 'PLANNED',
        input.meetingFormat ?? 'VIDEO_CONFERENCE',
        input.scheduledStartAt,
        input.scheduledEndAt ?? null,
        input.location ?? null,
        input.conferenceUrl ?? null,
        input.nextMeetingAt ?? null,
        input.specialNotes ?? null
      ]
    );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
}
