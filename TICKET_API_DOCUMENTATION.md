# Support Ticket System API Documentation

## Overview

Complete backend implementation for the support ticket system with email notifications, file uploads, and role-based access control.

## Database Schema

### Tables Created

#### support_tickets
```sql
- id (uuid, primary key)
- ticketNumber (varchar(50), unique) - Auto-generated (e.g., TICKET-202501-1234)
- userId (uuid, foreign key to users)
- title (varchar(200))
- description (text)
- category (varchar(50)) - technical, billing, feature_request, bug_report, general, other
- priority (varchar(20)) - low, medium, high, urgent (default: medium)
- status (varchar(20)) - open, in_progress, resolved, unresolved, closed (default: open)
- assignedToId (uuid, nullable, foreign key to users)
- attachments (text[]) - Array of file URLs
- metadata (jsonb, nullable)
- resolvedAt (timestamp, nullable)
- closedAt (timestamp, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)
```

#### ticket_messages
```sql
- id (uuid, primary key)
- ticketId (uuid, foreign key to support_tickets, cascade delete)
- senderId (uuid, foreign key to users)
- senderType (varchar(20)) - user, admin, super_admin, system
- senderName (varchar(200), nullable) - Cached for display
- message (text)
- attachments (text[]) - Array of file URLs
- isRead (boolean, default: false)
- readAt (timestamp, nullable)
- metadata (jsonb, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)
```

## API Endpoints

### Base URL
```
/api/tickets
```

### Authentication
All endpoints require Bearer token authentication.

---

### 1. Create Ticket
**POST** `/api/tickets`

**Authorization:** User, Admin, Super Admin

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  title: string (min: 5, max: 200)
  description: string (min: 20, max: 2000)
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general' | 'other'
  priority?: 'low' | 'medium' | 'high' | 'urgent' (default: 'medium')
  attachments?: File[] (max 5 files, 5MB each)
}
```

**Response:**
```typescript
{
  success: true,
  message: "Ticket created successfully",
  data: {
    id: string
    ticketNumber: string
    userId: string
    title: string
    description: string
    category: string
    priority: string
    status: "open"
    assignedToId: null
    attachments: string[]
    createdAt: string
    updatedAt: string
    user: User
  }
}
```

**Actions:**
- Creates ticket with status "open"
- Auto-generates ticket number
- Sends email notification to all super admins
- Supports file attachments

---

### 2. Get All Tickets
**GET** `/api/tickets`

**Authorization:** User, Admin, Super Admin

**Query Parameters:**
```typescript
{
  page?: number (default: 1)
  limit?: number (default: 10)
  status?: 'open' | 'in_progress' | 'resolved' | 'unresolved' | 'closed'
  category?: 'technical' | 'billing' | etc.
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  userId?: string (super admin only)
  assignedToId?: string (super admin only)
  search?: string (searches title and description)
}
```

**Response:**
```typescript
{
  success: true,
  message: "Tickets fetched successfully",
  data: {
    data: SupportTicket[]
    meta: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrevious: boolean
    }
  }
}
```

**Authorization Logic:**
- Users/Admins: See only their own tickets
- Super Admins: See all tickets

---

### 3. Get Ticket by ID
**GET** `/api/tickets/:ticketId`

**Authorization:** Ticket owner or Super Admin

**Response:**
```typescript
{
  success: true,
  message: "Ticket fetched successfully",
  data: SupportTicket
}
```

**Errors:**
- 403: Access denied (if not ticket owner or super admin)
- 404: Ticket not found

---

### 4. Update Ticket
**PUT** `/api/tickets/:ticketId`

**Authorization:** Ticket owner or Super Admin

**Request:**
```typescript
{
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string (super admin only can change to in_progress, resolved, unresolved)
  assignedToId?: string (super admin only)
}
```

**Response:**
```typescript
{
  success: true,
  message: "Ticket updated successfully",
  data: SupportTicket
}
```

**Actions:**
- Updates ticket fields
- If status changes to resolved/unresolved/closed, sends email to ticket creator
- Updates resolvedAt/closedAt timestamps

**Restrictions:**
- Only super admins can assign tickets
- Only super admins can change status to in_progress, resolved, unresolved
- Users can only change status to open or closed

---

### 5. Delete (Close) Ticket
**DELETE** `/api/tickets/:ticketId`

**Authorization:** Ticket owner or Super Admin

**Response:**
```typescript
{
  success: true,
  message: "Ticket closed successfully"
}
```

**Actions:**
- Sets status to "closed"
- Sets closedAt timestamp
- Soft delete (ticket still exists in database)

---

### 6. Get Ticket Messages
**GET** `/api/tickets/:ticketId/messages`

**Authorization:** Ticket owner or Super Admin

**Response:**
```typescript
{
  success: true,
  message: "Messages fetched successfully",
  data: TicketMessage[]
}
```

**Errors:**
- 403: Access denied
- 404: Ticket not found

---

### 7. Send Message
**POST** `/api/tickets/:ticketId/messages`

**Authorization:** Ticket owner or Super Admin

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  message: string (required, non-empty)
  attachments?: File[] (max 5 files, 5MB each)
}
```

