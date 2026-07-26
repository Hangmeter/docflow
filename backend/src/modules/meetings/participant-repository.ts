import type { QueryResultRow } from 'pg';
import type { QueryClient } from '../../infrastructure/database/database-client.js';
export type ParticipantRole =
  | 'CHAIRPERSON'
  | 'SECRETARY'
  | 'MEMBER'
  | 'INVITED'
  | 'EXPERT'
  | 'OBSERVER';
export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'PARTIALLY_PRESENT'
  | 'REMOTE'
  | 'NOT_CONFIRMED';
export interface Participant {
  id: string;
  meetingId: string;
  personId: string;
  fullName: string;
  participantRole: ParticipantRole;
  attendanceStatus: AttendanceStatus;
  positionSnapshot: string | null;
  departmentSnapshot: string | null;
  organizationSnapshot: string | null;
}
interface Row extends QueryResultRow {
  id: string;
  meeting_id: string;
  person_id: string;
  full_name: string;
  participant_role: ParticipantRole;
  attendance_status: AttendanceStatus;
  position_snapshot: string | null;
  department_snapshot: string | null;
  organization_snapshot: string | null;
}
function map(r: Row): Participant {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    personId: r.person_id,
    fullName: r.full_name,
    participantRole: r.participant_role,
    attendanceStatus: r.attendance_status,
    positionSnapshot: r.position_snapshot,
    departmentSnapshot: r.department_snapshot,
    organizationSnapshot: r.organization_snapshot
  };
}
export class ParticipantRepository {
  public constructor(private readonly db: QueryClient) {}
  public async findAll(meetingId: string): Promise<Participant[]> {
    const r = await this.db.query<Row>(
      'SELECT mp.id,mp.meeting_id,mp.person_id,p.full_name,mp.participant_role,mp.attendance_status,mp.position_snapshot,mp.department_snapshot,mp.organization_snapshot FROM meeting_participants mp JOIN persons p ON p.id=mp.person_id WHERE mp.meeting_id=$1 ORDER BY mp.participant_role,p.full_name',
      [meetingId]
    );
    return r.rows.map(map);
  }
  public async create(
    meetingId: string,
    personId: string,
    role: ParticipantRole,
    status: AttendanceStatus
  ): Promise<Participant | null> {
    const r = await this.db.query<Row>(
      `WITH inserted AS (INSERT INTO meeting_participants (meeting_id,person_id,participant_role,attendance_status,position_snapshot,department_snapshot,organization_snapshot) SELECT $1,p.id,$3,$4,p.position_name,d.name,o.name FROM persons p LEFT JOIN departments d ON d.id=p.department_id LEFT JOIN organizations o ON o.id=p.organization_id WHERE p.id=$2 RETURNING *) SELECT i.id,i.meeting_id,i.person_id,p.full_name,i.participant_role,i.attendance_status,i.position_snapshot,i.department_snapshot,i.organization_snapshot FROM inserted i JOIN persons p ON p.id=i.person_id`,
      [meetingId, personId, role, status]
    );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  public async updateAttendance(
    id: string,
    meetingId: string,
    status: AttendanceStatus
  ): Promise<Participant | null> {
    const r = await this.db.query<Row>(
      `UPDATE meeting_participants mp SET attendance_status=$3 FROM persons p WHERE mp.id=$1 AND mp.meeting_id=$2 AND p.id=mp.person_id RETURNING mp.id,mp.meeting_id,mp.person_id,p.full_name,mp.participant_role,mp.attendance_status,mp.position_snapshot,mp.department_snapshot,mp.organization_snapshot`,
      [id, meetingId, status]
    );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  public async delete(id: string, meetingId: string): Promise<boolean> {
    const r = await this.db.query(
      'DELETE FROM meeting_participants WHERE id=$1 AND meeting_id=$2',
      [id, meetingId]
    );
    return (r.rowCount ?? 0) > 0;
  }
}
