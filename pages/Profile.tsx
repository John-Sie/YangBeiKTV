
import React, { useEffect, useState, useMemo } from 'react';
import { User, Song, SongRequest } from '../types';
import { updateRequestStatus } from '../services/storage';
import { Clock, Music, CheckCircle2, XCircle, Loader2, X, TrendingUp, UserCheck, ChevronLeft, ChevronRight, Mic2, Sparkles, RefreshCcw, LayoutDashboard, MessageSquare } from 'lucide-react';
import { useToast } from '../components/Toast';

interface ProfileProps {
  user: User | null;
  songs: Song[];
  requests: SongRequest[]; // Received from App state
  refreshData: () => void;
  onNavigate?: (page: string) => void;
}

const ITEMS_PER_PAGE = 5;

export const Profile: React.FC<ProfileProps> = ({ user, songs, requests, refreshData, onNavigate }) => {
  const { showToast } = useToast();
  
  // Independent Pagination States
  const [historyPage, setHistoryPage] = useState(1);
  const [sungPage, setSungPage] = useState(1);

  // Reset pagination when user changes
  useEffect(() => {
      setHistoryPage(1);
      setSungPage(1);
  }, [user]);

  // 1. All History (All statuses)
  const myRequests = useMemo(() => {
      if (!user) return [];
      return requests
        .filter(r => r.userId === user.id)
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [requests, user]);

  // 2. Sung History (Only 'played')
  const mySungRequests = useMemo(() => {
      return myRequests.filter(r => r.status === 'played');
  }, [myRequests]);

  // Helper: Get Song Detail
  const getSongDetail = (id: string) => songs.find(s => s.id === id);

  // Helper: Stats calculation
  const getSongStats = (songId: string) => {
      const globalCount = requests.filter(r => r.songId === songId).length;
      const myCount = requests.filter(r => r.songId === songId && r.userId === user?.id).length;
      return { globalCount, myCount };
  };

  // Helper: Handle Cancel
  const handleCancelRequest = async (requestId: string) => {
      if(confirm("確定要取消這首點歌嗎？")) {
          await updateRequestStatus(requestId, 'cancelled');
          showToast("點歌已取消", 'info');
          // No need to manually reload, App subscription will handle it, or we could optimistic update if passed down
          refreshData(); 
      }
  };

  // --- Pagination Logic for History Block ---
  const totalHistoryPages = Math.ceil(myRequests.length / ITEMS_PER_PAGE);
  const paginatedHistory = myRequests.slice(
      (historyPage - 1) * ITEMS_PER_PAGE,
      historyPage * ITEMS_PER_PAGE
  );

  // --- Pagination Logic for Sung Block ---
  const totalSungPages = Math.ceil(mySungRequests.length / ITEMS_PER_PAGE);
  const paginatedSung = mySungRequests.slice(
      (sungPage - 1) * ITEMS_PER_PAGE,
      sungPage * ITEMS_PER_PAGE
  );

  if (!user) return <div className="p-8 text-center text-gray-500">請先登入以查看個人紀錄</div>;

  return (
    <div className="dark:text-white space-y-8 animate-in fade-in pb-10">
         <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold">個人中心</h2>
             <button onClick={refreshData} className="p-2 text-gray-500 hover:text-ktv-500 transition-colors" title="重新整理數據">
                <RefreshCcw size={18} />
             </button>
         </div>
         
         {/* User Info Card */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-ktv-500 rounded-full flex items-center justify-center text-3xl text-white font-bold shadow-lg shadow-ktv-500/30">
                    {user?.name[0]}
                </div>
                <div>
                    <p className="text-xl font-bold">{user?.name}</p>
                    <p className="text-gray-500">{user?.building}棟 {user?.door}號 {user?.floor}樓</p>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-ktv-500">{user?.favorites.length}</p>
                    <p className="text-xs text-gray-500">已收藏歌曲</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-500">{mySungRequests.length}</p>
                    <p className="text-xs text-gray-500">已唱歌曲</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-500">{myRequests.length}</p>
                    <p className="text-xs text-gray-500">歷史點歌總數</p>
                </div>
            </div>
         </div>

         {/* System Menu (Mobile Access) */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-4 text-gray-600 dark:text-gray-300">功能選單</h3>
             <div className="space-y-3">
                 <button 
                    onClick={() => onNavigate && onNavigate('feedback')}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                 >
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <MessageSquare size={20} />
                     </div>
                     <span className="font-medium">意見回饋</span>
                     <ChevronRight className="ml-auto text-gray-400" size={16}/>
                 </button>

                 {user.role === 'ADMIN' && (
                     <button 
                        onClick={() => onNavigate && onNavigate('admin')}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
                     >
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <LayoutDashboard size={20} />
                        </div>
                        <div>
                            <span className="font-medium block">後台管理</span>
                            <span className="text-xs text-gray-500">系統數據與資料維護</span>
                        </div>
                        <ChevronRight className="ml-auto text-gray-400" size={16}/>
                     </button>
                 )}
             </div>
         </div>

         {/* Block 1: My Singing History (我的唱歌紀錄) */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm ring-1 ring-orange-100 dark:ring-orange-900/30">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-orange-600 dark:text-orange-400 text-lg">
                <Mic2 size={22} className="fill-orange-500 text-white"/>
                我的唱歌紀錄
                <span className="text-xs font-normal text-gray-500 ml-2 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded-full">已唱完的歌曲</span>
            </h3>
            
            <div className="space-y-3">
                {paginatedSung.length === 0 ? (
                    <div className="text-center py-8 bg-orange-50/50 dark:bg-slate-800/50 rounded-lg border-dashed border border-orange-200 dark:border-slate-700">
                            <Sparkles className="mx-auto text-orange-300 mb-2" size={32}/>
                            <p className="text-gray-500">還沒有已唱紀錄，快去播放清單把歌曲標記為「已唱」吧！</p>
                    </div>
                ) : (
                    paginatedSung.map(req => {
                        const song = getSongDetail(req.songId);
                        const dateStr = new Date(req.requestedAt).toLocaleDateString();
                        
                        return (
                            <div key={'sung-' + req.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-lg border border-orange-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-full text-orange-500">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <p className="font-bold dark:text-white">{song?.title || '未知歌曲'}</p>
                                        <p className="text-xs text-gray-500">{song?.artist}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                    {dateStr}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination for Sung History */}
            {totalSungPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button 
                        onClick={() => setSungPage(p => Math.max(1, p - 1))}
                        disabled={sungPage === 1}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 text-gray-500"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs text-gray-500">
                        {sungPage} / {totalSungPages}
                    </span>
                    <button 
                        onClick={() => setSungPage(p => Math.min(totalSungPages, p + 1))}
                        disabled={sungPage === totalSungPages}
                        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 text-gray-500"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
         </div>

         {/* Block 2: My Request History (我的點歌紀錄 - All) */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-ktv-600 dark:text-ktv-400 text-lg">
                <Clock size={22} className="text-ktv-500"/>
                我的點歌紀錄
                <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">包含排隊、已播、取消</span>
            </h3>
            
            <div className="space-y-4">
                {paginatedHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">尚無點歌紀錄</p>
                ) : (
                    paginatedHistory.map(req => {
                        const song = getSongDetail(req.songId);
                        const { globalCount, myCount } = getSongStats(req.songId);
                        const dateStr = new Date(req.requestedAt).toLocaleString('zh-TW', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });

                        return (
                            <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl group border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0 text-slate-500 dark:text-slate-300">
                                        <Music size={20} />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <p className="font-bold text-lg truncate dark:text-white">{song?.title || '未知歌曲'}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <span className="text-gray-400">{dateStr}</span>
                                            
                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap" title="您點播此歌的次數">
                                                <UserCheck size={12} /> 自己點過 {myCount} 次
                                            </span>
                                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap" title="全系統歷史點播次數">
                                                <TrendingUp size={12} /> 歷史熱度 {globalCount}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 ml-4 flex flex-col items-end gap-2">
                                    {req.status === 'queued' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1 font-bold whitespace-nowrap">
                                                <Clock size={12}/> 排隊中
                                            </span>
                                            <button 
                                                onClick={() => handleCancelRequest(req.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                                title="取消點歌"
                                            >
                                                <X size={18}/>
                                            </button>
                                        </div>
                                    )}
                                    {req.status === 'played' && (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1 font-bold whitespace-nowrap">
                                            <CheckCircle2 size={12}/> 已播
                                        </span>
                                    )}
                                    {req.status === 'cancelled' && (
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1 font-bold whitespace-nowrap">
                                            <XCircle size={12}/> 取消
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination Controls for History */}
            {totalHistoryPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button 
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm text-gray-500">
                        第 {historyPage} / {totalHistoryPages} 頁
                    </span>
                    <button 
                        onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                        disabled={historyPage === totalHistoryPages}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
         </div>
    </div>
  );
};
