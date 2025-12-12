import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  Auth
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  collection,
  Firestore,
  updateDoc,
  increment
} from 'firebase/firestore';
import { SavedItem, ScenarioHistoryItem, ScenarioContent } from '../types';

// ---------------------------------------------------------
// IMPORTANT: REPLACE THIS WITH YOUR OWN FIREBASE CONFIG
// Get this from Firebase Console > Project Settings > General
// ---------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB6XPPmy7XQw31V2B2Kz6DjgKQ11WL3IyM",
  authDomain: "japanese-scene-master.firebaseapp.com",
  projectId: "japanese-scene-master",
  storageBucket: "japanese-scene-master.firebasestorage.app",
  messagingSenderId: "86593309540",
  appId: "1:86593309540:web:00a47ff8a4195024d1c871",
  measurementId: "G-1EKBXY65QS"
};

// ---------------------------------------------------------
// ADMIN CONFIGURATION (管理员白名单)
// Add your Google Account email(s) here to bypass daily limits
// 请在这里填入您的 Google 邮箱，登录后即可无限使用
// ---------------------------------------------------------
const ADMIN_EMAILS = [
  "lydialmz610@gmail.com" // <--- 请修改这里为您的邮箱
];

// Initialize Firebase
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isConfigured = false;

try {
  // Basic check to see if user has replaced the placeholder
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    // Check if app is already initialized to prevent errors in hot-reload environments
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// Re-export User type for consumption in components
export type User = FirebaseUser;

// Guest User Definition
export const GUEST_ID = 'guest_user';
// Mock object that satisfies minimal User interface for the app's needs
export const GUEST_USER = {
  uid: GUEST_ID,
  displayName: '访客 (Guest)',
  email: null,
  photoURL: null,
  emailVerified: false,
  isAnonymous: true,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'guest'
} as unknown as FirebaseUser;

export const loginWithGoogle = async () => {
  if (!isConfigured || !auth) {
    alert("请先在 services/firebase.ts 文件中配置您的 Firebase 密钥。");
    return;
  }

  if (window.location.protocol === 'file:') {
    alert(
      "Firebase 登录无法在 file:// 协议下工作。\n\n" +
      "请使用本地服务器运行此项目，例如：\n" +
      "1. 使用 VS Code 的 'Live Server' 插件\n" +
      "2. 或运行 'npx serve' \n" +
      "3. 或运行 'python -m http.server'"
    );
    return;
  }

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error: any) {
    console.error("Login failed", error);
    if (error?.code === 'auth/operation-not-supported-in-this-environment') {
       alert("登录失败：当前环境不支持（可能是非 HTTPS 或在受限的预览窗口中）。请尝试在标准浏览器窗口中使用 http://localhost 打开。");
    } else if (error?.code === 'auth/unauthorized-domain') {
       alert(
         `登录失败：域名未授权。\n\n` +
         `可能原因：您使用的 Firebase 配置属于示例项目，您没有权限添加白名单。\n` +
         `解决方法：\n` +
         `1. 使用“访客模式”继续试用。\n` +
         `2. 或者创建一个属于您自己的 Firebase 项目并更新 services/firebase.ts 中的配置。`
       );
    } else if (error?.code === 'auth/popup-closed-by-user') {
       // User just closed the popup
    } else {
       alert(`登录失败: ${error.message}`);
    }
    throw error;
  }
};

