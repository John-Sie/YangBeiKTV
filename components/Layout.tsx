
import React from 'react';
import { useAuth } from '../App';
import { LogOut, Music, LayoutDashboard, User, Moon, Sun, ListMusic, Crown, Mic, MessageSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleTheme: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  queueCount: number;
}

export const Layout: React.FC<LayoutProps> = ({ children, darkMode, toggleTheme, currentPage, setCurrentPage, queueCount }) => {
  const { user, logout } = useAuth();

  const NavItem = ({ page, icon: Icon, label, count }: { page: string, icon: any, label: string, count?: number }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`relative flex items-center space-x-3 w-full p-3 rounded-xl transition-all ${
        currentPage === page 
          ? 'bg-ktv-500 text-white shadow-lg shadow-ktv-500/30' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              currentPage === page 
                ? 'bg-white text-ktv-500' 
                : 'bg-ktv-100 dark:bg-ktv-900 text-ktv-600 dark:text-ktv-300'
          }`}>
              {count}
          </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* Sidebar - Desktop (Width changed from w-64 to w-48) */}
      <aside className="hidden md:flex flex-col w-48 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-ktv-700 to-ktv-500 bg-clip-text text-transparent whitespace-nowrap">
            潤泰央北 KTV
          </h1>
          <p className="text-xs text-gray-500 mt-1">智慧點歌系統</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem page="songs" icon={Music} label="點歌大廳" />
          <NavItem page="singers" icon={Mic} label="歌手分類" />
          <NavItem page="queue" icon={ListMusic} label="點歌列表" count={queueCount} />
          <NavItem page="rankings" icon={Crown} label="點歌排行榜" />
          {user && <NavItem page="profile" icon={User} label="個人中心" />}
          {user?.role === 'ADMIN' && <NavItem page="admin" icon={LayoutDashboard} label="後台管理" />}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium dark:text-gray-300">系統</span>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setCurrentPage('feedback')}
                    className={`p-2 rounded-full transition-all hover:scale-110 ${
                        currentPage === 'feedback' 
                        ? 'bg-ktv-100 text-ktv-600 dark:bg-ktv-900 dark:text-ktv-300' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
                    }`}
                    title="意見回饋"
                >
                    <MessageSquare size={18} />
                </button>
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:scale-110 transition-transform"
                  title="切換深色/淺色模式"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ktv-400 to-ktv-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {user.name[0]}
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="text-sm font-bold dark:text-white truncate" title={user.name}>{user.name}</p>
                <p className="text-[10px] text-gray-500 truncate" title={`${user.building}棟 ${user.floor}F-${user.door}`}>
                    {user.building}棟 {user.floor}F-{user.door}
                </p>
              </div>
              <button onClick={logout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg shrink-0 transition-colors" title="登出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCurrentPage('login')}
              className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              登入 / 註冊
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header & Bottom Nav */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center">
         <h1 className="text-lg font-bold bg-gradient-to-r from-ktv-700 to-ktv-500 bg-clip-text text-transparent">
            潤泰央北 KTV
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={() => setCurrentPage('feedback')}
                className={`p-2 rounded-full transition-colors ${
                    currentPage === 'feedback' 
                    ? 'text-ktv-500 bg-ktv-50 dark:bg-ktv-900/20' 
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                title="意見回饋"
            >
                <MessageSquare size={20} />
            </button>
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-yellow-400">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {user && (
                 <button onClick={logout} className="p-2 text-red-500">
                    <LogOut size={20} />
                 </button>
            )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0 scroll-smooth">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          {children}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-around p-2 z-50">
        <button onClick={() => setCurrentPage('songs')} className={`flex flex-col items-center p-2 ${currentPage === 'songs' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <Music size={24} />
            <span className="text-[10px] mt-1">點歌</span>
        </button>
        <button onClick={() => setCurrentPage('singers')} className={`flex flex-col items-center p-2 ${currentPage === 'singers' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <Mic size={24} />
            <span className="text-[10px] mt-1">歌手</span>
        </button>
        <button onClick={() => setCurrentPage('queue')} className={`relative flex flex-col items-center p-2 ${currentPage === 'queue' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <div className="relative">
                <ListMusic size={24} />
                {queueCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                        {queueCount}
                    </span>
                )}
            </div>
            <span className="text-[10px] mt-1">清單</span>
        </button>
        <button onClick={() => setCurrentPage('rankings')} className={`flex flex-col items-center p-2 ${currentPage === 'rankings' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <Crown size={24} />
            <span className="text-[10px] mt-1">排行</span>
        </button>
        {user ? (
            <button onClick={() => setCurrentPage('profile')} className={`flex flex-col items-center p-2 ${currentPage === 'profile' ? 'text-ktv-500' : 'text-gray-400'}`}>
                <User size={24} />
                <span className="text-[10px] mt-1">我的</span>
            </button>
        ) : (
             <button onClick={() => setCurrentPage('login')} className={`flex flex-col items-center p-2 ${currentPage === 'login' ? 'text-ktv-500' : 'text-gray-400'}`}>
                <User size={24} />
                <span className="text-[10px] mt-1">登入</span>
            </button>
        )}
      </div>
    </div>
  );
};
