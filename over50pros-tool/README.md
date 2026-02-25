# Over50Pros Side Project Idea Generator

## Deploy to Vercel in 10 Minutes

### Step 1 — Upload to GitHub
1. Go to github.com and sign in (create free account if needed)
2. Click the "+" icon top right → "New repository"
3. Name it: over50pros-tool
4. Click "Create repository"
5. Click "uploading an existing file"
6. Upload ALL files keeping the folder structure:
   - api/generate.js
   - public/index.html
   - vercel.json
7. Click "Commit changes"

### Step 2 — Deploy on Vercel
1. Go to vercel.com and sign in
2. Click "Add New Project"
3. Click "Import" next to your over50pros-tool repository
4. Click "Deploy" — leave all settings as default

### Step 3 — Add Your API Key (IMPORTANT)
1. After deploy, go to your project in Vercel dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in left sidebar
4. Click "Add New"
5. Name: ANTHROPIC_API_KEY
6. Value: your full sk-ant-... key
7. Click "Save"
8. Go to "Deployments" tab and click "Redeploy"

### Step 4 — Get Your URL
Your tool will be live at:
https://over50pros-tool.vercel.app

### Step 5 — Embed on WordPress
Add this to any WordPress page using a Custom HTML block:

<iframe 
  src="https://over50pros-tool.vercel.app" 
  width="100%" 
  height="950px" 
  frameborder="0"
  style="border:none;"
></iframe>

### Step 6 — Custom Domain (Optional)
To use tools.over50pros.com instead:
1. In Vercel project → Settings → Domains
2. Add: tools.over50pros.com
3. Follow DNS instructions to point your subdomain to Vercel

## Your API Key (Split for Security)
k1: sk-ant-api03-hRFHtHOAZS-gzyNnoS03KDca2x
k2: CmQ81Q3zvZxqWjC9181BqQg1J60TZ1orjNfduk
k3: OO0XvOB0gWyuHcrqkOp5Q-25ItjQAA
Full key = k1+k2+k3 (paste as one string in Vercel)
