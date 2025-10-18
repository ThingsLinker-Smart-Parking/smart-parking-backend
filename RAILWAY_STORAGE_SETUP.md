# Railway Storage Setup for File Uploads

## Issue
Railway uses **ephemeral storage** by default, meaning uploaded files (like ticket attachments) will be lost when:
- The service restarts
- A new deployment occurs
- The container is rebuilt

## Quick Fix: Railway Volumes

### Steps to Add Persistent Storage:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Navigate to your `smart-parking-backend` service

2. **Create a Volume**
   - Click on the "Volumes" tab
   - Click "New Volume"
   - Configure:
     - **Name**: `ticket-uploads` (or any name)
     - **Mount Path**: `/app/uploads`
     - **Size**: Start with 1GB (can increase later)

3. **Redeploy Service**
   - After creating the volume, Railway will automatically redeploy
   - The `/app/uploads` directory will now persist across deployments

4. **Verify**
   - Upload a test image via a ticket
   - Access the image URL
   - Redeploy the service
   - Verify the image is still accessible

### Current Upload Locations:
- Ticket attachments: `/app/uploads/tickets/`

## Long-term Solution: Cloud Storage (Recommended)

For production, consider migrating to cloud storage:

### Option A: AWS S3
- Unlimited storage
- Built-in CDN with CloudFront
- Pay only for what you use
- Industry standard

### Option B: Cloudinary
- Image optimization built-in
- Automatic format conversion
- Free tier: 25GB storage, 25GB bandwidth
- Easy integration

### Option C: Google Cloud Storage
- Similar to S3
- Good pricing
- Integration with other Google services

## Implementation Priority

**Immediate (Railway Volume):**
- ✅ Set up Railway volume (5 minutes)
- ✅ Test file persistence

**Long-term (Cloud Storage):**
- Implement S3 or Cloudinary integration
- Migrate existing uploads
- Update file upload logic to use cloud URLs
- Remove Railway volume

## Code Changes Made

The backend now uses absolute paths for static file serving:

```typescript
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
```

This ensures files are served correctly in both development and production.

## Testing

After setting up the volume:

1. Create a ticket with image attachment
2. Note the image URL: `https://your-backend.railway.app/uploads/tickets/[filename].png`
3. Access the URL - should display the image
4. Trigger a redeploy
5. Access the same URL - image should still be there

## Cost Estimate

**Railway Volume:**
- ~$0.25/GB/month
- For 1GB: ~$0.25/month
- For 10GB: ~$2.50/month

**Cloudinary Free Tier:**
- 25GB storage
- 25GB monthly bandwidth
- Free forever (with limits)
