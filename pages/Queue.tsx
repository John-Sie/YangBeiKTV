
import React, { useMemo } from 'react';
import { Song, SongRequest, User } from '../types';
import { updateRequestStatus, toggleFavorite } from '../services/storage';
import { Music, Mic2, User as UserIcon, Clock, Zap, CheckCircle2, Heart } from 'lucide-react';
import { useToast } from '../components/Toast';

interface QueueProps {
  requests: SongRequest[];
  songs: Song[];
  users: User[];
  user: User | null;
  refreshUserData: () => void;
  onUpdateStatus: (reqId: string, status: 'played' | 'cancelled') => void;
}

export const Queue: React.FC<QueueProps> = ({ requests, songs, users, user: currentUser, refreshUserData, onUpdateStatus }) => {
  const { showToast } = useToast();

  const queue = useMemo(() => {
      // Only show queued songs
      const activeQueue = requests.filter(r => r.status === 'queued');
      // Sort by requestedAt ASCENDING (Oldest First - FIFO)
      return activeQueue.sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
  }, [requests]);

  const handleMarkPlayed = async (reqId: string, songName: string) => {
    // 1. Optimistic Update via Parent
    onUpdateStatus(reqId, 'played');
    
    // 2. Show Feedback
    showToast(`"${songName}" 已標記為唱完`, 'success');

    // 3. Actual Backend Update
    try {
        await updateRequestStatus(reqId, 'played');
    } catch (err) {
        console.error("Update failed", err);
        showToast("操作失敗，請檢查網路連線", 'error');
        // We rely on Supabase subscription in App.tsx to revert/correct if it failed, 
        // or one could revert optimistic update here if desired, but for simplicity we assume success.
    }
  };

  const handleFavorite = async (songId: string) => {
      if (!currentUser) {
          showToast("請先登入才能收藏", 'error');
          return;
      }
      await toggleFavorite(currentUser.id, songId);
      refreshUserData();
      showToast("收藏清單已更新", 'success');
  };

  const getSong = (id: string) => songs.find(s => s.id === id);
  const getUser = (id: string) => users.find(u => u.id === id);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2 mb-8">
         <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
            <Mic2 className="text-ktv-500 w-8 h-8"/>
            目前播放列表
         </h2>
         <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            <Zap size={14} className="text-yellow-500" />
            即時同步中 • 先點先唱
         </p>
      </div>

      <div className="grid gap-4 max-w-2xl mx-auto">
        {queue.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500">目前沒有人在排隊</p>
                <p className="text-sm text-gray-400 mt-2">快去點歌大廳點一首吧！</p>
            </div>
        ) : (
            queue.map((req, idx) => {
                const song = getSong(req.songId);
                const user = getUser(req.userId);
                
                // Format: A76-19F
                const userInfo = user ? `${user.building}${user.door}-${user.floor}F` : '未知住戶';
                const isFavorite = currentUser?.favorites.includes(req.songId);

                // 計算顯示編號：直接使用 Index + 1 (因為已經是 FIFO 排序)
                const displayNumber = idx + 1;

                const requestTime = new Date(req.requestedAt).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                return (
                    <div 
                        key={req.id} 
                        className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-all hover:border-ktv-200 dark:hover:border-slate-700"
                    >
                        {/* Number Badge */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shrink-0 ${
                            displayNumber === 1 
                                ? 'bg-ktv-500 text-white shadow-lg shadow-ktv-500/30 ring-2 ring-ktv-200 dark:ring-ktv-900' 
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                        }`}>
                            {displayNumber}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate mb-1">
                                {song?.title || '載入中...'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1 min-w-0 truncate">
                                    <Mic2 size={14}/> {song?.artist}
                                </span>
                                <span className="hidden sm:inline w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="flex items-center gap-1 font-mono text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                    <UserIcon size={12}/> {userInfo}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                                    <Clock size={12}/> {requestTime}
                                </span>
                            </div>
                        </div>

                        {/* Right Actions & Info */}
                        <div className="flex items-center gap-2 shrink-0">
                            
                            {/* Favorite Button */}
                            <button 
                                onClick={() => song && handleFavorite(song.id)}
                                className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'text-gray-300 hover:text-pink-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                title={isFavorite ? "已收藏" : "加入收藏"}
                            >
                                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
                            </button>

                            {/* Mark Played Button (Green Rounded) */}
                            <button 
                                onClick={() => handleMarkPlayed(req.id, song?.title || '')}
                                className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white hover:bg-green-600 rounded-full text-sm font-bold shadow-md shadow-green-500/20 transition-all active:scale-95 whitespace-nowrap"
                                title="標記為已唱 (將移出播放清單並加入個人紀錄)"
                            >
                                <CheckCircle2 size={16} />
                                <span>已唱</span>
                            </button>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
