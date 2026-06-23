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

// Safe storage wrapper to prevent iframe/restricted cookies DOM exceptions from crashing the app
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
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
