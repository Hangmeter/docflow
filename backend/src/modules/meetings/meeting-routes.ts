import { Router } from 'express';
import { ApplicationError } from '../../shared/errors/application-error.js';
import {
  optionalEnum,
  optionalString,
  optionalUrl,
  requireDateTime,
  requireId,
  requireObject,
  requireString
} from '../../shared/validation/http-validation.js';
import { MeetingRepository } from './meeting-repository.js';
import { ParticipantRepository } from './participant-repository.js';
import type { QueryClient } from '../../infrastructure/database/database-client.js';
import type { CreateMeetingInput, MeetingFormat, MeetingType } from './meeting-repository.js';
import type { AttendanceStatus, ParticipantRole } from './participant-repository.js';
const TYPES = ['PLANNED', 'EXTRAORDINARY', 'WORKING', 'OTHER'] as const;
const FORMATS = ['IN_PERSON', 'VIDEO_CONFERENCE', 'HYBRID', 'OTHER'] as const;
const PROTOCOL_STATUSES = ['DRAFT', 'ON_APPROVAL', 'APPROVED', 'ARCHIVED', 'CANCELLED'] as const;
const ROLES = ['CHAIRPERSON', 'SECRETARY', 'MEMBER', 'INVITED', 'EXPERT', 'OBSERVER'] as const;
const ATTENDANCE = ['PRESENT', 'ABSENT', 'PARTIALLY_PRESENT', 'REMOTE', 'NOT_CONFIRMED'] as const;
function parseMeeting(bodyValue: unknown): CreateMeetingInput {
  const body = requireObject(bodyValue);
  const scheduledStartAt = requireDateTime(body.scheduledStartAt, 'scheduledStartAt');
  const scheduledEndAt = body.scheduledEndAt
    ? requireDateTime(body.scheduledEndAt, 'scheduledEndAt')
    : null;
  if (scheduledEndAt && scheduledEndAt < scheduledStartAt)
    throw new ApplicationError(
      400,
      'VALIDATION_ERROR',
      'scheduledEndAt must not precede scheduledStartAt'
    );
  return {
    meetingNumber: optionalString(body.meetingNumber, 'meetingNumber', 50),
    title: requireString(body.title, 'title', 500),
    meetingType: optionalEnum<MeetingType>(body.meetingType, 'meetingType', TYPES),
    meetingFormat: optionalEnum<MeetingFormat>(body.meetingFormat, 'meetingFormat', FORMATS),
    scheduledStartAt,
    scheduledEndAt,
    location: optionalString(body.location, 'location', 500),
    conferenceUrl: optionalUrl(body.conferenceUrl, 'conferenceUrl'),
    nextMeetingAt: body.nextMeetingAt ? requireDateTime(body.nextMeetingAt, 'nextMeetingAt') : null,
    specialNotes: optionalString(body.specialNotes, 'specialNotes', 10000)
  };
}
function pageNumber(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value))
    throw new ApplicationError(
      400,
      'VALIDATION_ERROR',
      'Pagination parameters must be non-negative integers'
    );
  return Math.min(Number(value), max);
}
export function createMeetingRouter(database: QueryClient): Router {
  const router = Router();
  const meetings = new MeetingRepository(database);
  const participants = new ParticipantRepository(database);
  router.get('/', async (request, response) => {
    const meetingType = optionalEnum<MeetingType>(request.query.meetingType, 'meetingType', TYPES);
    const from = request.query.from ? requireDateTime(request.query.from, 'from') : undefined;
    const to = request.query.to ? requireDateTime(request.query.to, 'to') : undefined;
    const data = await meetings.findAll({
      search: optionalString(request.query.search, 'search', 500) ?? undefined,
      meetingType,
      protocolStatus: optionalEnum(
        request.query.protocolStatus,
        'protocolStatus',
        PROTOCOL_STATUSES
      ),
      from,
      to,
      limit: pageNumber(request.query.limit, 25, 100),
      offset: pageNumber(request.query.offset, 0, 100000)
    });
    response.json({ data });
  });
  router.post('/', async (request, response) =>
    response.status(201).json({ data: await meetings.create(parseMeeting(request.body)) })
  );
  router.get('/:meetingId', async (request, response) => {
    const id = requireId(request.params.meetingId, 'meetingId');
    const item = await meetings.findById(id);
    if (!item) throw new ApplicationError(404, 'MEETING_NOT_FOUND', 'Meeting was not found');
    response.json({ data: { ...item, participants: await participants.findAll(id) } });
  });
  router.put('/:meetingId', async (request, response) => {
    const item = await meetings.update(
      requireId(request.params.meetingId, 'meetingId'),
      parseMeeting(request.body)
    );
    if (!item) throw new ApplicationError(404, 'MEETING_NOT_FOUND', 'Meeting was not found');
    response.json({ data: item });
  });
  router.get('/:meetingId/participants', async (request, response) =>
    response.json({
      data: await participants.findAll(requireId(request.params.meetingId, 'meetingId'))
    })
  );
  router.post('/:meetingId/participants', async (request, response) => {
    const body = requireObject(request.body);
    const item = await participants.create(
      requireId(request.params.meetingId, 'meetingId'),
      requireId(body.personId, 'personId'),
      optionalEnum<ParticipantRole>(body.participantRole, 'participantRole', ROLES) ?? 'MEMBER',
      optionalEnum<AttendanceStatus>(body.attendanceStatus, 'attendanceStatus', ATTENDANCE) ??
        'NOT_CONFIRMED'
    );
    if (!item) throw new ApplicationError(404, 'PERSON_NOT_FOUND', 'Person was not found');
    response.status(201).json({ data: item });
  });
  router.patch('/:meetingId/participants/:participantId', async (request, response) => {
    const body = requireObject(request.body);
    const item = await participants.updateAttendance(
      requireId(request.params.participantId, 'participantId'),
      requireId(request.params.meetingId, 'meetingId'),
      optionalEnum<AttendanceStatus>(body.attendanceStatus, 'attendanceStatus', ATTENDANCE) ??
        'NOT_CONFIRMED'
    );
    if (!item)
      throw new ApplicationError(404, 'PARTICIPANT_NOT_FOUND', 'Participant was not found');
    response.json({ data: item });
  });
  router.delete('/:meetingId/participants/:participantId', async (request, response) => {
    const deleted = await participants.delete(
      requireId(request.params.participantId, 'participantId'),
      requireId(request.params.meetingId, 'meetingId')
    );
    if (!deleted)
      throw new ApplicationError(404, 'PARTICIPANT_NOT_FOUND', 'Participant was not found');
    response.status(204).send();
  });
  return router;
}
