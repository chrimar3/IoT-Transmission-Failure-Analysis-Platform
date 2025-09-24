# Google OAuth Setup Guide

This guide helps you set up Google OAuth for the CU-BEMS IoT platform authentication.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Project administrator access

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google OAuth API for your project

## Step 2: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (for MVP - can be changed later)
3. Fill in the required information:
   - **App name**: CU-BEMS IoT Analytics Platform
   - **User support email**: Your support email
   - **Developer contact information**: Your developer email
   - **App domain**: `http://localhost:3000` (for development)
   - **Authorized domains**: Add your production domain when ready

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application" as the application type
4. Configure the OAuth 2.0 client:
   - **Name**: CU-BEMS IoT Platform
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)

## Step 4: Configure Environment Variables

1. Copy the Client ID and Client Secret from the Google Cloud Console
2. Add them to your `.env.local` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/signin`
3. Click "Sign in with Google"
4. Complete the OAuth flow

## Security Considerations

### For MVP (Development)
- Use `http://localhost:3000` for local testing
- Keep OAuth consent screen in "Testing" mode
- Add test user emails to the OAuth consent screen

### For Production
- Use HTTPS URLs only
- Switch OAuth consent screen to "In production"
- Configure proper domain verification
- Enable additional security measures:
  - Domain restrictions
  - API quotas
  - Monitoring and alerting

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/auth/callback/google`
   - Check for trailing slashes and protocol (http vs https)

2. **"Access blocked" error**
   - Add your email to test users in OAuth consent screen
   - Ensure the app is in "Testing" mode for development

3. **"Invalid client" error**
   - Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
   - Check that the OAuth client is enabled

### Debug Mode

Enable NextAuth debug mode in development by setting:
```bash
NEXTAUTH_DEBUG=1
```

This will provide detailed logging for troubleshooting OAuth flow issues.

## Production Checklist

- [ ] OAuth consent screen verified and published
- [ ] Production domain added to authorized origins
- [ ] Production callback URL configured
- [ ] Environment variables updated for production
- [ ] SSL certificate configured for HTTPS
- [ ] API quotas and monitoring configured
- [ ] Security review completed