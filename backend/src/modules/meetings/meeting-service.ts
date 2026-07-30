import { ApplicationError } from '../../shared/errors/application-error.js';
import { MeetingRepository } from './meeting-repository.js';

import type { CreateMeetingInput, Meeting } from './meeting-repository.js';

export class MeetingService {
  public constructor(private readonly meetings: MeetingRepository) {}

  public async update(id: string, input: CreateMeetingInput): Promise<Meeting> {
    const item = await this.meetings.update(id, input);
    if (item) return item;

    const existing = await this.meetings.findById(id);
    if (!existing) throw new ApplicationError(404, 'MEETING_NOT_FOUND', 'Meeting was not found');
    if (await this.meetings.isArchived(id)) {
      throw new ApplicationError(409, 'MEETING_ARCHIVED', 'Archived meetings cannot be edited');
    }
    throw new ApplicationError(409, 'MEETING_NOT_UPDATED', 'Meeting could not be updated');
  }
}
