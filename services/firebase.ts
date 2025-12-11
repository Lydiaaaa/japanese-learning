import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
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

// Initialize Firebase
let app;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let isConfigured = false;

try {
  // Basic check to see if user has replaced the placeholder
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
    isConfigured = true;
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

// Export User type for consumption in components
export type User = firebase.User;

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
} as unknown as firebase.User;

export const loginWithGoogle = async () => {
  if (!isConfigured) {
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

  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
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
  if (!isConfigured) return;
  return auth.signOut();
};

export const subscribeToAuth = (callback: (user: firebase.User | null) => void) => {
  if (!isConfigured) {
    callback(null);
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
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

   if (!isConfigured) return null;
   
   const userRef = db.collection('users').doc(uid);
   
   try {
     const snap = await userRef.get();
     
     if (snap.exists) {
       const cloudData = snap.data() as { favorites: SavedItem[], history: ScenarioHistoryItem[] };
       const merged = mergeData(
         { favorites: cloudData.favorites || [], history: cloudData.history || [] }, 
         localData
       );
       
       await userRef.set(merged, { merge: true });
       return merged;
     } else {
       await userRef.set(localData);
       return localData;
     }
   } catch (e) {
     console.error("Sync failed", e);
     return null;
   }
};

export const saveUserData = async (uid: string, data: { favorites: SavedItem[], history: ScenarioHistoryItem[] }) => {
  if (uid === GUEST_ID) return;
  if (!isConfigured) return;
  try {
    await db.collection('users').doc(uid).set(data, { merge: true });
  } catch (e) {
    console.error("Save failed", e);
  }
};

// --- SHARING FUNCTIONALITY ---

export const shareScenario = async (content: ScenarioContent): Promise<string | null> => {
  if (!isConfigured) return null;
  try {
    const docRef = await db.collection('shares').add({
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
  if (!isConfigured) return null;
  try {
    const docRef = db.collection('shares').doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
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
