# SplitEasy Backend

A RESTful API backend for the SplitEasy expense splitting application.

## Features

- **Authentication**: Magic link authentication via Supabase
- **Groups**: Create and manage expense splitting groups
- **Expenses**: Add and track expenses within groups
- **Balances**: Calculate and retrieve group member balances
- **Security**: JWT token authentication, CORS protection, input validation

## API Endpoints

### Authentication
- `POST /api/auth/login` - Send magic link to email
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Groups
- `POST /api/groups` - Create a new group
- `GET /api/groups` - Get all groups for current user
- `GET /api/groups/:id` - Get specific group
- `GET /api/groups/:id/balances` - Get group member balances

### Expenses
- `POST /api/expenses` - Create a new expense
- `GET /api/expenses?groupId=:id` - Get expenses for a group
- `GET /api/expenses/:id` - Get specific expense

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp env.example .env
   ```

3. Configure your `.env` file with:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `PORT`: Server port (default: 3001)
   - `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

The backend uses Supabase with the following main tables:
- `groups` - Expense splitting groups
- `group_members` - Group membership
- `expenses` - Individual expenses
- `expense_participants` - Who owes what for each expense
- `profiles` - User profile information

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
