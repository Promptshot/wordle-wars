# 🚀 Wordle Wars Deployment Guide

This guide will help you deploy Wordle Wars to your domain with automatic updates via GitHub.

## 📋 Prerequisites

- GitHub account
- Domain name
- Netlify account (free)
- Railway account (free)

## 🎯 Deployment Strategy

**Frontend**: Netlify (static hosting)
**Backend**: Railway (Node.js hosting)
**Domain**: Your custom domain

## 📦 Step 1: Prepare GitHub Repository

### 1.1 Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click "New repository"
3. Name it `wordle-wars`
4. Make it public
5. Don't initialize with README (we already have files)

### 1.2 Upload Your Code
```bash
# Navigate to your project folder
cd "C:\Users\ellio\Desktop\Files\VIBECODE\Raydium Pool\sol-wordle"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Wordle Wars game"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/wordle-wars.git

# Push to GitHub
git push -u origin main
```

## 🌐 Step 2: Deploy Frontend to Netlify

### 2.1 Connect to Netlify
1. Go to [Netlify.com](https://netlify.com)
2. Sign up/login with GitHub
3. Click "New site from Git"
4. Choose "GitHub"
5. Select your `wordle-wars` repository

### 2.2 Configure Build Settings
- **Build command**: `echo "No build needed"`
- **Publish directory**: `/` (root)
- **Branch to deploy**: `main`

### 2.3 Deploy
1. Click "Deploy site"
2. Wait for deployment to complete
3. You'll get a URL like `https://amazing-name-123456.netlify.app`

## ⚙️ Step 3: Deploy Backend to Railway

### 3.1 Connect to Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select your `wordle-wars` repository

### 3.2 Configure Environment Variables
In Railway dashboard, add these environment variables:
```
NODE_ENV=production
FRONTEND_URL=https://your-netlify-url.netlify.app
```

### 3.3 Deploy
1. Railway will auto-detect it's a Node.js project
2. It will run `npm install` and `npm start`
3. You'll get a URL like `https://wordle-wars-production.up.railway.app`

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Update Frontend Server URL
1. In your local code, edit `pump-style.html`
2. Find this line:
```javascript
const SERVER_URL = 'http://192.168.1.44:3001';
```
3. Replace with your Railway URL:
```javascript
const SERVER_URL = 'https://your-railway-url.up.railway.app';
```

### 4.2 Update Railway CORS
1. In Railway dashboard, update environment variable:
```
FRONTEND_URL=https://your-netlify-url.netlify.app
```

### 4.3 Push Changes
```bash
git add .
git commit -m "Update server URL for production"
git push
```

Both Netlify and Railway will automatically redeploy!

## 🌍 Step 5: Connect Your Domain

### 5.1 Netlify Domain Setup
1. In Netlify dashboard, go to "Domain settings"
2. Click "Add custom domain"
3. Enter your domain (e.g., `wordlewars.com`)
4. Follow DNS instructions

### 5.2 DNS Configuration
Add these DNS records to your domain provider:

**For root domain (wordlewars.com):**
```
Type: CNAME
Name: @
Value: your-netlify-site.netlify.app
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: your-netlify-site.netlify.app
```

### 5.3 SSL Certificate
Netlify automatically provides SSL certificates. Wait 24-48 hours for DNS propagation.

## 🔄 Step 6: Future Updates

### Making Changes
1. Edit your local files
2. Test locally if needed
3. Commit and push:
```bash
git add .
git commit -m "Description of changes"
git push
```

### Automatic Deployment
- **Frontend**: Netlify automatically deploys when you push to GitHub
- **Backend**: Railway automatically deploys when you push to GitHub
- **No manual deployment needed!**

## 🛠️ Troubleshooting

### Frontend Issues
- Check Netlify build logs
- Verify file paths are correct
- Ensure all assets are committed to GitHub

### Backend Issues
- Check Railway deployment logs
- Verify environment variables
- Check CORS settings

### Domain Issues
- Wait for DNS propagation (up to 48 hours)
- Check DNS records are correct
- Verify SSL certificate is active

## 📊 Monitoring

### Netlify Analytics
- View site traffic and performance
- Monitor build status
- Check form submissions

### Railway Metrics
- Monitor server performance
- View logs and errors
- Track resource usage

## 🔒 Security Checklist

- ✅ HTTPS enabled (automatic with Netlify/Railway)
- ✅ CORS properly configured
- ✅ Environment variables secured
- ✅ No sensitive data in code
- ✅ Rate limiting enabled
- ✅ Input validation in place

## 💰 Cost Breakdown

**Free Tier Limits:**
- **Netlify**: 100GB bandwidth/month, 300 build minutes/month
- **Railway**: $5 credit/month (usually covers small apps)

**Total Cost**: $0-5/month depending on usage

## 🎉 You're Live!

Your Wordle Wars game is now live at your domain with:
- ✅ Automatic deployments from GitHub
- ✅ HTTPS security
- ✅ Professional hosting
- ✅ Easy updates

**Next time you want to update**: Just push to GitHub and everything updates automatically!

---

**Need help?** Check the troubleshooting section or create an issue on GitHub.


