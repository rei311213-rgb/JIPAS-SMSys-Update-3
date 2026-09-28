/**
 * ESM HOISTING BOOTSTRAP SCRIPT (PHASE 18)
 * Configures the in-memory browser and storage mocks before any hoisted imports occur.
 */

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  key: (index: number) => Object.keys(store)[index] || null,
  get length() { return Object.keys(store).length; }
};

const mockSessionStorage = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
  key: (index: number) => null,
  get length() { return 0; }
};

// Polyfill CustomEvent for Node environment
class MockCustomEvent {
  type: string;
  detail: any;
  constructor(type: string, options?: { detail: any }) {
    this.type = type;
    this.detail = options?.detail || null;
  }
}
Object.defineProperty(global, 'CustomEvent', {
  value: MockCustomEvent,
  writable: true,
  configurable: true
});

// Define globals safely using Object.defineProperty to bypass read-only getters
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    navigator: { onLine: true, userAgent: 'Node-CLI-Test' },
    location: { href: 'http://localhost/' },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'Node-CLI-Test'
  },
  writable: true,
  configurable: true
});

// Polyfill mock document
Object.defineProperty(global, 'document', {
  value: {
    title: 'JIPAS Students Hub',
    documentElement: { style: {} },
    head: { appendChild: () => {} },
    createElement: () => ({ style: {} })
  },
  writable: true,
  configurable: true
});

// Now dynamically import the localforage mocks and test execution pipeline!
async function bootstrap() {
  // Pre-mock localforage to run completely in-memory in CLI Node context
  const localforage = (await import('localforage')).default as any;
  const localForageStore: Record<string, any> = {};

  localforage.setSerializer = () => {};
  localforage.defineDriver = async () => {};
  localforage.setDriver = async () => {};
  localforage.getItem = async (key: string) => localForageStore[key] || null;
  localforage.setItem = async (key: string, val: any) => { localForageStore[key] = val; return val; };
  localforage.removeItem = async (key: string) => { delete localForageStore[key]; };
  localforage.clear = async () => { Object.keys(localForageStore).forEach(k => delete localForageStore[k]); };

  // Load and execute test suite
  await import('./test-runner');
}

bootstrap().catch(err => {
  console.error('Bootstrap failure:', err);
  process.exit(1);
});
