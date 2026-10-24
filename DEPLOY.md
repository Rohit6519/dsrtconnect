# DSRT Production Deployment Guide

## Prerequisites Checklist

- [ ] GitHub repo (push all your code)
- [ ] Vercel account (free tier fine for start)
- [ ] Supabase project (already set up)
- [ ] OpenAI OR Groq API key
- [ ] Resend account for emails (optional)

---

## Step 1 — Push Code To GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dsrt.git
git push -u origin main