export const logout = async () => {
  if (!isConfigured || !auth) return;
  return signOut(auth);
};

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  if (!isConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Merge Strategy
const mergeData = (
  cloud: { favorites: SavedItem[], history: ScenarioHistoryItem[] }, 
  local: { favorites: SavedItem[], history: ScenarioHistoryItem[] }
) => {
  // Merge Favorites
  const mergedFavorites = [...cloud.favorites];
  local.favorites.forEach(localItem => {
    if (!mergedFavorites.some(c => c.id === localItem.id && c.type === localItem.type)) {
      mergedFavorites.push(localItem);
    }
  });

  // Merge History
  const mergedHistory = [...cloud.history];
  local.history.forEach(localItem => {
    const existingIdx = mergedHistory.findIndex(c => c.id === localItem.id);
    if (existingIdx === -1) {
      mergedHistory.push(localItem);
    } else {
      const existing = mergedHistory[existingIdx];
      if (localItem.versions.length > existing.versions.length || localItem.lastAccessed > existing.lastAccessed) {
        mergedHistory[existingIdx] = localItem;
      }
    }
  });
  
  mergedHistory.sort((a, b) => b.lastAccessed - a.lastAccessed);

  return { favorites: mergedFavorites, history: mergedHistory };
};

export const syncUserData = async (uid: string, localData: { favorites: SavedItem[], history: ScenarioHistoryItem[] }) => {
   if (uid === GUEST_ID) {
     return localData;
   }

   if (!isConfigured || !db) return null;
   
   const userRef = doc(db, 'users', uid);
   
   try {
     const snap = await getDoc(userRef);
     
     if (snap.exists()) {
       const cloudData = snap.data() as { favorites: SavedItem[], history: ScenarioHistoryItem[] };
       const merged = mergeData(
         { favorites: cloudData.favorites || [], history: cloudData.history || [] }, 
         localData
       );
       
       await setDoc(userRef, merged, { merge: true });
       return merged;
     } else {
       await setDoc(userRef, localData);
       return localData;
     }
   } catch (e) {
     console.error("Sync failed", e);
     return null;
   }
};

export const saveUserData = async (uid: string, data: { favorites: SavedItem[], history: ScenarioHistoryItem[] }) => {
  if (uid === GUEST_ID) return;
  if (!isConfigured || !db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
  } catch (e) {
    console.error("Save failed", e);
  }
};

// --- SHARING FUNCTIONALITY ---

export const shareScenario = async (content: ScenarioContent): Promise<string | null> => {
  if (!isConfigured || !db) return null;
  try {
    const sharesRef = collection(db, 'shares');
    const docRef = await addDoc(sharesRef, {
      ...content,
      _sharedAt: Date.now()
    });
    return docRef.id;
  } catch (e) {
    console.error("Share failed", e);
    return null;
  }
};

export const getSharedScenario = async (id: string): Promise<ScenarioContent | null> => {
  if (!isConfigured || !db) return null;
  try {
    const docRef = doc(db, 'shares', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const { _sharedAt, ...content } = data as any;
      return content as ScenarioContent;
    }
    return null;
  } catch (e) {
    console.error("Get share failed", e);
    return null;
  }
};

// --- DAILY QUOTA MANAGEMENT ---

const DAILY_LIMIT = 5;

// Helper to get a stable ID for the user (Auth UID or generated Guest ID)
export const getStableUserId = (user: User | null): string => {
  if (user && user.uid !== GUEST_ID) {
    return user.uid;
  }
  
  // For guests, use a persistent ID in localStorage
  let guestId = localStorage.getItem('nihongo_device_id');
  if (!guestId) {
    guestId = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('nihongo_device_id', guestId);
  }
  return guestId;
};

const getTodayDateString = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const checkDailyQuota = async (user: User | null): Promise<{ allowed: boolean; remaining: number }> => {
  // 1. ADMIN BYPASS CHECK
  if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
    return { allowed: true, remaining: 9999 };
  }

  if (!isConfigured || !db) {
    // If Firebase isn't configured, we default to allowing it (dev mode) or blocking it depending on policy.
    // Here we allow it for safety in dev.
    return { allowed: true, remaining: 999 };
  }

  const userId = getStableUserId(user);
  const dateStr = getTodayDateString();
  const docId = `${userId}_${dateStr}`;
  const quotaRef = doc(db, 'daily_usage', docId);

  try {
    const snap = await getDoc(quotaRef);
    if (snap.exists()) {
      const data = snap.data();
      const count = data.count || 0;
      return { 
        allowed: count < DAILY_LIMIT, 
        remaining: Math.max(0, DAILY_LIMIT - count) 
      };
    } else {
      return { allowed: true, remaining: DAILY_LIMIT };
    }
  } catch (e) {
    console.error("Error checking quota:", e);
    return { allowed: true, remaining: 0 }; // Fail safe?
  }
};

export const incrementDailyQuota = async (user: User | null) => {
  // 1. ADMIN BYPASS CHECK - Admins don't consume quota
  if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
    return;
  }

  if (!isConfigured || !db) return;

  const userId = getStableUserId(user);
  const dateStr = getTodayDateString();
  const docId = `${userId}_${dateStr}`;
  const quotaRef = doc(db, 'daily_usage', docId);

  try {
    await setDoc(quotaRef, {
      count: increment(1),
      updatedAt: Date.now()
    }, { merge: true });
  } catch (e) {
    console.error("Error incrementing quota:", e);
  }
};