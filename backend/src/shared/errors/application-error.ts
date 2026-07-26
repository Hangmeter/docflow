export class ApplicationError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = 'ApplicationError';
  }
}
