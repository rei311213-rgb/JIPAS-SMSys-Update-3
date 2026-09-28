// Google Drive file scope (Least privilege for managing files created by this application)
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

// In-memory token caching (Do NOT store access token in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
} | null = null;

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
  description?: string;
  syncedBy?: string;
}

export interface GoogleDriveAuthError {
  isUnauthorizedDomain: boolean;
  domain: string;
  message: string;
  code?: string;
}

/**
 * Dynamically load Google Identity Services (GIS) script
 */
function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Connect to Google Drive using Google Identity Services (GIS) OAuth Token Client
 */
async function connectWithGIS(clientId: string): Promise<{
  user: { email: string | null; displayName: string | null; photoURL: string | null };
  accessToken: string;
}> {
  await loadGISScript();
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    throw new Error('Google Identity Services SDK is not available.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error('No access token returned from Google OAuth.'));
          return;
        }

        const accessToken = response.access_token;
        cachedAccessToken = accessToken;

        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (userRes.ok) {
            const userInfo = await userRes.json();
            cachedGoogleUser = {
              email: userInfo.email || null,
              displayName: userInfo.name || null,
              photoURL: userInfo.picture || null
            };
          } else {
            cachedGoogleUser = {
              email: 'Google Workspace Admin',
              displayName: 'Google Drive User',
              photoURL: null
            };
          }
        } catch {
          cachedGoogleUser = {
            email: 'Google Workspace Admin',
            displayName: 'Google Drive User',
            photoURL: null
          };
        }

        resolve({
          user: cachedGoogleUser,
          accessToken: cachedAccessToken
        });
      },
      error_callback: (err: any) => {
        reject(new Error(err?.message || 'Google OAuth authentication was canceled or closed.'));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Connect to Google Drive via GIS token client
 */
export async function connectGoogleDrive(): Promise<{ 
  user: { email: string | null; displayName: string | null; photoURL: string | null }; 
  accessToken: string 
}> {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  const oauthClientId = metaEnv.VITE_GOOGLE_CLIENT_ID || procEnv.VITE_GOOGLE_CLIENT_ID || '983674568756-3oprga84u256jspdudtunb5opab4c6nb.apps.googleusercontent.com';

  if (oauthClientId) {
    try {
      return await connectWithGIS(oauthClientId);
    } catch (gisErr: any) {
      console.warn('GIS token client error:', gisErr);
      throw gisErr;
    }
  }

  throw new Error('Google OAuth Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment.');
}

/**
 * Check if user is currently connected to Google Drive
 */
export function isGoogleDriveConnected(): boolean {
  return !!cachedAccessToken;
}

/**
 * Get current connected user info
 */
export function getConnectedGoogleUser() {
  return cachedGoogleUser;
}

/**
 * Disconnect Google Drive session
 */
export function disconnectGoogleDrive(): void {
  cachedAccessToken = null;
  cachedGoogleUser = null;
}

/**
 * Set manual OAuth Access Token
 */
export function setDriveAccessToken(token: string): void {
  cachedAccessToken = token;
  if (token && !cachedGoogleUser) {
    cachedGoogleUser = {
      email: 'Google Drive User',
      displayName: 'Authenticated Admin',
      photoURL: null
    };
  }
}

/**
 * Upload institutional system backup to Google Drive
 */
export async function uploadBackupToDrive(
  backupData: any,
  fileName: string,
  description: string = 'JIPAS Complete School Management System Backup'
): Promise<DriveBackupFile> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: description,
    properties: {
      app: 'JIPAS Students Hub',
      type: 'SystemBackup',
      createdAt: new Date().toISOString()
    }
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    close_delim;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Drive upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    name: result.name,
    size: result.size ? `${(parseInt(result.size) / 1024).toFixed(1)} KB` : undefined,
    createdTime: result.createdTime || new Date().toISOString(),
    webViewLink: result.webViewLink,
    description: result.description,
    syncedBy: cachedGoogleUser?.displayName || cachedGoogleUser?.email || 'JIPAS Staff'
  };
}

/**
 * List all institutional backup files created in Google Drive
 */
export async function listDriveBackups(): Promise<DriveBackupFile[]> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const query = "mimeType = 'application/json' and trashed = false and (name contains 'jipas_' or name contains 'JIPAS_')";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime,webViewLink,description)&orderBy=createdTime desc&pageSize=50`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch Google Drive backups (status ${response.status})`);
  }

  const data = await response.json();
  const files: DriveBackupFile[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : '1.2 KB',
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    description: f.description || 'JIPAS Backup Snapshot',
    syncedBy: cachedGoogleUser?.displayName || cachedGoogleUser?.email || 'JIPAS Staff'
  }));

  return files;
}

/**
 * Download backup content from Google Drive
 */
export async function downloadDriveBackup(fileId: string): Promise<any> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download backup file (status ${response.status})`);
  }

  return await response.json();
}

/**
 * Delete backup file from Google Drive
 */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive (status ${response.status})`);
  }
}

/**
 * Upload examination questions backup to Google Drive
 */
export async function uploadExamBackupToDrive(
  fileName: string,
  backupData: any,
  description: string = 'JIPAS Examination Questions System Backup'
): Promise<DriveBackupFile> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: description,
    properties: {
      app: 'JIPAS Students Hub',
      type: 'ExamBackup',
      createdAt: new Date().toISOString()
    }
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    close_delim;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Drive upload failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    name: result.name,
    size: result.size ? `${(parseInt(result.size) / 1024).toFixed(1)} KB` : undefined,
    createdTime: result.createdTime || new Date().toISOString(),
    webViewLink: result.webViewLink,
    description: result.description,
    syncedBy: cachedGoogleUser?.displayName || cachedGoogleUser?.email || 'JIPAS Staff'
  };
}

/**
 * List all examination backup files created in Google Drive
 */
export async function listExamBackupsFromDrive(): Promise<DriveBackupFile[]> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const query = "mimeType = 'application/json' and trashed = false and name contains 'JIPAS_Exam_'";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime,webViewLink,description)&orderBy=createdTime desc&pageSize=50`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch Google Drive backups (status ${response.status})`);
  }

  const data = await response.json();
  const files: DriveBackupFile[] = (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    size: f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : '1.2 KB',
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    description: f.description || 'JIPAS Examination Questions System Backup',
    syncedBy: cachedGoogleUser?.displayName || cachedGoogleUser?.email || 'JIPAS Staff'
  }));

  return files;
}

/**
 * Download examination backup content from Google Drive
 */
export async function downloadExamBackupFromDrive(fileId: string): Promise<any> {
  if (!cachedAccessToken) {
    throw new Error('Not connected to Google Drive. Please authenticate first.');
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download backup file (status ${response.status})`);
  }

  return await response.json();
}
