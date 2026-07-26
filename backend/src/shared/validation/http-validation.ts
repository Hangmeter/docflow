import { ApplicationError } from '../errors/application-error.js';

export function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApplicationError(400, 'VALIDATION_ERROR', 'Request body must be an object');
  }
  return value as Record<string, unknown>;
}

export function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new ApplicationError(
      400,
      'VALIDATION_ERROR',
      `${field} must be a non-empty string up to ${maxLength} characters`
    );
  }
  return value.trim();
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength: number
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApplicationError(
      400,
      'VALIDATION_ERROR',
      `${field} must be a string up to ${maxLength} characters`
    );
  }
  return value.trim();
}

export function requireId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new ApplicationError(
      400,
      'VALIDATION_ERROR',
      `${field} must be a positive integer identifier`
    );
  }
  return value;
}

export function optionalId(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return requireId(value, field);
}

export function requireDateTime(value: unknown, field: string): Date {
  if (typeof value !== 'string')
    throw new ApplicationError(400, 'VALIDATION_ERROR', `${field} must be an ISO date-time`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new ApplicationError(400, 'VALIDATION_ERROR', `${field} must be an ISO date-time`);
  return date;
}

export function optionalEnum<Value extends string>(
  value: unknown,
  field: string,
  allowed: readonly Value[]
): Value | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as Value)) {
    throw new ApplicationError(400, 'VALIDATION_ERROR', `${field} has an unsupported value`);
  }
  return value as Value;
}

export function optionalEmail(value: unknown, field: string): string | null | undefined {
  const email = optionalString(value, field, 255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApplicationError(400, 'VALIDATION_ERROR', `${field} must be a valid email address`);
  }
  return email;
}

export function optionalUrl(value: unknown, field: string): string | null | undefined {
  const url = optionalString(value, field, 2000);
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    } catch {
      throw new ApplicationError(400, 'VALIDATION_ERROR', `${field} must be an HTTP or HTTPS URL`);
    }
  }
  return url;
}
