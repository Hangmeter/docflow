CREATE TYPE review_result AS ENUM ('NOT_REVIEWED', 'ACCEPTED', 'RETURNED_FOR_REVISION', 'DEADLINE_EXTENDED', 'CANCELLED');
CREATE TYPE reference_type AS ENUM ('WEB_LINK', 'DOCUMENT', 'FILE', 'EMAIL', 'OTHER');

CREATE TABLE task_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id bigint NOT NULL,
  previous_status task_status,
  new_status task_status NOT NULL,
  changed_by_person_id bigint,
  changed_at timestamptz NOT NULL DEFAULT now(),
  progress_percent integer,
  comment text,
  CONSTRAINT fk_task_status_history_tasks FOREIGN KEY (task_id) REFERENCES tasks (id),
  CONSTRAINT fk_task_status_history_persons FOREIGN KEY (changed_by_person_id) REFERENCES persons (id),
  CONSTRAINT chk_task_status_history_progress CHECK (progress_percent IS NULL OR progress_percent BETWEEN 0 AND 100)
);
CREATE INDEX idx_task_status_history_task_id ON task_status_history (task_id);
CREATE INDEX idx_task_status_history_changed_by_person_id ON task_status_history (changed_by_person_id);
CREATE INDEX idx_task_status_history_changed_at ON task_status_history (changed_at);
CREATE INDEX idx_task_status_history_new_status ON task_status_history (new_status);

CREATE TABLE task_deadline_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id bigint NOT NULL,
  previous_due_date date,
  new_due_date date,
  change_reason text NOT NULL,
  changed_by_person_id bigint,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_task_deadline_history_tasks FOREIGN KEY (task_id) REFERENCES tasks (id),
  CONSTRAINT fk_task_deadline_history_persons FOREIGN KEY (changed_by_person_id) REFERENCES persons (id)
);
CREATE INDEX idx_task_deadline_history_task_id ON task_deadline_history (task_id);
CREATE INDEX idx_task_deadline_history_changed_by_person_id ON task_deadline_history (changed_by_person_id);
CREATE INDEX idx_task_deadline_history_changed_at ON task_deadline_history (changed_at);

CREATE TABLE task_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id bigint NOT NULL,
  task_id bigint NOT NULL,
  reviewed_status task_status NOT NULL,
  reviewed_planned_due_date date,
  reviewed_actual_completion_date date,
  review_result review_result NOT NULL DEFAULT 'NOT_REVIEWED',
  comment text,
  reviewed_by_person_id bigint,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_reviews_meeting_task UNIQUE (meeting_id, task_id),
  CONSTRAINT fk_task_reviews_meetings FOREIGN KEY (meeting_id) REFERENCES meetings (id),
  CONSTRAINT fk_task_reviews_tasks FOREIGN KEY (task_id) REFERENCES tasks (id),
  CONSTRAINT fk_task_reviews_persons FOREIGN KEY (reviewed_by_person_id) REFERENCES persons (id)
);
CREATE INDEX idx_task_reviews_task_id ON task_reviews (task_id);
CREATE INDEX idx_task_reviews_reviewed_by_person_id ON task_reviews (reviewed_by_person_id);
CREATE INDEX idx_task_reviews_reviewed_status ON task_reviews (reviewed_status);
CREATE INDEX idx_task_reviews_review_result ON task_reviews (review_result);

CREATE TABLE discussion_references (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  discussion_id bigint NOT NULL,
  reference_type reference_type NOT NULL DEFAULT 'WEB_LINK',
  title varchar(500),
  uri text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_discussion_references_discussions FOREIGN KEY (discussion_id) REFERENCES discussions (id)
);
CREATE INDEX idx_discussion_references_discussion_id ON discussion_references (discussion_id);
CREATE INDEX idx_discussion_references_reference_type ON discussion_references (reference_type);

CREATE TABLE task_references (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id bigint NOT NULL,
  reference_type reference_type NOT NULL DEFAULT 'WEB_LINK',
  title varchar(500),
  uri text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_task_references_tasks FOREIGN KEY (task_id) REFERENCES tasks (id)
);
CREATE INDEX idx_task_references_task_id ON task_references (task_id);
CREATE INDEX idx_task_references_reference_type ON task_references (reference_type);
