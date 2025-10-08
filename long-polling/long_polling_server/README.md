# Long Polling Notification Server

This server implements a simple Long Polling mechanism for real-time task status updates.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
   The server runs on http://localhost:3001

## Endpoints

- `POST /update-status` — Update the task status (admin action)
  - Body: `{ "status": "<new status>" }`
- `GET /poll-status?last_version=<number>` — Long Polling for status updates

## Example Statuses
- En attente
- En cours
- Terminée
- Échec

## Testing
- Use Postman/curl to POST to `/update-status`.
- Use browser or curl to GET `/poll-status?last_version=0`.

## Next Steps
Implement the client (front-end) in a separate folder.
