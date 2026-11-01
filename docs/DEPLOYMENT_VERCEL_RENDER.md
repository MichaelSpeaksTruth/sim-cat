# SIM-CAT Decoupled Deployment Architecture: Vercel (Frontend) & Render (Python Backend)

**Architecture Model**: Decoupled Static Edge SPA + Dedicated Python Web Service  
**Frontend Platform**: [Vercel](https://vercel.com) (React 18, Vite, Tailwind CSS v4, KaTeX)  
**Backend Platform**: [Render](https://render.com) (Python 3.13, Flask, NumPy, Pandas, Gunicorn)

---

## 1. Architectural Overview

```
                                      +---------------------------------------------+
                                      |             Client / Web Browser            |
                                      +---------------------------------------------+
                                             |                               |
                                             | Static Assets / SPA Navigation| Direct API / Reverse Proxy
                                             v                               v
                     +---------------------------------------+      +-----------------------------------------+
                     |           Vercel Edge Network         |      |            Render Web Service           |
                     | ------------------------------------- |      | --------------------------------------- |
                     | - Framework: Vite (React SPA)         |      | - Environment: Python 3                 |
                     | - Build: npm run build                |      | - Build: pip install -r requirements.txt|
                     | - Output: dist/                       |      | - Server: gunicorn wsgi:app             |
                     | - Rewrites: /api/(.*) -> Render       |      | - Port: 10000 (Render default)          |
                     | - Global CDN Caching & SSL            |      | - CORS: Enabled for *.vercel.app        |
                     +---------------------------------------+      +-----------------------------------------+
```

### Why Decouple?
1. **Speed & Reliability**: The Vite frontend is purely static and client-side computational. Deploying to Vercel provides instant global CDN caching, zero cold starts, and lightning-fast asset loading.
2. **Resource Efficiency on Render**: Render no longer needs to install Node.js or run `npm install && npm run build`. Render build time drops from ~4 minutes to ~15 seconds, eliminating free-tier memory exhaustion and Node version conflicts.
3. **Seamless API Proxying**: `vercel.json` automatically proxies `/api/*` and `/health` to your Render service, eliminating CORS issues for web browsers.

---

## 2. Render Deployment (Python Backend)

Render hosts the Python Flask API (`server.py`, `simcat_engine.py`, `eurokin_engine.py`).

### Step 2.1: Render Web Service Settings
In your [Render Dashboard](https://dashboard.render.com/):
1. Create a new **Web Service** and connect your GitHub repository (`sim-cat`).
2. Configure the following fields:
   - **Name**: `sim-cat` (or `sim-cat-api`)
   - **Environment**: `Python`
   - **Region**: Closest to your users (e.g., Frankfurt, Ohio, Oregon)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root `./`)
   - **Build Command**:
     ```bash
     pip install -r requirements.txt
     ```
     *(Or run `./render-build.sh`)*
   - **Start Command**:
     ```bash
     gunicorn wsgi:app
     ```
     *(Or `gunicorn your_application.wsgi`)*
   - **Instance Type**: `Free`

### Step 2.2: Environment Variables on Render
Add the following in Render's **Environment** tab:
| Key | Value | Description |
|:---|:---|:---|
| `PORT` | `10000` | Default listening port |
| `PYTHONUNBUFFERED` | `1` | Ensures real-time stdout/stderr log streaming |

### Step 2.3: Verification
Once deployed, open:
- `https://<your-render-subdomain>.onrender.com/health` $\to$ Returns:
  ```json
  {
    "backend": "Python / Flask on Render",
    "service": "Sim-Cat Reaction Kinetics Suite API",
    "status": "healthy",
    "version": "1.0.0"
  }
  ```
- `https://<your-render-subdomain>.onrender.com/` $\to$ Returns JSON service status indicating the frontend is on Vercel.

---

## 3. Vercel Deployment (Frontend Application)

Vercel hosts the React user interface, 3D WebGL reactor canvas, and client-side simulation engine.

### Step 3.1: Connect Repository to Vercel
1. Log in to [Vercel](https://vercel.com/new).
2. Click **Add New Project** $\to$ **Import Git Repository**.
3. Select `sim-cat` from your GitHub account.

### Step 3.2: Configure Build & Output
Vercel automatically detects the included `vercel.json` and Vite framework:
- **Framework Preset**: `Vite`
- **Root Directory**: `./`
- **Build Command**: `npm run build` (or left to default)
- **Output Directory**: `dist`
- **Node.js Version**: `20.x` or `22.x`

### Step 3.3: Environment Variables on Vercel
In the Vercel **Environment Variables** settings during or after import:
| Key | Value | Description |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `https://<your-render-subdomain>.onrender.com` | URL of your Python backend on Render |

### Step 3.4: Deploy
Click **Deploy**. Vercel will compile the application in $\sim 30\text{--}40$ seconds and assign a production URL (e.g. `https://sim-cat.vercel.app`).

---

## 4. Reverse Proxy & CORS Handling

### Vercel `vercel.json` Proxy
[`vercel.json`](file:///c:/Superceed_vscode/classified/sim-cat/vercel.json) routes incoming API requests directly to Render:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://sim-cat.onrender.com/api/$1"
    },
    {
      "source": "/health",
      "destination": "https://sim-cat.onrender.com/health"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
If your Render domain differs from `sim-cat.onrender.com`, update the `destination` URL in `vercel.json` to match your Render subdomain.

### Flask CORS Configuration
In [`server.py`](file:///c:/Superceed_vscode/classified/sim-cat/server.py), `flask_cors.CORS` is enabled for:
- All `/api/*` endpoints
- The `/health` check
- Preflight `OPTIONS` requests
This allows direct browser cross-origin requests from any `*.vercel.app` deployment.