**Response:**
```typescript
{
  success: true,
  message: "Message sent successfully",
  data: TicketMessage
}
```

**Actions:**
- Creates message with auto-detected sender type
- Sends email notification:
  - If sender is user/admin → Notify assigned super admin or all super admins
  - If sender is super admin → Notify ticket creator

**Errors:**
- 400: Cannot send messages to a closed ticket
- 400: Message cannot be empty

---

### 8. Mark Messages as Read
**POST** `/api/tickets/:ticketId/messages/read`

**Authorization:** Authenticated user

**Request:**
```typescript
{
  messageIds: string[]
}
```

**Response:**
```typescript
{
  success: true,
  message: "Messages marked as read"
}
```

---

### 9. Get Statistics
**GET** `/api/tickets/statistics`

**Authorization:** Authenticated user

**Response:**
```typescript
{
  success: true,
  message: "Statistics fetched successfully",
  data: {
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    unresolvedTickets: number
    closedTickets: number
    ticketsByCategory: {
      technical: number
      billing: number
      ...
    }
    ticketsByPriority: {
      low: number
      medium: number
      high: number
      urgent: number
    }
  }
}
```

**Authorization Logic:**
- Users/Admins: Statistics for their own tickets
- Super Admins: Statistics for all tickets

---

### 10. Get Unread Count
**GET** `/api/tickets/unread-count`

**Authorization:** Authenticated user

**Response:**
```typescript
{
  success: true,
  message: "Unread count fetched successfully",
  data: {
    count: number
  }
}
```

**Logic:**
- Counts unread messages in user's tickets that were not sent by the user

---

## Email Notifications

### 1. New Ticket Created
**Recipients:** All super admins

**Trigger:** POST /api/tickets

**Template:** New ticket email with:
- Ticket number, title, category, priority
- Description
- Creator's name and email
- Link to view ticket

---

### 2. New Message
**Recipients:**
- If sender is user/admin: Assigned super admin (or all if unassigned)
- If sender is super admin: Ticket creator

**Trigger:** POST /api/tickets/:id/messages

**Template:** New message notification with:
- Ticket number
- Sender's name
- Message content
- Link to conversation

---

### 3. Status Changed
**Recipients:** Ticket creator

**Trigger:** PUT /api/tickets/:id (when status changes to resolved, unresolved, or closed)

**Template:** Status update email with:
- Ticket number and title
- New status (with color-coded badge)
- Link to view ticket

---

## File Upload Configuration

### Storage
- **Location:** `/uploads/tickets/`
- **Naming:** `{timestamp}-{random}.{ext}`

### Restrictions
- **Max file size:** 5MB per file
- **Max files:** 5 per upload
- **Allowed types:**
  - Images: jpeg, jpg, png, gif, webp
  - Documents: pdf, doc, docx

