import React from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../constants';
import { loginWithGoogle, logout, GUEST_ID } from '../services/firebase';

interface UserMenuProps {
  user: User | null;
  isSyncing: boolean;
  language: Language;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, isSyncing, language }) => {
  const t = UI_TEXT[language];

  // Handle Logout (supporting both Firebase and Guest cleanup)
  const handleLogout = () => {
    if (user?.uid === GUEST_ID) {
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
        <button
          onClick={() => loginWithGoogle()}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <LogIn className="w-4 h-4" />
          {t.login}
        </button>
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