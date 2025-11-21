import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Loader2, Info, Copy, Check, UserPlus } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../constants';
import { loginWithGoogle, logout, GUEST_ID } from '../services/firebase';

interface UserMenuProps {
  user: User | null;
  isSyncing: boolean;
  language: Language;
  onGuestLogin?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, isSyncing, language, onGuestLogin }) => {
  const t = UI_TEXT[language];
  const [showDebug, setShowDebug] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState('检测中...');
  const [copied, setCopied] = useState(false);

  // Robustly detect the domain on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Priority: hostname -> host -> origin -> href
      let val = window.location.hostname || window.location.host || window.location.origin || window.location.href;
      
      // Clean up the value to get just the domain
      // 1. Remove protocol (http:// or https://)
      val = val.replace(/^https?:\/\//, '');
      
      // 2. Remove any path or query string (everything after the first / or ?)
      val = val.split('/')[0];
      val = val.split('?')[0];
      
      setDetectedDomain(val);
    }
  }, []);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(detectedDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Logout (supporting both Firebase and Guest)
  const handleLogout = () => {
    if (user?.uid === GUEST_ID) {
      // For guest, we assume parent component handles nulling user when we trigger a "logout" logic 
      // or we just reload page. But cleaner is to have a prop for logout if we managed state up there.
      // However, `logout` from firebase service only does firebaseSignOut.
      // Since App.tsx listens to auth state, firebaseSignOut triggers null user.
      // But for Guest, we need to manually reset in App.tsx? 
      // Actually, calling window.location.reload() is a simple way to clear "Guest" session state held in memory variable in App.tsx.
      window.location.reload(); 
    } else {
      logout();
    }
  };

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-slate-400 px-3 py-1.5">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t.syncing}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {onGuestLogin && (
          <button
            onClick={onGuestLogin}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            访客试用
          </button>
        )}

        <button
          onClick={() => loginWithGoogle()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          {t.login}
        </button>
        
        {/* Debug helper for Firebase Domain */}
        <div className="relative">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors"
            title="配置 Firebase 域名"
          >
            <Info className="w-4 h-4" />
          </button>
          
          {showDebug && (
            <div className="absolute right-0 top-full mt-2 p-4 bg-white rounded-xl shadow-xl border border-slate-200 w-72 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-slate-700">Firebase 配置所需域名:</p>
                <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              
              <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-slate-600 break-all mb-2 relative group">
                {detectedDomain}
              </div>

              <button 
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors mb-3 font-medium"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制域名'}
              </button>

              <p className="text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
                <span className="text-amber-600 font-bold">配置无效？</span><br/>
                如果添加域名后仍报错，说明代码中的 <code className="bg-slate-100 px-1 rounded">firebaseConfig</code> 不属于您。请使用“访客试用”模式。
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isGuest = user.uid === GUEST_ID;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isGuest ? (
           <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100">
             <UserIcon className="w-4 h-4" />
             <span className="text-sm font-medium">访客</span>
           </div>
        ) : (
          <>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </>
        )}
      </div>
      
      <button
        onClick={handleLogout}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
        title={t.logout}
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};