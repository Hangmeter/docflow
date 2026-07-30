import type { QueryResultRow } from 'pg';

import type { QueryClient } from '../../infrastructure/database/database-client.js';

export interface Organization {
  id: string;
  name: string;
  shortName: string | null;
  externalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  shortName?: string | null | undefined;
  externalCode?: string | null | undefined;
}

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  short_name: string | null;
  external_code: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    externalCode: row.external_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class OrganizationRepository {
  public constructor(private readonly database: QueryClient) {}

  public async create(input: CreateOrganizationInput): Promise<Organization> {
    const result = await this.database.query<OrganizationRow>(
      `INSERT INTO organizations (name, short_name, external_code)
       VALUES ($1, $2, $3)
       RETURNING id, name, short_name, external_code, created_at, updated_at`,
      [input.name, input.shortName ?? null, input.externalCode ?? null]
    );
    return mapOrganization(result.rows[0]!);
  }

  public async findById(organizationId: string): Promise<Organization | null> {
    const result = await this.database.query<OrganizationRow>(
      `SELECT id, name, short_name, external_code, created_at, updated_at
       FROM organizations WHERE id = $1`,
      [organizationId]
    );
    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  public async findAll(): Promise<Organization[]> {
    const result = await this.database.query<OrganizationRow>(
      `SELECT id, name, short_name, external_code, created_at, updated_at
       FROM organizations ORDER BY name, id`
    );
    return result.rows.map(mapOrganization);
  }
}
