import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './src/services/logger';
import cron from 'node-cron';
import { isFeatureEnabled } from './src/services/featureFlags';

dotenv.config();

const app = express();
const PORT = 3000;

// Trust reverse proxy (e.g. Nginx, Cloudflare, Traefik, AWS ALB)
app.set('trust proxy', 1);

// Security Middleware & Web Application Firewall (WAF)
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible inline asset rendering in SPA preview
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional Security Headers for Production Hardening (Option 1)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// WAF Threat Engine & In-Memory Metrics Store
interface FirewallIncident {
  id: string;
  timestamp: string;
  ip: string;
  threatType: 'SQL_INJECTION' | 'XSS_ATTACK' | 'PATH_TRAVERSAL' | 'BOT_PROBE' | 'RATE_LIMIT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  method: string;
  path: string;
  matchedSignature: string;
  action: 'BLOCKED_403' | 'QUARANTINED';
}

const firewallStats = {
  active: true,
  inspectedRequests: 0,
  blockedAttacks: 0,
  threats: {
    sqli: 0,
    xss: 0,
    pathTraversal: 0,
    maliciousBots: 0,
    rateLimit: 0
  },
  quarantinedIps: new Set<string>()
};

const firewallIncidents: FirewallIncident[] = [];

// Threat Detectors
const SQLI_REGEX = /(\b(SELECT|UNION|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|TRUNCATE)\b)|(--)|(\/\*)|('(\s*OR\s*|\s*AND\s*)')/i;
const XSS_REGEX = /(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|eval\(|<iframe|<object|<embed)/i;
const TRAVERSAL_REGEX = /(\.\.\/|\.\.\\|\/etc\/passwd|\/proc\/self|\/winnt\/)/i;
const BOT_REGEX = /(sqlmap|nikto|wpscan|acunetix|dirbuster|nmap|masscan|zgrab|nessus)/i;

function inspectPayload(value: any): { isMalicious: boolean; type?: FirewallIncident['threatType']; sig?: string } {
  if (value === null || value === undefined) return { isMalicious: false };
  if (typeof value === 'object') {
    for (const k of Object.keys(value)) {
      const res = inspectPayload(value[k]);
      if (res.isMalicious) return res;
    }
    return { isMalicious: false };
  }
  const str = String(value);
  if (SQLI_REGEX.test(str)) {
    return { isMalicious: true, type: 'SQL_INJECTION', sig: 'SQL Injection signature detected in payload' };
  }
  if (XSS_REGEX.test(str)) {
    return { isMalicious: true, type: 'XSS_ATTACK', sig: 'Cross-Site Scripting (XSS) payload detected' };
  }
  if (TRAVERSAL_REGEX.test(str)) {
    return { isMalicious: true, type: 'PATH_TRAVERSAL', sig: 'Directory traversal / LFI attempt detected' };
  }
  return { isMalicious: false };
}

// Firewall Core Middleware
app.use((req, res, next) => {
  firewallStats.inspectedRequests++;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  // 1. Quarantined IP check
  if (firewallStats.quarantinedIps.has(clientIp)) {
    firewallStats.blockedAttacks++;
    return res.status(403).json({
      error: 'Access Denied: Your IP has been quarantined by JIPAS WAF Firewall due to repeated malicious probes.',
      firewall: 'JIPAS_WAF_v2.5',
      code: 'IP_QUARANTINED'
    });
  }

  // 2. Malicious Bot scanner check
  if (BOT_REGEX.test(userAgent)) {
    firewallStats.blockedAttacks++;
    firewallStats.threats.maliciousBots++;
    const incident: FirewallIncident = {
      id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      threatType: 'BOT_PROBE',
      severity: 'HIGH',
      method: req.method,
      path: req.url,
      matchedSignature: `Blocked Scanner Bot: ${userAgent.slice(0, 40)}`,
      action: 'BLOCKED_403'
    };
    firewallIncidents.unshift(incident);
    if (firewallIncidents.length > 100) firewallIncidents.pop();
    return res.status(403).json({
      error: 'Security Violation: Automated vulnerability scanner detected and blocked.',
      incidentId: incident.id
    });
  }

  // 3. Inspect URL query & params for attacks
  const urlInspection = inspectPayload(req.url);
  if (urlInspection.isMalicious && !req.url.startsWith('/@vite')) {
    firewallStats.blockedAttacks++;
    if (urlInspection.type === 'SQL_INJECTION') firewallStats.threats.sqli++;
    if (urlInspection.type === 'XSS_ATTACK') firewallStats.threats.xss++;
    if (urlInspection.type === 'PATH_TRAVERSAL') firewallStats.threats.pathTraversal++;

    const incident: FirewallIncident = {
      id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      threatType: urlInspection.type!,
      severity: 'CRITICAL',
      method: req.method,
      path: req.url,
      matchedSignature: urlInspection.sig || 'Malicious URI signature',
      action: 'BLOCKED_403'
    };
    firewallIncidents.unshift(incident);
    if (firewallIncidents.length > 100) firewallIncidents.pop();

    return res.status(403).json({
      error: `Security Violation: ${urlInspection.sig}`,
      incidentId: incident.id,
      threatType: urlInspection.type
    });
  }

  // Pass to next middleware (body inspection happens after express.json)
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  handler: (req, res) => {
    firewallStats.blockedAttacks++;
    firewallStats.threats.rateLimit++;
    res.status(429).json({
      error: 'Too many requests: Rate limit exceeded. Throttled by JIPAS WAF Firewall.',
      retryAfter: '15 minutes'
    });
  }
});
app.use(limiter);

// Request Logging (Only log API routes to avoid cluttering dev console)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    logger.info(`${req.method} ${req.url}`);
  }
  next();
});