### Access
- Files served via `/uploads/tickets/{filename}`
- URLs stored in database as `/uploads/tickets/{filename}`

### Security
- Static file serving enabled for `/uploads` directory
- Files accessible to authenticated users only (implement middleware if needed)

---

## Models

### SupportTicket Model
```typescript
class SupportTicket {
  id: string
  ticketNumber: string
  userId: string
  user: User
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedToId: string | null
  assignedTo: User | null
  messages: TicketMessage[]
  attachments: string[]
  metadata: Record<string, any> | null
  resolvedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date

  // Methods
  updateStatus(status: TicketStatus): void
  canReceiveMessages(): boolean
  getAgeInDays(): number
}
```

### TicketMessage Model
```typescript
class TicketMessage {
  id: string
  ticketId: string
  ticket: SupportTicket
  senderId: string
  sender: User
  senderType: MessageSenderType
  senderName: string | null
  message: string
  attachments: string[]
  isRead: boolean
  readAt: Date | null
  metadata: Record<string, any> | null
  createdAt: Date
  updatedAt: Date

  // Methods
  markAsRead(): void
  static getSenderType(userRole: string): MessageSenderType
}
```

---

## Testing

### Test Script
Run the test script:
```bash
node test-ticket-api.js
```

### Prerequisites
1. Backend server running
2. Database migrations applied
3. Test user and super admin accounts created
4. Update credentials in test script

### Test Coverage
- User login
- Super admin login
- Create ticket
- Get all tickets
- Get ticket by ID
- Send message (user)
- Send message (super admin)
- Get messages
- Update ticket status
- Get statistics
- Resolve ticket
- Get unread count

---

## Environment Variables

Add to `.env`:
```env
# Frontend URL for email links
FRONTEND_URL=http://localhost:3000

# Email service (already configured)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
EMAIL=tag@thingslinker.com
EMAIL_PASSWORD=94Thingslinker94$
```

---

## Deployment Checklist

- [x] Database models created
- [x] Service layer implemented
- [x] Controllers created
- [x] Routes registered
- [x] Email notifications configured
- [x] File upload configured
- [x] Authentication middleware applied
- [x] Authorization checks implemented
- [x] Swagger documentation added
- [x] Test script created
- [ ] Run database synchronize or migration
- [ ] Test all endpoints
- [ ] Deploy to production

---

## Usage Examples

### Create Ticket (cURL)
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cannot assign node to parking slot",
    "description": "When I try to assign node ABC123 to slot A1, I get an error. Please help!",
    "category": "technical",
    "priority": "high"
  }'
```

### Send Message with Attachment (cURL)
```bash
curl -X POST http://localhost:3000/api/tickets/TICKET_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=Here is a screenshot of the error" \
  -F "attachments=@screenshot.png"
```

### Get Tickets with Filters (cURL)
```bash
curl "http://localhost:3000/api/tickets?status=open&priority=high&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Error Handling

All errors follow the standard format:
```typescript
{
  success: false,
  message: string,
  error?: string,
  errorCode?: string
}
```

### Common Error Codes
- 400: Invalid input
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (no permission)
- 404: Resource not found
- 500: Internal server error

---

## Integration with Frontend

The frontend implementation is already complete at `/Users/chetanmahajan/Documents/nodejs_backend/smart-parking-web`. Once the backend is deployed:

1. Start backend server
2. Database will auto-create tables (synchronize=true in development)
3. Test API endpoints
4. Frontend will connect automatically (already configured)

---

## Notes

- Ticket numbers are auto-generated in format: `TICKET-YYYYMM-XXXX`
- All timestamps are in ISO 8601 format
- Files are stored locally in `uploads/tickets/` directory
- Email notifications use existing emailService
- Super admins can see and manage all tickets
- Users/Admins can only see their own tickets
- Closed tickets cannot receive new messages
