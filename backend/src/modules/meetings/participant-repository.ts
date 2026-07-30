import type { QueryResultRow } from 'pg';
import type { QueryClient } from '../../infrastructure/database/database-client.js';

export type ParticipantRole = 'CHAIRPERSON' | 'SECRETARY' | 'MEMBER' | 'INVITED';
export interface Participant {
  id: string;
  meetingId: string;
  personId: string;
  fullName: string;
  participantRole: ParticipantRole;
  positionSnapshot: string | null;
  departmentSnapshot: string | null;
  organizationSnapshot: string | null;
}
export interface ParticipantCandidate {
  id: string;
  fullName: string;
  positionName: string | null;
  departmentName: string | null;
  organizationName: string | null;
}
interface Row extends QueryResultRow {
  id: string;
  meeting_id: string;
  person_id: string;
  full_name_snapshot: string;
  participant_role: ParticipantRole;
  position_snapshot: string | null;
  department_snapshot: string | null;
  organization_snapshot: string | null;
}
interface CandidateRow extends QueryResultRow {
  id: string;
  full_name: string;
  position_name: string | null;
  department_name: string | null;
  organization_name: string | null;
}
const COLUMNS =
  'mp.id,mp.meeting_id,mp.person_id,mp.full_name_snapshot,mp.participant_role,mp.position_snapshot,mp.department_snapshot,mp.organization_snapshot';
function map(row: Row): Participant {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    personId: row.person_id,
    fullName: row.full_name_snapshot,
    participantRole: row.participant_role,
    positionSnapshot: row.position_snapshot,
    departmentSnapshot: row.department_snapshot,
    organizationSnapshot: row.organization_snapshot
  };
}
export class ParticipantRepository {
  public constructor(private readonly db: QueryClient) {}
  public async findAll(meetingId: string): Promise<Participant[]> {
    const result = await this.db.query<Row>(
      `SELECT ${COLUMNS} FROM meeting_participants mp WHERE mp.meeting_id=$1 ORDER BY mp.participant_role,mp.full_name_snapshot`,
      [meetingId]
    );
    return result.rows.map(map);
  }
  public async findCandidates(
    meetingId: string,
    search: string | undefined
  ): Promise<ParticipantCandidate[]> {
    const result = await this.db.query<CandidateRow>(
      `SELECT p.id,p.full_name,p.position_name,d.name AS department_name,o.name AS organization_name FROM persons p LEFT JOIN departments d ON d.id=p.department_id LEFT JOIN organizations o ON o.id=p.organization_id WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id=$1 AND mp.person_id=p.id) AND ($2::text IS NULL OR p.full_name ILIKE '%'||$2||'%' OR p.position_name ILIKE '%'||$2||'%') ORDER BY p.full_name LIMIT 50`,
      [meetingId, search ?? null]
    );
    return result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      positionName: row.position_name,
      departmentName: row.department_name,
      organizationName: row.organization_name
    }));
  }
  public async create(
    meetingId: string,
    personId: string,
    role: ParticipantRole
  ): Promise<Participant | null> {
    const result = await this.db.query<Row>(
      `WITH inserted AS (INSERT INTO meeting_participants (meeting_id,person_id,full_name_snapshot,participant_role,position_snapshot,department_snapshot,organization_snapshot) SELECT $1,p.id,p.full_name,$3,p.position_name,d.name,o.name FROM persons p LEFT JOIN departments d ON d.id=p.department_id LEFT JOIN organizations o ON o.id=p.organization_id WHERE p.id=$2 AND p.is_active AND NOT EXISTS (SELECT 1 FROM protocols pr WHERE pr.meeting_id=$1 AND pr.status='ARCHIVED') RETURNING *) SELECT ${COLUMNS} FROM inserted mp`,
      [meetingId, personId, role]
    );
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  public async updateRole(
    id: string,
    meetingId: string,
    role: ParticipantRole
  ): Promise<Participant | null> {
    const result = await this.db.query<Row>(
      `UPDATE meeting_participants mp SET participant_role=$3 WHERE mp.id=$1 AND mp.meeting_id=$2 AND NOT EXISTS (SELECT 1 FROM protocols p WHERE p.meeting_id=$2 AND p.status='ARCHIVED') RETURNING ${COLUMNS}`,
      [id, meetingId, role]
    );
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  public async delete(id: string, meetingId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM meeting_participants mp WHERE mp.id=$1 AND mp.meeting_id=$2 AND mp.participant_role NOT IN ('CHAIRPERSON','SECRETARY') AND NOT EXISTS (SELECT 1 FROM protocols p WHERE p.meeting_id=$2 AND p.status='ARCHIVED')`,
      [id, meetingId]
    );
    return (result.rowCount ?? 0) > 0;
  }
  public async exists(id: string, meetingId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM meeting_participants WHERE id=$1 AND meeting_id=$2',
      [id, meetingId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