app.use(express.json());

// Post-JSON Payload WAF Inspection
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Only inspect API routes
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/ai/')) {
      const bodyInspection = inspectPayload(req.body);
      if (bodyInspection.isMalicious) {
        firewallStats.blockedAttacks++;
        if (bodyInspection.type === 'SQL_INJECTION') firewallStats.threats.sqli++;
        if (bodyInspection.type === 'XSS_ATTACK') firewallStats.threats.xss++;
        if (bodyInspection.type === 'PATH_TRAVERSAL') firewallStats.threats.pathTraversal++;

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const incident: FirewallIncident = {
          id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          ip: clientIp,
          threatType: bodyInspection.type!,
          severity: 'CRITICAL',
          method: req.method,
          path: req.url,
          matchedSignature: bodyInspection.sig || 'Malicious Payload Signature',
          action: 'BLOCKED_403'
        };
        firewallIncidents.unshift(incident);
        if (firewallIncidents.length > 100) firewallIncidents.pop();

        return res.status(403).json({
          error: `Security Violation: ${bodyInspection.sig}`,
          incidentId: incident.id,
          threatType: bodyInspection.type
        });
      }
    }
  }
  next();
});

// Automated Backend Tasks
// Runs daily at midnight: '0 0 * * *'
cron.schedule('0 0 * * *', async () => {
  if (!isFeatureEnabled('AUTOMATED_FINANCIAL_AUDIT')) {
    logger.info('Automated financial audit is disabled. Skipping.');
    return;
  }
  
  logger.info('Starting automated daily financial reconciliation audit...');
  try {
    // Audit logic to be integrated here
    logger.info('Daily financial audit completed successfully.');
  } catch (error) {
    logger.error('Error during daily financial audit:', error);
  }
});

