# JIPAS School Management System — Deployment Guide

This guide provides step-by-step instructions to export, push, and deploy the JIPAS School Management System to **GitHub**, **Vercel**, and configure **Supabase** as your cloud database.

---

## 1. GitHub Integration & Repository Setup

To save your code and enable continuous integration (CI/CD):

1. **Export Code**:
   - In the Google AI Studio UI, open the top-right settings/export menu.
   - Select **Export to GitHub** or **Download ZIP**.
2. **Initialize Local Git Repository** (if using downloaded ZIP):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of clean JIPAS Academic System"
   ```
3. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com) and create a new repository (e.g., `jipas-school-system`).
   - Leave it empty (no README or `.gitignore` since they are already present in the workspace).
4. **Push your Code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/jipas-school-system.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Vercel Deployment (Frontend Hosting)

Vercel provides seamless hosting with automatic builds for Vite and handles Single Page Application (SPA) routing fallback natively via the included `vercel.json` file.

1. **Import Project**:
   - Go to the [Vercel Dashboard](https://vercel.com) and click **Add New** > **Project**.
   - Authorize Vercel to access your GitHub account and import your `jipas-school-system` repository.
2. **Configure Build Settings**:
   - Vercel automatically detects the **Vite** framework preset.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Configure Environment Variables**:
   - Add the environment variables from `.env.example` inside the Vercel project configuration page under **Settings > Environment Variables**:
     - `GEMINI_API_KEY`: *(Your Google AI Studio API key)*
     - `VITE_FIREBASE_API_KEY`: *(Your Firebase / Firestore client API key)*
     - *(Any other variables from `.env.example`)*
4. **Deploy**:
   - Click **Deploy**. Vercel will build the React application and provide a production-ready `.vercel.app` URL. Any future pushes to the `main` branch on GitHub will trigger automatic updates.

---

## 3. Supabase Setup (Database & Authentication Alternative)

If you wish to utilize Supabase as a backend PostgreSQL and Authentication database alongside or instead of Firestore:

1. **Create Supabase Project**:
   - Go to [Supabase](https://supabase.com), log in, and click **New Project**.
   - Choose a project name, secure password, and select your preferred hosting region.
2. **Retrieve API Credentials**:
   - In your Supabase Dashboard, navigate to **Project Settings > API**.
   - Copy the **Project API URL** and the **anon public API Key**.
3. **Hook up to Frontend**:
   - Add the following environment variables to your Vercel/local configuration:
     ```env
     VITE_SUPABASE_URL="https://your-project-id.supabase.co"
     VITE_SUPABASE_ANON_KEY="your-anon-public-key"
     ```
4. **Configure Database Schema**:
   - In Supabase, open the **SQL Editor** tab.
   - You can write and execute SQL schema definition statements to instantiate your custom `students`, `teachers`, `bills`, and `payments` tables with foreign keys and Row-Level Security (RLS) rules matching your operations.
