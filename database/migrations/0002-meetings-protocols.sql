CREATE TYPE meeting_type AS ENUM ('PLANNED', 'EXTRAORDINARY', 'WORKING', 'OTHER');
CREATE TYPE meeting_format AS ENUM ('IN_PERSON', 'VIDEO_CONFERENCE', 'HYBRID', 'OTHER');
CREATE TYPE protocol_status AS ENUM ('DRAFT', 'ON_APPROVAL', 'APPROVED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE participant_role AS ENUM ('CHAIRPERSON', 'SECRETARY', 'MEMBER', 'INVITED', 'EXPERT', 'OBSERVER');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'PARTIALLY_PRESENT', 'REMOTE', 'NOT_CONFIRMED');

CREATE TABLE meetings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_number varchar(50),
  title varchar(500) NOT NULL,
  meeting_type meeting_type NOT NULL DEFAULT 'PLANNED',
  meeting_format meeting_format NOT NULL DEFAULT 'VIDEO_CONFERENCE',
  scheduled_start_at timestamptz NOT NULL,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  location varchar(500),
  conference_url text,
  next_meeting_at timestamptz,
  special_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_meetings_scheduled_period CHECK (scheduled_end_at IS NULL OR scheduled_end_at >= scheduled_start_at),
  CONSTRAINT chk_meetings_actual_period CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at)
);
CREATE INDEX idx_meetings_meeting_number ON meetings (meeting_number);
CREATE INDEX idx_meetings_scheduled_start_at ON meetings (scheduled_start_at);
CREATE INDEX idx_meetings_meeting_type ON meetings (meeting_type);

CREATE TABLE protocols (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id bigint NOT NULL,
  protocol_number varchar(50) NOT NULL,
  protocol_date date NOT NULL,
  status protocol_status NOT NULL DEFAULT 'DRAFT',
  title varchar(500),
  introductory_text text,
  conclusion_text text,
  approved_at timestamptz,
  approved_by_person_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_protocols_meeting_id UNIQUE (meeting_id),
  CONSTRAINT uq_protocols_protocol_number UNIQUE (protocol_number),
  CONSTRAINT fk_protocols_meetings FOREIGN KEY (meeting_id) REFERENCES meetings (id),
  CONSTRAINT fk_protocols_approved_by_person FOREIGN KEY (approved_by_person_id) REFERENCES persons (id)
);
CREATE INDEX idx_protocols_protocol_date ON protocols (protocol_date);
CREATE INDEX idx_protocols_status ON protocols (status);
CREATE INDEX idx_protocols_approved_by_person_id ON protocols (approved_by_person_id);

CREATE TABLE meeting_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id bigint NOT NULL,
  person_id bigint NOT NULL,
  participant_role participant_role NOT NULL DEFAULT 'MEMBER',
  attendance_status attendance_status NOT NULL DEFAULT 'NOT_CONFIRMED',
  attendance_start_at timestamptz,
  attendance_end_at timestamptz,
  position_snapshot varchar(255),
  department_snapshot varchar(255),
  organization_snapshot varchar(255),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_meeting_participants_meeting_person_role UNIQUE (meeting_id, person_id, participant_role),
  CONSTRAINT fk_meeting_participants_meetings FOREIGN KEY (meeting_id) REFERENCES meetings (id),
  CONSTRAINT fk_meeting_participants_persons FOREIGN KEY (person_id) REFERENCES persons (id),
  CONSTRAINT chk_meeting_participants_attendance_period CHECK (attendance_end_at IS NULL OR attendance_start_at IS NULL OR attendance_end_at >= attendance_start_at)
);
CREATE INDEX idx_meeting_participants_meeting_id ON meeting_participants (meeting_id);
CREATE INDEX idx_meeting_participants_person_id ON meeting_participants (person_id);
CREATE INDEX idx_meeting_participants_attendance_status ON meeting_participants (attendance_status);

CREATE TABLE agenda_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id bigint NOT NULL,
  parent_agenda_item_id bigint,
  item_number varchar(30) NOT NULL,
  title varchar(500) NOT NULL,
  description text,
  sort_order integer NOT NULL,
  is_planned boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agenda_items_meeting_number UNIQUE (meeting_id, item_number),
  CONSTRAINT fk_agenda_items_meetings FOREIGN KEY (meeting_id) REFERENCES meetings (id),
  CONSTRAINT fk_agenda_items_parent FOREIGN KEY (parent_agenda_item_id) REFERENCES agenda_items (id),
  CONSTRAINT chk_agenda_items_sort_order CHECK (sort_order >= 0)
);
CREATE INDEX idx_agenda_items_meeting_sort_order ON agenda_items (meeting_id, sort_order);
CREATE INDEX idx_agenda_items_parent_agenda_item_id ON agenda_items (parent_agenda_item_id);
