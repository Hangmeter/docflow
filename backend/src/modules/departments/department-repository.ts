import type { QueryResultRow } from 'pg';
import type { QueryClient } from '../../infrastructure/database/database-client.js';

export interface Department {
  id: string;
  organizationId: string;
  parentDepartmentId: string | null;
  name: string;
  shortName: string | null;
}
export interface CreateDepartmentInput {
  organizationId: string;
  parentDepartmentId?: string | null | undefined;
  name: string;
  shortName?: string | null | undefined;
}
interface DepartmentRow extends QueryResultRow {
  id: string;
  organization_id: string;
  parent_department_id: string | null;
  name: string;
  short_name: string | null;
}
function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    organizationId: row.organization_id,
    parentDepartmentId: row.parent_department_id,
    name: row.name,
    shortName: row.short_name
  };
}
export class DepartmentRepository {
  public constructor(private readonly database: QueryClient) {}
  public async create(input: CreateDepartmentInput): Promise<Department> {
    const result = await this.database.query<DepartmentRow>(
      'INSERT INTO departments (organization_id,parent_department_id,name,short_name) VALUES ($1,$2,$3,$4) RETURNING id,organization_id,parent_department_id,name,short_name',
      [input.organizationId, input.parentDepartmentId ?? null, input.name, input.shortName ?? null]
    );
    return mapDepartment(result.rows[0]!);
  }
  public async findById(id: string): Promise<Department | null> {
    const result = await this.database.query<DepartmentRow>(
      'SELECT id,organization_id,parent_department_id,name,short_name FROM departments WHERE id=$1',
      [id]
    );
    return result.rows[0] ? mapDepartment(result.rows[0]) : null;
  }
  public async findAll(): Promise<Department[]> {
    const result = await this.database.query<DepartmentRow>(
      'SELECT id,organization_id,parent_department_id,name,short_name FROM departments ORDER BY name,id'
    );
    return result.rows.map(mapDepartment);
  }
}
