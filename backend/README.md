# Retro Bot Backend

## Azure AD auth flow

The backend now supports Microsoft Teams SSO token exchange through:

- `POST /api/auth/teams`

Request body:

```json
{
  "ssoToken": "<teams-sso-token>"
}
```

Response body:

```json
{
  "token": "<backend-jwt>",
  "user": {
    "id": "<azure-oid>",
    "tenantId": "<tenant-id>",
    "name": "Ada Lovelace",
    "username": "ada@contoso.com"
  },
  "expiresIn": "24h"
}
```

Use the returned JWT for all protected API calls:

```http
Authorization: Bearer <backend-jwt>
```

Use the same JWT for Socket.IO:

```ts
io("http://localhost:3000", {
  auth: { token: backendJwt },
});
```

## Environment

Copy `backend/.env.example` and fill in:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_AUDIENCE`
- `DATABASE_URL`
- `FRONTEND_URL`

## Development fallback

The backend still keeps a development fallback so the app can run outside Teams:

- HTTP requests may still use `x-user-id` in development.
- Socket connections may still send a plain dev token in development.

This fallback should be removed only after the Teams frontend flow is fully validated in your target environment.
