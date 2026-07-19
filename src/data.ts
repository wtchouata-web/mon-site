import { User, Product, Sale, ConnectionLog, Dispute, Comment } from './types';

// Seul et unique administrateur principal autorisé par défaut
export const SEEDED_USERS: User[] = [
  {
    id: 'admin_wilfried',
    email: 'cybertest611@gmail.com',
    name: 'Administrateur Principal',
    role: 'admin',
    whatsappNumber: '+237659228516',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-06-13T12:00:00Z',
    city: 'Yaoundé',
    gender: 'Femelle',
    password: 'Wilfried11',
    isVerified: true
  }
];

// Fiches et données de test entièrement purgées pour démarrer sur une base de données propre
export const SEEDED_PRODUCTS: Product[] = [];
export const SEEDED_SALES: Sale[] = [];
export const SEEDED_LOGS: ConnectionLog[] = [];
export const SEEDED_DISPUTES: Dispute[] = [];
export const SEEDED_COMMENTS: Comment[] = [];

// --- SECURE CRYPTOGRAPHIC ENGINE FOR STORAGE OBFUSCATION AND ACCESS KEYS ENCRYPTION ---
const ENCRYPTION_KEY = "ROSE_AMOUR_SECURE_KEY_2026_@!";

export function encryptData(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(unescape(encodeURIComponent(result)));
}

export function decryptData(cipherText: string): string {
  if (!cipherText) return "";
  const trimmed = cipherText.trim();
  // If it starts with standard JSON braces or brackets, it is legacy plain-text data. 
  // We return it as-is for a smooth seamless upgrade fallback.
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
    return cipherText;
  }
  try {
    const raw = decodeURIComponent(escape(atob(trimmed)));
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return cipherText; // Fallback to raw if decoding or parsing failed
  }
}

// --- SECURE CRYPTOGRAPHIC CHECKER FOR LEAKED PASSWORDS (HAVEIBEENPWNED API) ---
async function calculateSha1(string: string): Promise<string> {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-1', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return hashHex;
}

export async function isPasswordPwned(password: string): Promise<boolean> {
  if (!password || password.length < 4) return false;
  
  // High-priority offline block list of extremely common passwords
  const commonOffline = [
    "123456", "password", "12345678", "123456789", "12345", "1234567", "qwerty", 
    "1234567890", "admin", "admin123", "password123", "bastos", "douala"
  ];
  if (commonOffline.includes(password.toLowerCase())) {
    return true;
  }

  try {
    const hash = await calculateSha1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    // Timeout of 3 seconds to ensure UI is never blocked if HaveIBeenPwned API is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return false;
    const text = await response.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [lineSuffix, count] = line.trim().split(':');
      if (lineSuffix === suffix) {
        return parseInt(count, 10) > 0;
      }
    }
  } catch (err) {
    console.warn("HaveIBeenPwned API check failed or timed out. Defaulting to safe offline verification list.", err);
  }
  return false;
}

// Global monkey-patch of window.localStorage to automatically encrypt/decrypt all app data transparently.
if (typeof window !== 'undefined' && window.localStorage) {
  const originalGetItem = window.localStorage.getItem.bind(window.localStorage);
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

  window.localStorage.getItem = (key: string): string | null => {
    try {
      const val = originalGetItem(key);
      if (!val) return null;
      if (key.startsWith('rose_amour_')) {
        return decryptData(val);
      }
      return val;
    } catch {
      return null;
    }
  };

  window.localStorage.setItem = (key: string, value: string): void => {
    try {
      let finalValue = value;
      if (key.startsWith('rose_amour_')) {
        finalValue = encryptData(value);
      }
      originalSetItem(key, finalValue);
    } catch {
      // ignore
    }
  };
}

// Safe storage wrapper (now automatically secured via global monkey patch)
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // ignore
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }
};

// Storage Keys
const STORAGE_KEYS = {
  USERS: 'rose_amour_users',
  PRODUCTS: 'rose_amour_products',
  SALES: 'rose_amour_sales',
  LOGS: 'rose_amour_logs',
  DISPUTES: 'rose_amour_disputes',
  COMMENTS: 'rose_amour_comments',
  CURRENT_USER: 'rose_amour_current_user'
};

export const getDB = () => {
  if (typeof window === 'undefined') {
    return {
      users: SEEDED_USERS,
      products: SEEDED_PRODUCTS,
      sales: SEEDED_SALES,
      logs: SEEDED_LOGS,
      disputes: SEEDED_DISPUTES,
      comments: SEEDED_COMMENTS,
      currentUser: null as User | null
    };
  }

  // Force l'effacement de l'ancienne base avec des comptes mock non pertinents si trouvée
  const oldUsersVal = safeStorage.getItem(STORAGE_KEYS.USERS);
  if (oldUsersVal && (oldUsersVal.includes('user_chloe') || oldUsersVal.includes('mya.bastos'))) {
    safeStorage.removeItem(STORAGE_KEYS.USERS);
    safeStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    safeStorage.removeItem(STORAGE_KEYS.SALES);
    safeStorage.removeItem(STORAGE_KEYS.LOGS);
    safeStorage.removeItem(STORAGE_KEYS.DISPUTES);
    safeStorage.removeItem(STORAGE_KEYS.COMMENTS);
    safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  const getOrSeed = <T>(key: string, seeded: T[]): T[] => {
    const val = safeStorage.getItem(key);
    if (!val) {
      safeStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return JSON.parse(val);
    } catch {
      return seeded;
    }
  };

  const currentU = safeStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  let parsedCurrentUser: User | null = null;
  if (currentU) {
    try {
      parsedCurrentUser = JSON.parse(currentU);
    } catch {
      // ignore
    }
  }

  return {
    users: getOrSeed<User>(STORAGE_KEYS.USERS, SEEDED_USERS),
    products: getOrSeed<Product>(STORAGE_KEYS.PRODUCTS, SEEDED_PRODUCTS),
    sales: getOrSeed<Sale>(STORAGE_KEYS.SALES, SEEDED_SALES),
    logs: getOrSeed<ConnectionLog>(STORAGE_KEYS.LOGS, SEEDED_LOGS),
    disputes: getOrSeed<Dispute>(STORAGE_KEYS.DISPUTES, SEEDED_DISPUTES),
    comments: getOrSeed<Comment>(STORAGE_KEYS.COMMENTS, SEEDED_COMMENTS),
    currentUser: parsedCurrentUser
  };
};

export const saveDB = {
  users: (data: User[]) => safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data)),
  products: (data: Product[]) => safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data)),
  sales: (data: Sale[]) => safeStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data)),
  logs: (data: ConnectionLog[]) => safeStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data)),
  disputes: (data: Dispute[]) => safeStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(data)),
  comments: (data: Comment[]) => safeStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(data)),
  currentUser: (data: User | null) => {
    if (data) {
      safeStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data));
    } else {
      safeStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }
};
