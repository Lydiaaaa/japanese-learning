import React from 'react';
import { LogIn, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { UI_TEXT } from '../constants';
import { loginWithGoogle, logout, GUEST_ID, User } from '../services/firebase';

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
      <div className="flex items-center gap-2 text-slate-400 px-3 py-1.5 border-2 border-transparent">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm hidden sm:inline font-bold">{t.syncing}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {/* Removed shadow-neo-sm from black button, radius reduced */}
        <button
          onClick={() => loginWithGoogle()}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-black border-2 border-black text-white text-sm font-bold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">{t.login}</span>
        </button>
      </div>
    );
  }

  const isGuest = user.uid === GUEST_ID;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isGuest ? (
           <div className="flex items-center gap-2 bg-pastel-yellow text-black px-3 py-1.5 rounded-lg border-2 border-black flex-shrink-0 shadow-sm">
             <UserIcon className="w-4 h-4" />
             <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Guest</span>
           </div>
        ) : (
          <>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} className="w-9 h-9 rounded-full border-2 border-black flex-shrink-0 object-cover shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-pastel-blue border-2 border-black flex items-center justify-center text-black flex-shrink-0 shadow-sm">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
          </>
        )}
      </div>
      
      <button
        onClick={handleLogout}
        className="p-2 text-slate-800 hover:text-black hover:bg-slate-100 border-2 border-transparent hover:border-black rounded-lg transition-all flex-shrink-0"
        title={t.logout}
      >
        <LogOut className="w-4 h-4 stroke-[3]" />
      </button>
    </div>
  );
};