/**
 * DECOMMISSIONED FIREBASE COMPATIBILITY MODULE
 * 
 * JIPAS Students Hub Phase 12 Final Migration:
 * All database persistence, realtime sync, and user authentication have been
 * fully migrated to Supabase PostgreSQL, Supabase Auth, IndexedDB local caching,
 * and Google Drive document vault.
 * 
 * This stub file provides mock export interfaces for complete backward-compatibility
 * and prevents any runtime or bundle dependency on Firebase SDKs.
 */

export type FirebaseUser = any;
export type Auth = any;
export type Firestore = any;

export const auth: any = {
  currentUser: null,
  onAuthStateChanged: (_a: any, cb?: any) => {
    const callback = typeof _a === 'function' ? _a : cb;
    if (typeof callback === 'function') callback(null);
    return () => {};
  }
};

export const db: any = {
  _decommissioned: true
};

export async function waitForAuthInit(): Promise<any> {
  return null;
}

export async function ensureFirebaseAuth(): Promise<any> {
  return null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: Record<string, any>;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn('[Supabase Migration Notice] Legacy Firestore error handler invoked:', error, operationType, path);
}

export const collection = (..._args: any[]): any => ({ id: 'mock-col' });
export const doc = (..._args: any[]): any => ({ id: 'mock-doc' });
export const getDoc = async (..._args: any[]): Promise<any> => ({ exists: () => false, data: () => ({}) });
export const getDocs = async (..._args: any[]): Promise<any> => ({
  empty: true,
  docs: [],
  size: 0,
  forEach: (_cb: any) => {}
});
export const getDocFromServer = async (..._args: any[]): Promise<any> => ({ exists: () => false, data: () => ({}) });
export const setDoc = async (..._args: any[]): Promise<any> => {};
export const addDoc = async (..._args: any[]): Promise<any> => ({ id: `id-${Date.now()}` });
export const updateDoc = async (..._args: any[]): Promise<any> => {};
export const deleteDoc = async (..._args: any[]): Promise<any> => {};
export const writeBatch = (..._args: any[]): any => ({
  set: (..._a: any[]) => {},
  update: (..._a: any[]) => {},
  delete: (..._a: any[]) => {},
  commit: async () => {}
});
export const onSnapshot = (...args: any[]): any => {
  const cb = args.find(a => typeof a === 'function');
  if (cb) {
    try { cb({ empty: true, docs: [], forEach: () => {}, exists: () => false, data: () => ({}) }); } catch {}
  }
  return () => {};
};
export const query = (..._args: any[]): any => ({});
export const where = (..._args: any[]): any => ({});
export const orderBy = (..._args: any[]): any => ({});
export const limit = (..._args: any[]): any => ({});
export const startAfter = (..._args: any[]): any => ({});
export const runTransaction = async (_db: any, fn: any): Promise<any> => {
  if (typeof fn === 'function') {
    return fn({
      get: async () => ({ exists: () => false, data: () => ({}) }),
      set: () => {},
      update: () => {},
      delete: () => {}
    });
  }
  return null;
};

export const signInWithEmailAndPassword = async (..._args: any[]): Promise<any> => ({ user: null });
export const createUserWithEmailAndPassword = async (..._args: any[]): Promise<any> => ({ user: null });
export const signOut = async (..._args: any[]): Promise<any> => {};
export const onAuthStateChanged = (_auth: any, cb?: any): any => {
  const callback = typeof _auth === 'function' ? _auth : cb;
  if (typeof callback === 'function') callback(null);
  return () => {};
};
export const signInAnonymously = async (..._args: any[]): Promise<any> => ({ user: null });
export const sendPasswordResetEmail = async (..._args: any[]): Promise<any> => {};
