# AWS Amplify Quick Start

## Quick Deployment Steps

### 1. Connect Repository
- Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
- Click **"New app"** → **"Host web app"**
- Connect your GitHub/GitLab/Bitbucket repository
- Select branch: `main`

### 2. Build Settings (Auto-detected)
The `amplify.yml` file is already configured. Amplify will auto-detect it.

### 3. Environment Variables
Add these in **App settings** → **Environment variables**:

```
REACT_APP_API_URL=https://adhar-pan-kyc-1.onrender.com/api
REACT_APP_ENVIRONMENT=production
NODE_ENV=production
```

### 4. Deploy
Click **"Save and deploy"** - that's it! 🚀

### 5. Update Backend CORS
Add your Amplify URL to Render backend environment variables:

```bash
ALLOWED_ORIGINS=https://main.xxxxx.amplifyapp.com,https://adhar-pan-kyc.vercel.app
```

## Your App Will Be Available At:
- Default: `https://main.xxxxx.amplifyapp.com`
- Custom domain: Configure in **Domain management**

## Need Help?
See `AWS_AMPLIFY_DEPLOYMENT.md` for detailed instructions.

