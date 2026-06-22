import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth.js";
import accountRoutes from "./routes/account.js";
import deviceRoutes from "./routes/devices.js";
import syncRoutes from "./routes/sync.js";
import metricsRoutes from "./routes/metrics.js";
import { db } from "./db/index.js";
import { user } from "./db/schema.js";
import { eq } from "drizzle-orm";

// Auto-verify all existing user accounts to enable seamless social login linking
db.update(user)
    .set({ emailVerified: true })
    .where(eq(user.emailVerified, false))
    .execute()
    .then(() => console.log("Successfully auto-verified existing users"))
    .catch((err) => console.error("Failed to auto-verify existing users:", err));

type Variables = {
    userId: string;
    user: { id: string; email: string; name: string };
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", logger());
app.use(
    "*",
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://traceanalytics.vercel.app",
            "https://trace-fqbp.onrender.com",
        ],
        allowHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

app.get("/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

// Better Auth handles all /api/auth/** routes automatically
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.get("/auth/login", (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trace Cloud - Login</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card: rgba(24, 24, 27, 0.6);
      --border: rgba(63, 63, 70, 0.4);
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --primary: #ffffff;
      --primary-hover: #e4e4e7;
      --glow: rgba(255, 255, 255, 0.05);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
    }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }
    
    /* Background gradients */
    body::before {
      content: '';
      position: absolute;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(120, 119, 198, 0.15) 0%, rgba(0,0,0,0) 70%);
      top: -10%;
      left: -10%;
      z-index: 0;
    }
    
    body::after {
      content: '';
      position: absolute;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, rgba(0,0,0,0) 80%);
      bottom: -10%;
      right: -10%;
      z-index: 0;
    }
    
    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
      padding: 24px;
    }
    
    .card {
      background: var(--card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 36px 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .logo-container {
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }
    
    .logo-svg {
      width: 26px;
      height: 26px;
      fill: var(--primary);
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
      background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 28px;
      line-height: 1.4;
    }
    
    .form-group {
      width: 100%;
      text-align: left;
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    
    input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
    }
    
    input:focus {
      border-color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.04);
    }
    
    .btn {
      width: 100%;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      border: none;
      outline: none;
    }
    
    .btn-primary {
      background: var(--primary);
      color: var(--bg);
      font-weight: 600;
      margin-top: 8px;
    }
    
    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .divider {
      width: 100%;
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0;
      color: var(--text-muted);
      font-size: 12px;
    }
    
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border);
    }
    
    .divider:not(:empty)::before {
      margin-right: .75em;
    }
    
    .divider:not(:empty)::after {
      margin-left: .75em;
    }
    
    .button-group {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .btn-github {
      background: #24292e;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .btn-github:hover {
      background: #2f363d;
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    
    .btn-google {
      background: #ffffff;
      color: #09090b;
      border: 1px solid #ffffff;
    }
    
    .btn-google:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .btn-svg {
      width: 18px;
      height: 18px;
    }
    
    .error-message {
      width: 100%;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #ef4444;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 16px;
      text-align: left;
      display: none;
    }
    
    .toggle-mode {
      margin-top: 20px;
      font-size: 13px;
      color: var(--text-muted);
    }
    
    .toggle-mode span {
      color: var(--text);
      cursor: pointer;
      text-decoration: underline;
      font-weight: 500;
    }
    
    .footer {
      margin-top: 28px;
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .footer a {
      color: var(--text);
      text-decoration: none;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo-container">
        <svg class="logo-svg" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
        </svg>
      </div>
      <h1 id="form-title">Sign in to Trace</h1>
      <p class="subtitle">Connect your Trace account to sync and manage your AI command usage analytics seamlessly.</p>
      
      <div id="error-message" class="error-message"></div>
      
      <form id="auth-form" style="width: 100%;" onsubmit="handleEmailAuth(event)">
        <div id="name-field-group" class="form-group" style="display: none;">
          <label for="input-name">Name</label>
          <input type="text" id="input-name" placeholder="John Doe">
        </div>
        <div class="form-group">
          <label for="input-email">Email Address</label>
          <input type="email" id="input-email" required placeholder="name@example.com">
        </div>
        <div class="form-group">
          <label for="input-password">Password</label>
          <input type="password" id="input-password" required placeholder="••••••••" minlength="8">
        </div>
        
        <button type="submit" class="btn btn-primary">
          <span id="submit-btn-text">Sign In</span>
        </button>
      </form>
      
      <div class="toggle-mode">
        <span id="toggle-text">Don't have an account?</span> 
        <span id="toggle-link" onclick="toggleMode()">Sign up</span>
      </div>
      
      <div class="divider">or continue with</div>
      
      <div class="button-group">
        <button type="button" onclick="signInWithSocial('github')" class="btn btn-github">
          <svg class="btn-svg" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          Continue with GitHub
        </button>
        <button type="button" onclick="signInWithSocial('google')" class="btn btn-google">
          <svg class="btn-svg" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.973 0 12 0 7.354 0 3.307 2.673 1.343 6.582l3.923 3.183z"/>
            <path fill="#4285F4" d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.5h6.445a5.513 5.513 0 01-2.39 3.618l3.736 2.891c2.182-2.009 3.709-4.964 3.709-8.636z"/>
            <path fill="#FBBC05" d="M5.266 14.235A7.024 7.024 0 014.909 12c0-.79.13-1.555.357-2.235L1.343 6.582A11.93 11.93 0 000 12c0 1.92.455 3.736 1.255 5.373l4.01-3.138z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.955-1.073 7.936-2.918l-3.736-2.891c-1.036.691-2.355 1.109-4.2 1.109-3.227 0-5.973-2.182-6.945-5.118l-4.01 3.138C3.12 21.09 7.15 24 12 24z"/>
          </svg>
          Continue with Google
        </button>
      </div>
      
      <div class="footer">
        Secured by <a href="https://better-auth.com" target="_blank">Better Auth</a>
      </div>
    </div>
  </div>
  
  <script>
    let isSignUpMode = false;

    function toggleMode() {
      isSignUpMode = !isSignUpMode;
      const nameFieldGroup = document.getElementById('name-field-group');
      const nameInput = document.getElementById('input-name');
      const submitBtnText = document.getElementById('submit-btn-text');
      const formTitle = document.getElementById('form-title');
      const toggleText = document.getElementById('toggle-text');
      const toggleLink = document.getElementById('toggle-link');
      
      if (isSignUpMode) {
        nameFieldGroup.style.display = 'block';
        nameInput.required = true;
        submitBtnText.textContent = 'Create Account';
        formTitle.textContent = 'Create your account';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign in';
      } else {
        nameFieldGroup.style.display = 'none';
        nameInput.required = false;
        submitBtnText.textContent = 'Sign In';
        formTitle.textContent = 'Sign in to Trace';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign up';
      }
    }

    async function handleEmailAuth(event) {
      event.preventDefault();
      const name = document.getElementById('input-name').value;
      const email = document.getElementById('input-email').value;
      const password = document.getElementById('input-password').value;
      const errorMsg = document.getElementById('error-message');
      
      errorMsg.style.display = 'none';
      
      try {
        let endpoint = isSignUpMode ? '/api/auth/sign-up/email' : '/api/auth/sign-in/email';
        let bodyObj = isSignUpMode 
          ? { email, password, name }
          : { email, password };
          
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyObj)
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Authentication failed (HTTP ' + response.status + ')');
        }
        
        // Successful login/signup, redirect to callback to complete desktop link
        window.location.href = '/auth/callback';
      } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.style.display = 'block';
      }
    }

    async function signInWithSocial(provider) {
      try {
        const callbackURL = window.location.origin + '/auth/callback';
        const response = await fetch('/api/auth/sign-in/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: provider,
            callbackURL: callbackURL
          })
        });
        if (!response.ok) {
          throw new Error('HTTP error ' + response.status);
        }
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('Could not initiate authentication redirection.');
        }
      } catch (e) {
        alert('Sign in failed: ' + e.message);
      }
    }
  </script>
