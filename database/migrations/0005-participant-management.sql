ALTER TABLE meeting_participants ADD COLUMN full_name_snapshot varchar(255);

UPDATE meeting_participants mp SET full_name_snapshot = p.full_name
FROM persons p WHERE p.id = mp.person_id;

ALTER TABLE meeting_participants ALTER COLUMN full_name_snapshot SET NOT NULL;
ALTER TABLE meeting_participants DROP CONSTRAINT uq_meeting_participants_meeting_person_role;
ALTER TABLE meeting_participants ADD CONSTRAINT uq_meeting_participants_meeting_person UNIQUE (meeting_id, person_id);

CREATE UNIQUE INDEX uq_meeting_participants_chairperson ON meeting_participants (meeting_id)
  WHERE participant_role = 'CHAIRPERSON';
CREATE UNIQUE INDEX uq_meeting_participants_secretary ON meeting_participants (meeting_id)
  WHERE participant_role = 'SECRETARY';
