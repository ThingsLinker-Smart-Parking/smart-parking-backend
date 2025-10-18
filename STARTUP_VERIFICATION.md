# Support Ticket System - Startup Verification ✅

## Installation Completed

### ✅ Dependencies Installed
- `multer@2.0.2` - File upload middleware
- `@types/multer` - TypeScript types for multer

### ✅ Build Successful
TypeScript compilation completed with no errors.

---

## Server Status

The backend server should now be running successfully with the ticket system integrated.

### Quick Verification

1. **Check Server Logs**
   - Look for "Server running on port 3000" or similar
   - Should see "Database connected" message
   - No TypeScript compilation errors

2. **Verify Database Tables**
   Tables should be auto-created (synchronize=true in development):
   - `support_tickets` table
   - `ticket_messages` table

3. **Test API Endpoint**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return: `{"status":"healthy",...}`

4. **Check Swagger Docs**
   Visit: http://localhost:3000/api-docs
   - Look for "Support Tickets" section
   - Should see 10 ticket endpoints

---

## Testing the Ticket API

### Method 1: Using Test Script
```bash
# Update credentials in test-ticket-api.js first
node test-ticket-api.js
```

### Method 2: Using cURL

**1. Login to get token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

**2. Create a ticket:**
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test ticket",
    "description": "This is a test ticket to verify the API is working correctly",
    "category": "technical",
    "priority": "medium"
  }'
```

**3. Get all tickets:**
```bash
curl http://localhost:3000/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Method 3: Using Swagger UI
1. Go to http://localhost:3000/api-docs
2. Find "Support Tickets" section
3. Click "Try it out" on any endpoint
4. Add Bearer token in "Authorize" button
5. Execute requests

---

## File Upload Testing

### Create Ticket with Attachment
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Issue with node assignment" \
  -F "description=Cannot assign node to slot, see screenshot" \
  -F "category=technical" \
  -F "priority=high" \
  -F "attachments=@/path/to/screenshot.png"
```

### Send Message with Attachment
```bash
curl -X POST http://localhost:3000/api/tickets/TICKET_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "message=Here is the error log" \
  -F "attachments=@/path/to/error.log"
```

---

## Email Notification Testing

### Development Mode
Emails are logged to console in development:
```
📧 [DEV MODE] Ticket Notification to superadmin@example.com:
   Type: new_ticket
   Subject: New Support Ticket: #TICKET-202501-1234 - Test ticket
```

### Production Mode
With SMTP configured, actual emails will be sent:
- Check email inbox for notifications
- Verify HTML templates render correctly
- Test all notification types (new ticket, new message, status change)

---

## Troubleshooting

### Issue: Server won't start
**Solution:**
```bash
# Check for port conflicts
lsof -i :3000

# Rebuild
npm run build

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database errors
**Solution:**
```bash
# Check database connection in .env
DB_HOST=...
DB_PORT=5432
DB_USERNAME=...
DB_PASSWORD=...
DB_NAME=...

# Ensure synchronize is enabled in development
# Check src/data-source.ts: synchronize: true
```

### Issue: File upload fails
**Solution:**
```bash
# Ensure uploads directory exists
mkdir -p uploads/tickets

# Check permissions
chmod 755 uploads
chmod 755 uploads/tickets

# Verify multer configuration in src/routes/ticket.ts
```

### Issue: Email notifications not working
**Solution:**
- Check .env for SMTP settings
- In development, emails log to console (this is normal)
- For production, verify SMTP credentials
- Check emailService.ts configuration

---

## Next Steps

1. ✅ **Server Running** - Backend is operational
2. ⏭️ **Create Test User** - Use signup endpoint or seed data
3. ⏭️ **Create Super Admin** - Manually set role in database
4. ⏭️ **Test Full Workflow** - Create ticket → Message → Resolve
5. ⏭️ **Frontend Integration** - Start frontend and test UI
6. ⏭️ **Production Deploy** - Railway, Render, or your choice

---

## Quick Start Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Run tests
node test-ticket-api.js

# Check logs
tail -f logs/combined.log  # if logging to file
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tickets` | POST | Create ticket |
| `/api/tickets` | GET | Get all tickets |
| `/api/tickets/:id` | GET | Get ticket |
| `/api/tickets/:id` | PUT | Update ticket |
| `/api/tickets/:id` | DELETE | Close ticket |
| `/api/tickets/:id/messages` | GET | Get messages |
| `/api/tickets/:id/messages` | POST | Send message |
| `/api/tickets/:id/messages/read` | POST | Mark read |
| `/api/tickets/statistics` | GET | Get stats |
| `/api/tickets/unread-count` | GET | Get unread |

All endpoints require Bearer token authentication.

---

## Success Indicators

✅ Server starts without errors
✅ Database tables created automatically
✅ TypeScript compilation successful
✅ Swagger docs show ticket endpoints
✅ Test script passes all tests
✅ File uploads work correctly
✅ Email notifications log to console
✅ Authorization checks work properly

---

## Status: READY FOR TESTING 🚀

The support ticket system backend is fully operational and ready for integration testing with the frontend.
