import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../src/app.js';
import { runMigrations } from '../../../src/infrastructure/database/migrations/migration-runner.js';
import { seedDevelopmentDatabase } from '../../../src/infrastructure/database/seeds/development-seed.js';
import { withTransaction } from '../../../src/infrastructure/database/database-client.js';
import { MeetingRepository } from '../../../src/modules/meetings/meeting-repository.js';
import { OrganizationRepository } from '../../../src/modules/organizations/organization-repository.js';
import { PersonRepository } from '../../../src/modules/persons/person-repository.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe.sequential : describe.skip;
const migrationsDirectory = resolve(
  process.env.MIGRATIONS_DIR ?? join(process.cwd(), '../database/migrations')
);

describeDatabase('PostgreSQL integration', () => {
  const pool = new Pool({ connectionString: testDatabaseUrl ?? '' });

  beforeAll(async () => {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  });
  afterAll(async () => pool.end());

  it('applies migrations to an empty database', async () => {
    const result = await runMigrations(pool, migrationsDirectory);
    expect(result.applied).toHaveLength(4);
    const tables = await pool.query<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    expect(Number(tables.rows[0]!.count)).toBeGreaterThanOrEqual(18);
  });

  it('applies migrations repeatedly without changes', async () => {
    const result = await runMigrations(pool, migrationsDirectory);
    expect(result.applied).toEqual([]);
    expect(result.skipped).toHaveLength(4);
  });

  it('detects a changed applied migration', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'docflow-migrations-'));
    await cp(migrationsDirectory, temporaryDirectory, { recursive: true });
    const migrationPath = join(temporaryDirectory, '0001-reference-data.sql');
    await writeFile(migrationPath, `${await readFile(migrationPath, 'utf8')}\n-- changed\n`);
    await expect(runMigrations(pool, temporaryDirectory)).rejects.toThrow('has been modified');
  });

  it('creates and reads organizations, persons, and meetings through repositories', async () => {
    const organizations = new OrganizationRepository(pool);
    const organization = await organizations.create({
      name: 'Integration Organization',
      externalCode: 'IT-ORG'
    });
    expect((await organizations.findById(organization.id))?.name).toBe('Integration Organization');
    expect(await organizations.findAll()).toContainEqual(organization);

    const persons = new PersonRepository(pool);
    const person = await persons.create({
      fullName: 'Integration Person',
      externalId: 'it-person',
      organizationId: organization.id
    });
    expect((await persons.findById(person.id))?.fullName).toBe('Integration Person');
    expect(await persons.findAll()).toContainEqual(person);

    const meetings = new MeetingRepository(pool);
    const meeting = await meetings.create({
      title: 'Integration Meeting',
      scheduledStartAt: new Date('2026-09-01T09:00:00Z')
    });
    expect((await meetings.findById(meeting.id))?.title).toBe('Integration Meeting');
    expect(await meetings.findAll()).toContainEqual(meeting);
  });

  it('enforces protocol uniqueness, task invariants, and foreign keys', async () => {
    await seedDevelopmentDatabase(pool, 'test');
    const meeting = await pool.query<{ id: string }>(
      "SELECT id FROM meetings WHERE meeting_number = 'DEV-M-001'"
    );
    await expect(
      pool.query(
        "INSERT INTO protocols (meeting_id,protocol_number,protocol_date) VALUES ($1,'DUP-P','2026-08-03')",
        [meeting.rows[0]!.id]
      )
    ).rejects.toMatchObject({ code: '23505' });
    const task = await pool.query<{ decision_id: string; responsible_person_id: string }>(
      'SELECT decision_id,responsible_person_id FROM tasks LIMIT 1'
    );
    const values = task.rows[0]!;
    await expect(
      pool.query(
        "INSERT INTO tasks (task_code,decision_id,title,responsible_person_id) VALUES ('DEV-T-001',$1,'Duplicate',$2)",
        [values.decision_id, values.responsible_person_id]
      )
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        "INSERT INTO tasks (task_code,decision_id,title,responsible_person_id,progress_percent) VALUES ('BAD-PROGRESS',$1,'Bad',$2,101)",
        [values.decision_id, values.responsible_person_id]
      )
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "INSERT INTO tasks (task_code,decision_id,title,responsible_person_id,status,progress_percent) VALUES ('BAD-COMPLETE',$1,'Bad',$2,'COMPLETED',100)",
        [values.decision_id, values.responsible_person_id]
      )
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "INSERT INTO tasks (task_code,decision_id,title,responsible_person_id) VALUES ('BAD-FK',999999,'Bad',$1)",
        [values.responsible_person_id]
      )
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('rolls back a failed transaction', async () => {
    const before = await pool.query<{ count: string }>('SELECT count(*) FROM organizations');
    await expect(
      withTransaction(pool, async (client) => {
        await client.query(
          "INSERT INTO organizations (name,external_code) VALUES ('Rollback','ROLLBACK-ORG')"
        );
        await client.query(
          "INSERT INTO organizations (name,external_code) VALUES ('Duplicate','DEV-ORG-ALPHA')"
        );
      })
    ).rejects.toBeDefined();
    const after = await pool.query<{ count: string }>('SELECT count(*) FROM organizations');
    expect(after.rows[0]!.count).toBe(before.rows[0]!.count);
  });

  it('reports readiness with an available PostgreSQL database', async () => {
    const response = await request(
      createApp(pool, {
        error(): void {
          return;
        }
      })
    ).get('/api/v1/ready');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ready', database: 'available' } });
  });

  it('creates the complete development seed', async () => {
    const counts = await seedDevelopmentDatabase(pool, 'test');
    expect(counts).toMatchObject({
      organizations: 3,
      persons: 10,
      meetings: 2,
      protocols: 2,
      agendaItems: 5,
      discussions: 4,
      decisions: 3,
      tasks: 10,
      taskReviews: 3
    });
    const statuses = await pool.query<{ status: string }>(
      'SELECT DISTINCT status::text AS status FROM tasks'
    );
    const seedFacts = await pool.query<{
      information_discussions: string;
      status_history: string;
      deadline_history: string;
    }>(
      `SELECT (SELECT count(*) FROM discussions d WHERE d.result_type = 'INFORMATION_ONLY' AND NOT EXISTS (SELECT 1 FROM decisions x WHERE x.discussion_id = d.id)) AS information_discussions, (SELECT count(*) FROM task_status_history) AS status_history, (SELECT count(*) FROM task_deadline_history) AS deadline_history`
    );
    expect(Number(seedFacts.rows[0]!.information_discussions)).toBeGreaterThanOrEqual(1);
    expect(Number(seedFacts.rows[0]!.status_history)).toBeGreaterThanOrEqual(10);
    expect(Number(seedFacts.rows[0]!.deadline_history)).toBeGreaterThanOrEqual(1);
    expect(statuses.rows.map((row) => row.status).sort()).toEqual([
      'BLOCKED',
      'COMPLETED',
      'IN_PROGRESS',
      'NOT_STARTED'
    ]);
  });
  it('creates and displays a meeting through the Stage 3 API', async () => {
    await seedDevelopmentDatabase(pool, 'test');
    const application = createApp(pool, {
      error(): void {
        return;
      }
    });
    const created = await request(application).post('/api/v1/meetings').send({
      title: 'API Integration Meeting',
      meetingType: 'WORKING',
      meetingFormat: 'IN_PERSON',
      scheduledStartAt: '2026-10-01T09:00:00.000Z',
      location: 'Тестовая переговорная'
    });
    expect(created.status).toBe(201);
    const listed = await request(application).get('/api/v1/meetings?search=API%20Integration');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].title).toBe('API Integration Meeting');
    const details = await request(application).get(`/api/v1/meetings/${created.body.data.id}`);
    expect(details.status).toBe(200);
    expect(details.body.data.participants).toEqual([]);
  });
});
