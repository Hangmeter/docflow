# REST API

## Stage 1 infrastructure endpoints

All endpoints use the `/api/v1` prefix. Every response includes `X-Request-Id`; a valid client-provided `X-Request-Id` is preserved.

### `GET /api/v1/health`

Liveness endpoint. It does not require a database query.

```json
{ "data": { "status": "ok" } }
```

### `GET /api/v1/ready`

Readiness endpoint. It verifies the minimal PostgreSQL connection using `SELECT 1`.

```json
{ "data": { "status": "ready", "database": "available" } }
```

Unexpected errors use the common format:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "uuid"
  }
}
```

If PostgreSQL is temporarily unavailable, readiness returns HTTP `503` without exposing connection details:

```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is not ready",
    "requestId": "uuid"
  }
}
```

## Stage 3 resources

- `GET|POST /api/v1/organizations`, `GET /api/v1/organizations/{organizationId}`
- `GET|POST /api/v1/departments`, `GET /api/v1/departments/{departmentId}`
- `GET|POST /api/v1/persons`, `GET /api/v1/persons/{personId}`
- `GET|POST /api/v1/meetings`, `GET|PUT /api/v1/meetings/{meetingId}`. `PUT` updates all
  meeting details and returns `MEETING_ARCHIVED` when the meeting's protocol is archived.
- `GET|POST /api/v1/meetings/{meetingId}/participants`
- `PATCH|DELETE /api/v1/meetings/{meetingId}/participants/{participantId}`

Meeting list query parameters are `search`, `meetingType`, `protocolStatus`, `from`, `to`, `limit`, and `offset`. All request bodies and identifiers are validated before repository calls. Domain errors use the common error envelope.