</body>
</html>`);
});

app.get("/auth/callback", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
        return c.redirect("/auth/login?error=no_session");
    }
    const token = session.session.token;

    const redirectTo = c.req.query("redirect_to");
    if (redirectTo) {
        try {
            const url = new URL(redirectTo);
            url.searchParams.set("token", token);
            return c.redirect(url.toString());
        } catch (e) {
            console.error("Malformed redirect_to URL:", redirectTo);
        }
    }
    
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trace Cloud - Connecting...</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card: rgba(24, 24, 27, 0.6);
      --border: rgba(63, 63, 70, 0.4);
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --primary: #ffffff;
      --primary-hover: #e4e4e7;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
    }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      position: relative;
    }
    
    body::before {
      content: '';
      position: absolute;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(120, 119, 198, 0.1) 0%, rgba(0,0,0,0) 70%);
      top: -10%;
      left: -10%;
      z-index: 0;
    }
    
    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
      padding: 24px;
    }
    
    .card {
      background: var(--card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .status-icon {
      width: 64px;
      height: 64px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      color: #22c55e;
    }
    
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 32px;
      line-height: 1.5;
    }
    
    .btn {
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-decoration: none;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: var(--primary);
      color: var(--bg);
    }
    
    .btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    
    .footer {
      margin-top: 24px;
      font-size: 13px;
    }
    
    .footer a {
      color: var(--text-muted);
      text-decoration: none;
    }
    
    .footer a:hover {
      color: var(--text);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="status-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>Connected!</h1>
      <p class="subtitle">Successfully authenticated. We're opening the Trace Desktop app to link your account...</p>
      
      <a id="launch-btn" href="trace://auth/callback?token=${token}" class="btn btn-primary">
        Open Trace Desktop
      </a>
      
      <div class="footer">
        <a href="/auth/login">Back to Login</a>
      </div>
    </div>
  </div>
  
  <script>
    const tokenUrl = "trace://auth/callback?token=${token}";
    // Auto-launch the app
    window.location.href = tokenUrl;
    
    // Fallback automatic triggers
    setTimeout(() => {
      window.location.href = tokenUrl;
    }, 500);
  </script>
</body>
</html>`);
});

app.route("/account", accountRoutes);
app.route("/devices", deviceRoutes);
app.route("/sync", syncRoutes);
app.route("/api/metrics", metricsRoutes);

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Trace Cloud running on http://localhost:${info.port}`);
});
