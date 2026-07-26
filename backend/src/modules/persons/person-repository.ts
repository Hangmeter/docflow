import type { QueryResultRow } from 'pg';

import type { QueryClient } from '../../infrastructure/database/database-client.js';

export interface Person {
  id: string;
  externalId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  organizationId: string | null;
  departmentId: string | null;
  positionName: string | null;
  isActive: boolean;
}
export interface CreatePersonInput {
  externalId?: string | null | undefined;
  fullName: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  organizationId?: string | null | undefined;
  departmentId?: string | null | undefined;
  positionName?: string | null | undefined;
}
interface PersonRow extends QueryResultRow {
  id: string;
  external_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  organization_id: string | null;
  department_id: string | null;
  position_name: string | null;
  is_active: boolean;
}
function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    externalId: row.external_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    organizationId: row.organization_id,
    departmentId: row.department_id,
    positionName: row.position_name,
    isActive: row.is_active
  };
}
export class PersonRepository {
  public constructor(private readonly database: QueryClient) {}
  public async create(input: CreatePersonInput): Promise<Person> {
    const result = await this.database.query<PersonRow>(
      `INSERT INTO persons (external_id, full_name, email, phone, organization_id, department_id, position_name) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, external_id, full_name, email, phone, organization_id, department_id, position_name, is_active`,
      [
        input.externalId ?? null,
        input.fullName,
        input.email ?? null,
        input.phone ?? null,
        input.organizationId ?? null,
        input.departmentId ?? null,
        input.positionName ?? null
      ]
    );
    return mapPerson(result.rows[0]!);
  }
  public async findById(personId: string): Promise<Person | null> {
    const result = await this.database.query<PersonRow>(
      'SELECT id, external_id, full_name, email, phone, organization_id, department_id, position_name, is_active FROM persons WHERE id = $1',
      [personId]
    );
    return result.rows[0] ? mapPerson(result.rows[0]) : null;
  }
  public async findAll(): Promise<Person[]> {
    const result = await this.database.query<PersonRow>(
      'SELECT id, external_id, full_name, email, phone, organization_id, department_id, position_name, is_active FROM persons ORDER BY full_name, id'
    );
    return result.rows.map(mapPerson);
  }
}
