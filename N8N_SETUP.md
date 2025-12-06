# n8n Integration Setup Guide

## Overview
Your Supabase Keep-Alive project now has a dedicated API endpoint (`/api/sync`) that can be called from n8n or any other automation tool.

## What Was Added

### 1. API Endpoint: `/api/sync.ts`
- **Location:** `api/sync.ts`
- **Purpose:** Serverless function that syncs all Supabase accounts
- **Features:**
  - ✅ CORS enabled for cross-origin requests
  - ✅ Optional API key authentication
  - ✅ Detailed JSON response with per-account results
  - ✅ Works with GET or POST requests

### 2. Example n8n Workflow
- **Location:** `n8n-workflow-example.json`
- **Purpose:** Ready-to-import workflow for n8n
- **Includes:**
  - Schedule trigger (daily at 8 AM)
  - HTTP request to sync endpoint
  - Success/error handling
  - Notification nodes (customizable)

### 3. Updated Documentation
- **Location:** `README.md`
- **Added:** Complete n8n setup instructions
- **Includes:** curl examples, response format, and troubleshooting

## Quick Setup Steps

### 1. Deploy to Vercel
```bash
vercel
```

### 2. Add Environment Variables in Vercel Dashboard
Required:
```
VITE_SUPABASE_1_NAME=My Project
VITE_SUPABASE_1_URL=https://xxx.supabase.co
VITE_SUPABASE_1_KEY=your-anon-key
# ... add more accounts as needed
```

Optional (for authentication):
```
API_SECRET_KEY=your-secret-key-here
```

### 3. Test the Endpoint
```bash
# Without authentication
curl https://your-app.vercel.app/api/sync

# With authentication
curl -H "Authorization: Bearer your-secret-key-here" \
     https://your-app.vercel.app/api/sync
```

### 4. Set Up n8n
1. Import `n8n-workflow-example.json` into n8n
2. Update the URL to your Vercel deployment
3. If using authentication, add your API key
4. Customize the schedule trigger as needed
5. Replace notification nodes with your preferred service (Slack, Discord, Email)

## API Response Format

```json
{
  "success": true,
  "message": "Sync executed",
  "timestamp": "2025-12-06T19:00:00.000Z",
  "summary": {
    "total": 5,
    "succeeded": 5,
    "failed": 0
  },
  "results": [
    {
      "success": true,
      "accountId": 1,
      "accountName": "My Project",
      "message": "2 inserts, 1 delete completed - 1 record remains"
    }
  ]
}
```

## Security Notes

1. **API Key (Recommended):**
   - Set `API_SECRET_KEY` in Vercel environment variables
   - Use `Authorization: Bearer your-key` header in requests
   - Prevents unauthorized access to your sync endpoint

2. **CORS:**
   - Currently set to `*` (allow all origins)
   - For production, consider restricting to specific domains

3. **Rate Limiting:**
   - Consider adding rate limiting for production use
   - Vercel has built-in DDoS protection

## Troubleshooting

### "No Supabase accounts configured"
- Check that environment variables are set in Vercel
- Redeploy after adding variables

### "Unauthorized" error
- Verify `API_SECRET_KEY` matches in both Vercel and n8n
- Check Authorization header format: `Bearer your-key`

### CORS errors
- The endpoint has CORS enabled by default
- If issues persist, check browser console for details

## Alternative Uses

This endpoint works with:
- ✅ n8n
- ✅ Zapier
- ✅ Make.com (Integromat)
- ✅ Any HTTP client or cron service
- ✅ GitHub Actions
- ✅ Custom scripts

## Next Steps

1. Deploy to Vercel
2. Configure environment variables
3. Test the endpoint
4. Set up n8n workflow
5. Monitor the logs in Vercel dashboard

For more details, see the main [README.md](README.md).