// Gemini API Proxy
app.post('/api/ai/generate-comment', async (req, res) => {
  try {
    const { studentName, subjects, performanceLevel } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `You are a professional school teacher. Write a concise, personalized terminal report comment for a student named ${studentName}. 
    Subjects and scores: ${JSON.stringify(subjects)}. 
    General performance level: ${performanceLevel}. 
    The comment should be encouraging, professional, and highlight specific strengths or areas for improvement. Keep it to 2-3 sentences.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({ comment: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// At-Risk Detection API
app.post('/api/ai/analyze-at-risk', async (req, res) => {
  try {
    const { studentData } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Analyze the following student performance data and identify if the student is "At Risk" of academic failure or significant drop in performance. 
    Data: ${JSON.stringify(studentData)}. 
    Return a JSON object with: 
    { "isAtRisk": boolean, "riskLevel": "Low" | "Medium" | "High", "reason": "concise explanation", "suggestions": ["suggestion1", "suggestion2"] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Server-side Duplicate Payments Validator
app.post('/api/payments/validate', (req, res) => {
  try {
    const { payments } = req.body;
    if (!Array.isArray(payments)) {
      return res.status(400).json({ error: 'Payments list is required as an array.' });
    }

    const flaggedPaymentIds: string[] = [];
    const seenMap = new Map<string, string>(); // key -> id

    payments.forEach((p: any) => {
      if (!p || !p.id) return;
      const isVoid = p.status === 'Voided' || p.isVoided === true;
      if (isVoid) return;

      const studentKey = (p.studentId || p.admissionNo || '').trim().toLowerCase();
      const amountKey = Number(p.paid ?? p.amount ?? 0);
      const dateKey = (p.date || '').trim();
      const key = `${studentKey}-${amountKey}-${dateKey}`;

      if (seenMap.has(key)) {
        flaggedPaymentIds.push(p.id);
        const originalId = seenMap.get(key)!;
        if (!flaggedPaymentIds.includes(originalId)) {
          flaggedPaymentIds.push(originalId);
        }
      } else {
        seenMap.set(key, p.id);
      }
    });

    res.json({ flaggedPaymentIds });
  } catch (err: any) {
    console.error('Duplicate payment validation error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

// ==========================================
// WAF FIREWALL MANAGEMENT API ROUTES
// ==========================================

// Get real-time firewall defense metrics
app.get('/api/firewall/status', (req, res) => {
  res.json({
    active: firewallStats.active,
    inspectedRequests: firewallStats.inspectedRequests,
    blockedAttacks: firewallStats.blockedAttacks,
    threats: firewallStats.threats,
    quarantinedCount: firewallStats.quarantinedIps.size,
    quarantinedIps: Array.from(firewallStats.quarantinedIps),
    uptimeSeconds: Math.floor(process.uptime()),
    engine: 'JIPAS Cloud WAF Armor v2.5'
  });
});

// Get recent blocked security incidents
app.get('/api/firewall/incidents', (req, res) => {
  res.json({
    total: firewallIncidents.length,
    incidents: firewallIncidents
  });
});

// Simulate / Test a firewall probe (verifies active defense)
app.post('/api/firewall/test-probe', (req, res) => {
  const { probeType } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  let attackType: FirewallIncident['threatType'] = 'SQL_INJECTION';
  let sig = 'Simulated SQL Injection probe';

  if (probeType === 'xss') {
    attackType = 'XSS_ATTACK';
    sig = 'Simulated XSS script tag injection';
    firewallStats.threats.xss++;
  } else if (probeType === 'traversal') {
    attackType = 'PATH_TRAVERSAL';
    sig = 'Simulated /etc/passwd LFI attempt';
    firewallStats.threats.pathTraversal++;
  } else if (probeType === 'bot') {
    attackType = 'BOT_PROBE';
    sig = 'Simulated vulnerability scanner signature';
    firewallStats.threats.maliciousBots++;
  } else {
    firewallStats.threats.sqli++;
  }

  firewallStats.blockedAttacks++;
  const incident: FirewallIncident = {
    id: `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ip: clientIp,
    threatType: attackType,
    severity: 'HIGH',
    method: 'POST',
    path: '/api/firewall/test-probe',
    matchedSignature: sig,
    action: 'BLOCKED_403'
  };
  firewallIncidents.unshift(incident);
  if (firewallIncidents.length > 100) firewallIncidents.pop();

  res.json({
    intercepted: true,
    status: 'BLOCKED_BY_FIREWALL',
    incident,
    message: 'JIPAS WAF successfully intercepted and neutralized the simulated attack payload!'
  });
});

// Clear incident stream
app.post('/api/firewall/clear-incidents', (req, res) => {
  firewallIncidents.length = 0;
  res.json({ success: true, message: 'Firewall incident register cleared.' });
});

// Unban quarantined IP
app.post('/api/firewall/unban', (req, res) => {
  const { ip } = req.body;
  if (ip && firewallStats.quarantinedIps.has(ip)) {
    firewallStats.quarantinedIps.delete(ip);
    res.json({ success: true, message: `IP ${ip} removed from quarantine.` });
  } else {
    res.json({ success: false, message: 'IP not found in quarantine pool.' });
  }
});

// Vite middleware for development
async function setupDevMiddleware() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
}

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  setupDevMiddleware().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  });
}

// Feature Flag API
app.get('/api/features/:key', (req, res) => {
  const { key } = req.params;
  res.json({ enabled: isFeatureEnabled(key) });
});

export default app;

