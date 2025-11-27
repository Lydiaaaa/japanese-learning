import * as firebaseApp from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc
} from 'firebase/firestore';
import { SavedItem, ScenarioHistoryItem } from '../types';

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

// Initialize Firebase
// using a try-catch block to handle potential initialization errors gracefully
let app;
let auth: any;
let db: any;
let isConfigured = false;

try {
  // Basic check to see if user has replaced the placeholder
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    // Use type casting to bypass potential type definition issues with initializeApp
    app = (firebaseApp as any).initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isConfigured = true;
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// Guest User Definition
export const GUEST_ID = 'guest_user';
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
} as unknown as User;

export const loginWithGoogle = async () => {
  if (!isConfigured) {
    alert("请先在 services/firebase.ts 文件中配置您的 Firebase 密钥。");
    return;
  }

  // Protocol Check for the error you saw
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
    
    // Handle specific error codes for better user experience
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
       // User just closed the popup, no need to alert
    } else {
       alert(`登录失败: ${error.message}`);
    }
    throw error;
  }
};

export const logout = async () => {
  // If it's just a local guest logout, we don't need to call firebase
  if (!isConfigured) return;
  return firebaseSignOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!isConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// Merge Strategy:
// 1. Favorites: Combine unique items by ID.
// 2. History: Combine items by ID. If duplicate, keep the one with more versions or more recent access.
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
      // If exists, keep the one with more versions, or if equal, the more recent one
      const existing = mergedHistory[existingIdx];
      if (localItem.versions.length > existing.versions.length || localItem.lastAccessed > existing.lastAccessed) {
        mergedHistory[existingIdx] = localItem;
      }
    }
  });
  
  // Sort history by recency
  mergedHistory.sort((a, b) => b.lastAccessed - a.lastAccessed);

  return { favorites: mergedFavorites, history: mergedHistory };
};

export const syncUserData = async (uid: string, localData: { favorites: SavedItem[], history: ScenarioHistoryItem[] }) => {
   // Skip cloud sync for guest user
   if (uid === GUEST_ID) {
     return localData;
   }

   if (!isConfigured) return null;
   
   const userRef = doc(db, 'users', uid);
   
   try {
     const snap = await getDoc(userRef);
     
     if (snap.exists()) {
       const cloudData = snap.data() as { favorites: SavedItem[], history: ScenarioHistoryItem[] };
       // Merge Cloud + Local
       const merged = mergeData(
         { favorites: cloudData.favorites || [], history: cloudData.history || [] }, 
         localData
       );
       
       // Update Cloud with Merged State
       await setDoc(userRef, merged, { merge: true });
       return merged;
     } else {
       // First login, upload local data
       await setDoc(userRef, localData);
       return localData;
     }
   } catch (e) {
     console.error("Sync failed", e);
     return null;
   }
};

export const saveUserData = async (uid: string, data: { favorites: SavedItem[], history: ScenarioHistoryItem[] }) => {
  // Skip cloud save for guest user
  if (uid === GUEST_ID) return;

  if (!isConfigured) return;
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (e) {
    console.error("Save failed", e);
  }
};