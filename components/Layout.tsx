
import React from 'react';
import { useAuth } from '../App';
import { LogOut, Music, LayoutDashboard, User, Moon, Sun, ListMusic, Crown, Mic, MessageSquare, Disc3, Mic2 } from 'lucide-react';
import { Song, User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleTheme: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  queueCount: number;
  currentSong?: Song;
  currentUser?: UserType;
}

export const Layout: React.FC<LayoutProps> = ({ children, darkMode, toggleTheme, currentPage, setCurrentPage, queueCount, currentSong, currentUser }) => {
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
      <Icon size={20} className="shrink-0" />
      <span className="font-medium flex-1 text-left whitespace-nowrap">{label}</span>
      {count !== undefined && count > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
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
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
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
          
          <button 
                onClick={() => setCurrentPage('feedback')}
                className={`flex items-center gap-3 w-full p-2 mb-3 rounded-lg transition-all ${
                    currentPage === 'feedback' 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
                title="意見回饋"
            >
                <MessageSquare size={18} className="shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">意見回饋</span>
          </button>

          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-sm font-medium dark:text-gray-300 whitespace-nowrap">顯示模式</span>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:scale-110 transition-transform"
              title="切換深色/淺色模式"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ktv-400 to-ktv-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                {user.name[0]}
              </div>
              <div className="truncate flex-1 min-w-0">
                <p className="text-sm font-bold dark:text-white truncate" title={user.name}>{user.name}</p>
              </div>
              <button onClick={logout} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg shrink-0 transition-colors" title="登出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setCurrentPage('login')}
              className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
            >
              登入 / 註冊
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
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

      <div className="flex-1 flex flex-col h-full overflow-hidden pt-16 md:pt-0">
        <main className="flex-1 overflow-y-auto pb-32 md:pb-24 scroll-smooth">
            <div className="container mx-auto p-4 md:p-6 max-w-6xl">
            {children}
            </div>
        </main>
        
        {/* Sticky Now Playing Bar */}
        <div className="fixed bottom-[60px] md:bottom-0 md:relative w-full z-40 px-3 md:px-0">
             <div className="md:absolute md:bottom-0 md:left-0 md:right-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-4 py-3 md:py-4 flex items-center justify-between gap-4 mx-auto md:w-full transition-transform">
                {currentSong ? (
                     <>
                        <div className="flex items-center gap-3 overflow-hidden">
                             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-ktv-500 to-pink-500 flex items-center justify-center shrink-0 animate-spin-slow shadow-md">
                                 <Disc3 className="text-white w-5 h-5 md:w-6 md:h-6" />
                             </div>
                             <div className="min-w-0">
                                 <div className="flex items-center gap-2">
                                     <span className="text-[10px] md:text-xs font-bold text-ktv-500 bg-ktv-50 dark:bg-ktv-900/50 px-1.5 py-0.5 rounded uppercase tracking-wider">Now Playing</span>
                                     {currentUser && (
                                         <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                             <User size={10} /> {currentUser.name}
                                         </span>
                                     )}
                                 </div>
                                 <h4 className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate pr-2">
                                     {currentSong.title} <span className="text-gray-500 font-normal text-xs"> - {currentSong.artist}</span>
                                 </h4>
                             </div>
                        </div>
                        <button 
                            onClick={() => setCurrentPage('queue')}
                            className="shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            待播 {queueCount} 首
                        </button>
                     </>
                ) : (
                    <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 w-full justify-center py-1">
                         <Mic2 size={20} />
                         <span className="text-sm">目前沒有歌曲正在播放，快去點歌吧！</span>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-around p-2 z-50 pb-safe">
        <button onClick={() => setCurrentPage('songs')} className={`flex flex-col items-center p-2 ${currentPage === 'songs' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <Music size={24} />
            <span className="text-[10px] mt-1">點歌</span>
        </button>
        <button onClick={() => setCurrentPage('singers')} className={`flex flex-col items-center p-2 ${currentPage === 'singers' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <Mic size={24} />
            <span className="text-[10px] mt-1">歌手</span>
        </button>
        <button onClick={() => setCurrentPage('queue')} className={`flex flex-col items-center p-2 relative ${currentPage === 'queue' ? 'text-ktv-500' : 'text-gray-400'}`}>
            <ListMusic size={24} />
            <span className="text-[10px] mt-1">清單</span>
            {queueCount > 0 && (
                <span className="absolute top-1 right-3 min-w-[16px] h-4 flex items-center justify-center text-[10px] bg-red-500 text-white rounded-full px-1">
                    {queueCount}
                </span>
            )}
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
