CREATE TYPE discussion_result_type AS ENUM ('INFORMATION_ONLY', 'DECISION_MADE', 'POSTPONED', 'NO_DECISION');
CREATE TYPE decision_status AS ENUM ('DRAFT', 'ADOPTED', 'CANCELLED', 'SUPERSEDED');
CREATE TYPE task_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OVERDUE');
CREATE TYPE task_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

CREATE TABLE discussions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  protocol_id bigint NOT NULL,
  agenda_item_id bigint NOT NULL,
  subject varchar(500) NOT NULL,
  discussion_text text,
  result_type discussion_result_type NOT NULL DEFAULT 'INFORMATION_ONLY',
  sequence_number integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_discussions_protocols FOREIGN KEY (protocol_id) REFERENCES protocols (id),
  CONSTRAINT fk_discussions_agenda_items FOREIGN KEY (agenda_item_id) REFERENCES agenda_items (id),
  CONSTRAINT uq_discussions_protocol_agenda_sequence UNIQUE (protocol_id, agenda_item_id, sequence_number),
  CONSTRAINT chk_discussions_sequence_number CHECK (sequence_number > 0),
  CONSTRAINT chk_discussions_period CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX idx_discussions_protocol_id ON discussions (protocol_id);
CREATE INDEX idx_discussions_agenda_item_id ON discussions (agenda_item_id);
CREATE INDEX idx_discussions_result_type ON discussions (result_type);

CREATE TABLE discussion_speakers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discussion_id bigint NOT NULL,
  person_id bigint NOT NULL,
  speech_order integer,
  speech_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_discussion_speakers_discussion_person UNIQUE (discussion_id, person_id),
  CONSTRAINT fk_discussion_speakers_discussions FOREIGN KEY (discussion_id) REFERENCES discussions (id),
  CONSTRAINT fk_discussion_speakers_persons FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT chk_discussion_speakers_speech_order CHECK (speech_order IS NULL OR speech_order > 0)
);
CREATE INDEX idx_discussion_speakers_discussion_id ON discussion_speakers (discussion_id);
CREATE INDEX idx_discussion_speakers_person_id ON discussion_speakers (person_id);

CREATE TABLE decisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discussion_id bigint NOT NULL,
  decision_number integer NOT NULL,
  decision_text text NOT NULL,
  status decision_status NOT NULL DEFAULT 'ADOPTED',
  adopted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_decisions_discussions FOREIGN KEY (discussion_id) REFERENCES discussions (id),
  CONSTRAINT uq_decisions_discussion_number UNIQUE (discussion_id, decision_number),
  CONSTRAINT chk_decisions_decision_number CHECK (decision_number > 0)
);
CREATE INDEX idx_decisions_discussion_id ON decisions (discussion_id);
CREATE INDEX idx_decisions_status ON decisions (status);

CREATE TABLE tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_code varchar(50) NOT NULL,
  decision_id bigint NOT NULL,
  title varchar(500) NOT NULL,
  description text,
  responsible_person_id bigint NOT NULL,
  assigned_by_person_id bigint,
  status task_status NOT NULL DEFAULT 'NOT_STARTED',
  priority task_priority NOT NULL DEFAULT 'NORMAL',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  planned_start_date date,
  planned_due_date date,
  planned_due_text varchar(255),
  actual_start_date date,
  actual_completion_date date,
  progress_percent integer NOT NULL DEFAULT 0,
  completion_result text,
  current_comment text,
  parent_task_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tasks_task_code UNIQUE (task_code),
  CONSTRAINT fk_tasks_decisions FOREIGN KEY (decision_id) REFERENCES decisions (id),
  CONSTRAINT fk_tasks_responsible_person FOREIGN KEY (responsible_person_id) REFERENCES persons (id),
  CONSTRAINT fk_tasks_assigned_by_person FOREIGN KEY (assigned_by_person_id) REFERENCES persons (id),
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id) REFERENCES tasks (id),
  CONSTRAINT chk_tasks_progress_percent CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_tasks_actual_dates CHECK (actual_completion_date IS NULL OR actual_start_date IS NULL OR actual_completion_date >= actual_start_date),
  CONSTRAINT chk_tasks_completed CHECK (status <> 'COMPLETED' OR (progress_percent = 100 AND actual_completion_date IS NOT NULL)),
  CONSTRAINT chk_tasks_planned_dates CHECK (planned_due_date IS NULL OR planned_start_date IS NULL OR planned_due_date >= planned_start_date)
);
CREATE INDEX idx_tasks_decision_id ON tasks (decision_id);
CREATE INDEX idx_tasks_responsible_person_id ON tasks (responsible_person_id);
CREATE INDEX idx_tasks_assigned_by_person_id ON tasks (assigned_by_person_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_planned_due_date ON tasks (planned_due_date);
CREATE INDEX idx_tasks_parent_task_id ON tasks (parent_task_id);

CREATE TABLE task_coexecutors (
  task_id bigint NOT NULL,
  person_id bigint NOT NULL,
  role_description varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_task_coexecutors PRIMARY KEY (task_id, person_id),
  CONSTRAINT fk_task_coexecutors_tasks FOREIGN KEY (task_id) REFERENCES tasks (id),
  CONSTRAINT fk_task_coexecutors_persons FOREIGN KEY (person_id) REFERENCES persons (id)
);
CREATE INDEX idx_task_coexecutors_person_id ON task_coexecutors (person_id);

CREATE FUNCTION validate_discussion_meeting_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM protocols p
    JOIN agenda_items a ON a.meeting_id = p.meeting_id
    WHERE p.id = NEW.protocol_id AND a.id = NEW.agenda_item_id
  ) THEN
    RAISE EXCEPTION 'Discussion protocol and agenda item must belong to the same meeting'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_discussions_meeting_chain
BEFORE INSERT OR UPDATE OF protocol_id, agenda_item_id ON discussions
FOR EACH ROW EXECUTE FUNCTION validate_discussion_meeting_chain();
