import { ApplicationError } from '../../shared/errors/application-error.js';
import { MeetingRepository } from './meeting-repository.js';
import { ParticipantRepository } from './participant-repository.js';
import type { Participant, ParticipantRole } from './participant-repository.js';

interface DatabaseError {
  code?: unknown;
  constraint?: unknown;
}
export class ParticipantService {
  public constructor(
    private readonly participants: ParticipantRepository,
    private readonly meetings: MeetingRepository
  ) {}
  private async ensureEditable(meetingId: string): Promise<void> {
    if (!(await this.meetings.findById(meetingId)))
      throw new ApplicationError(404, 'MEETING_NOT_FOUND', 'Meeting was not found');
    if (await this.meetings.isArchived(meetingId))
      throw new ApplicationError(
        409,
        'MEETING_ARCHIVED',
        'Archived meeting participants cannot be edited'
      );
  }
  private conflict(error: unknown): never {
    const databaseError = error as DatabaseError;
    if (databaseError.code === '23505') {
      const role =
        databaseError.constraint === 'uq_meeting_participants_chairperson'
          ? 'chairperson'
          : databaseError.constraint === 'uq_meeting_participants_secretary'
            ? 'secretary'
            : null;
      throw new ApplicationError(
        409,
        role ? 'PARTICIPANT_ROLE_CONFLICT' : 'PARTICIPANT_ALREADY_EXISTS',
        role ? `The meeting already has a ${role}` : 'The employee is already a participant',
        error
      );
    }
    throw error;
  }
  public async create(
    meetingId: string,
    personId: string,
    role: ParticipantRole
  ): Promise<Participant> {
    await this.ensureEditable(meetingId);
    try {
      const item = await this.participants.create(meetingId, personId, role);
      if (!item)
        throw new ApplicationError(404, 'PERSON_NOT_FOUND', 'Active employee was not found');
      return item;
    } catch (error: unknown) {
      return this.conflict(error);
    }
  }
  public async updateRole(
    id: string,
    meetingId: string,
    role: ParticipantRole
  ): Promise<Participant> {
    await this.ensureEditable(meetingId);
    try {
      const item = await this.participants.updateRole(id, meetingId, role);
      if (!item)
        throw new ApplicationError(404, 'PARTICIPANT_NOT_FOUND', 'Participant was not found');
      return item;
    } catch (error: unknown) {
      return this.conflict(error);
    }
  }
  public async delete(id: string, meetingId: string): Promise<void> {
    await this.ensureEditable(meetingId);
    if (await this.participants.delete(id, meetingId)) return;
    if (await this.participants.exists(id, meetingId))
      throw new ApplicationError(
        409,
        'PARTICIPANT_ROLE_REQUIRED',
        'Change the chairperson or secretary role before deleting'
      );
    throw new ApplicationError(404, 'PARTICIPANT_NOT_FOUND', 'Participant was not found');
  }
}
