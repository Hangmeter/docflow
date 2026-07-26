import type { Pool, PoolClient } from 'pg';

import { withTransaction } from '../database-client.js';

export interface SeedCounts {
  organizations: number;
  departments: number;
  persons: number;
  meetings: number;
  protocols: number;
  agendaItems: number;
  discussions: number;
  decisions: number;
  tasks: number;
  taskReviews: number;
}

async function insertReturningId(
  client: PoolClient,
  sql: string,
  values: unknown[]
): Promise<string> {
  const result = await client.query<{ id: string }>(sql, values);
  return result.rows[0]!.id;
}

export async function seedDevelopmentDatabase(
  pool: Pool,
  nodeEnvironment: string
): Promise<SeedCounts> {
  if (nodeEnvironment !== 'development' && nodeEnvironment !== 'test') {
    throw new Error('Development seed is allowed only when NODE_ENV is development or test');
  }
  const databaseResult = await pool.query<{ database_name: string }>(
    'SELECT current_database() AS database_name'
  );
  if (/prod(uction)?/i.test(databaseResult.rows[0]!.database_name)) {
    throw new Error('Refusing to seed a database whose name looks like production');
  }

  return withTransaction(pool, async (client) => {
    await client.query('TRUNCATE TABLE organizations RESTART IDENTITY CASCADE');
    const organizationIds: string[] = [];
    for (const [name, shortName, code] of [
      ['Альфа Проект', 'Альфа', 'DEV-ORG-ALPHA'],
      ['Бета Лаб', 'Бета', 'DEV-ORG-BETA'],
      ['Гамма Сервис', 'Гамма', 'DEV-ORG-GAMMA']
    ])
      organizationIds.push(
        await insertReturningId(
          client,
          'INSERT INTO organizations (name, short_name, external_code) VALUES ($1,$2,$3) RETURNING id',
          [name, shortName, code]
        )
      );

    const departmentIds: string[] = [];
    for (const [organizationId, name] of [
      [organizationIds[0], 'Разработка'],
      [organizationIds[0], 'Управление проектами'],
      [organizationIds[1], 'Испытательная лаборатория'],
      [organizationIds[2], 'Эксплуатация']
    ])
      departmentIds.push(
        await insertReturningId(
          client,
          'INSERT INTO departments (organization_id, name) VALUES ($1,$2) RETURNING id',
          [organizationId, name]
        )
      );

    const personIds: string[] = [];
    for (let index = 1; index <= 10; index += 1) {
      personIds.push(
        await insertReturningId(
          client,
          'INSERT INTO persons (external_id, full_name, email, organization_id, department_id, position_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [
            `dev-person-${index}`,
            `Тестовый Сотрудник ${index}`,
            `dev-person-${index}@example.test`,
            organizationIds[(index - 1) % 3],
            departmentIds[(index - 1) % 4],
            index === 1 ? 'Руководитель' : 'Специалист'
          ]
        )
      );
    }

    const meetingIds = [
      await insertReturningId(
        client,
        `INSERT INTO meetings (meeting_number,title,meeting_type,meeting_format,scheduled_start_at,scheduled_end_at,next_meeting_at) VALUES ($1,$2,'PLANNED','HYBRID',$3,$4,$5) RETURNING id`,
        [
          'DEV-M-001',
          'Планирование испытательного контура',
          new Date('2026-08-03T09:00:00Z'),
          new Date('2026-08-03T11:00:00Z'),
          new Date('2026-08-17T09:00:00Z')
        ]
      ),
      await insertReturningId(
        client,
        `INSERT INTO meetings (meeting_number,title,meeting_type,meeting_format,scheduled_start_at,scheduled_end_at) VALUES ($1,$2,'PLANNED','VIDEO_CONFERENCE',$3,$4) RETURNING id`,
        [
          'DEV-M-002',
          'Контроль выполнения плана',
          new Date('2026-08-17T09:00:00Z'),
          new Date('2026-08-17T10:30:00Z')
        ]
      )
    ];
    const protocolIds = [
      await insertReturningId(
        client,
        `INSERT INTO protocols (meeting_id,protocol_number,protocol_date,status,title) VALUES ($1,$2,$3,'APPROVED',$4) RETURNING id`,
        [meetingIds[0], 'DEV-P-001', '2026-08-03', 'Протокол планирования']
      ),
      await insertReturningId(
        client,
        `INSERT INTO protocols (meeting_id,protocol_number,protocol_date,status,title) VALUES ($1,$2,$3,'DRAFT',$4) RETURNING id`,
        [meetingIds[1], 'DEV-P-002', '2026-08-17', 'Протокол контроля']
      )
    ];
    await client.query(
      `INSERT INTO meeting_participants (meeting_id,person_id,participant_role,attendance_status,position_snapshot) VALUES ($1,$2,'CHAIRPERSON','PRESENT','Руководитель'),($1,$3,'SECRETARY','PRESENT','Специалист'),($4,$2,'CHAIRPERSON','PRESENT','Руководитель'),($4,$3,'SECRETARY','PRESENT','Специалист')`,
      [meetingIds[0], personIds[0], personIds[1], meetingIds[1]]
    );

    const agendaIds: string[] = [];
    const agendaData: Array<[string, string, string, number]> = [
      [meetingIds[0]!, '1', 'Состояние проекта', 1],
      [meetingIds[0]!, '2', 'План работ', 2],
      [meetingIds[0]!, '3', 'Испытания', 3],
      [meetingIds[1]!, '1', 'Контроль задач', 1],
      [meetingIds[1]!, '2', 'Следующие шаги', 2]
    ];
    for (const [meetingId, number, title, order] of agendaData)
      agendaIds.push(
        await insertReturningId(
          client,
          'INSERT INTO agenda_items (meeting_id,item_number,title,sort_order) VALUES ($1,$2,$3,$4) RETURNING id',
          [meetingId, number, title, order]
        )
      );

    const discussionIds = [
      await insertReturningId(
        client,
        `INSERT INTO discussions (protocol_id,agenda_item_id,subject,result_type,sequence_number) VALUES ($1,$2,$3,'INFORMATION_ONLY',1) RETURNING id`,
        [protocolIds[0], agendaIds[0], 'Информация о текущем состоянии']
      ),
      await insertReturningId(
        client,
        `INSERT INTO discussions (protocol_id,agenda_item_id,subject,result_type,sequence_number) VALUES ($1,$2,$3,'DECISION_MADE',1) RETURNING id`,
        [protocolIds[0], agendaIds[1], 'Планирование разработки']
      ),
      await insertReturningId(
        client,
        `INSERT INTO discussions (protocol_id,agenda_item_id,subject,result_type,sequence_number) VALUES ($1,$2,$3,'DECISION_MADE',1) RETURNING id`,
        [protocolIds[0], agendaIds[2], 'Организация испытаний']
      ),
      await insertReturningId(
        client,
        `INSERT INTO discussions (protocol_id,agenda_item_id,subject,result_type,sequence_number) VALUES ($1,$2,$3,'DECISION_MADE',1) RETURNING id`,
        [protocolIds[1], agendaIds[3], 'Результаты контроля']
      )
    ];
    const decisionIds: string[] = [];
    for (let index = 1; index <= 3; index += 1)
      decisionIds.push(
        await insertReturningId(
          client,
          `INSERT INTO decisions (discussion_id,decision_number,decision_text,status) VALUES ($1,1,$2,'ADOPTED') RETURNING id`,
          [discussionIds[index], `Вымышленное решение ${index}`]
        )
      );

    const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const;
    const taskIds: string[] = [];
    for (let index = 1; index <= 10; index += 1) {
      const status = statuses[(index - 1) % statuses.length]!;
      const isCompleted = status === 'COMPLETED';
      taskIds.push(
        await insertReturningId(
          client,
          `INSERT INTO tasks (task_code,decision_id,title,responsible_person_id,assigned_by_person_id,status,priority,planned_start_date,planned_due_date,actual_start_date,actual_completion_date,progress_percent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [
            `DEV-T-${String(index).padStart(3, '0')}`,
            decisionIds[(index - 1) % 3],
            `Вымышленная задача ${index}`,
            personIds[index % 10],
            personIds[0],
            status,
            index === 3 ? 'HIGH' : 'NORMAL',
            '2026-08-04',
            '2026-08-14',
            status === 'NOT_STARTED' ? null : '2026-08-04',
            isCompleted ? '2026-08-12' : null,
            isCompleted ? 100 : status === 'IN_PROGRESS' ? 50 : 0
          ]
        )
      );
    }
    for (let index = 0; index < taskIds.length; index += 1)
      await client.query(
        'INSERT INTO task_status_history (task_id,previous_status,new_status,changed_by_person_id,progress_percent,comment) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          taskIds[index],
          null,
          statuses[index % 4],
          personIds[0],
          statuses[index % 4] === 'COMPLETED' ? 100 : 0,
          'Начальное состояние development seed'
        ]
      );
    await client.query(
      'INSERT INTO task_deadline_history (task_id,previous_due_date,new_due_date,change_reason,changed_by_person_id) VALUES ($1,$2,$3,$4,$5)',
      [taskIds[0], '2026-08-12', '2026-08-14', 'Уточнение вымышленного графика', personIds[0]]
    );
    for (let index = 0; index < 3; index += 1)
      await client.query(
        `INSERT INTO task_reviews (meeting_id,task_id,reviewed_status,reviewed_planned_due_date,review_result,comment,reviewed_by_person_id,reviewed_at) VALUES ($1,$2,$3,$4,'ACCEPTED',$5,$6,$7)`,
        [
          meetingIds[1],
          taskIds[index],
          statuses[index % 4],
          '2026-08-14',
          'Вымышленный результат контроля',
          personIds[0],
          new Date('2026-08-17T09:30:00Z')
        ]
      );

    return {
      organizations: 3,
      departments: 4,
      persons: 10,
      meetings: 2,
      protocols: 2,
      agendaItems: 5,
      discussions: 4,
      decisions: 3,
      tasks: 10,
      taskReviews: 3
    };
  });
}
