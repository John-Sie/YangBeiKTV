
import React, { useState } from 'react';
import { Song, SongRequest, User } from '../types';
import { Crown, TrendingUp, Calendar, Loader2, Mic2, Star, Trophy, UserCheck, Languages, User as UserIcon } from 'lucide-react';
import { addRequest } from '../services/storage';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

interface RankingsProps {
  songs: Song[];
  requests: SongRequest[];
  users: User[];
  user: User | null;
  onRequest: () => void;
  onAddRequest: (req: SongRequest) => void;
  onSearchSinger?: (term: string) => void;
}

export const Rankings: React.FC<RankingsProps> = ({ songs, requests, users, user, onRequest, onAddRequest, onSearchSinger }) => {
  // Request Modal State
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // --- Logic for Top Songs ---
  const getTopSongs = (period: 'week' | 'month' | 'year') => {
    const now = new Date();
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);

    const periodRequests = requests.filter(r => new Date(r.requestedAt) > cutoff);
    
    const counts: Record<string, number> = {};
    periodRequests.forEach(r => {
        counts[r.songId] = (counts[r.songId] || 0) + 1;
    });

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) // Top 10
        .map(([songId, count]) => ({
            song: songs.find(s => s.id === songId),
            count
        }))
        .filter(item => item.song !== undefined);
  };

  // --- Logic for Top Songs By Language ---
  const getTopSongsByLanguage = (language: string) => {
      // Using All-Time data for languages to ensure lists are populated
      const counts: Record<string, number> = {};
      
      requests.forEach(r => {
          const song = songs.find(s => s.id === r.songId);
          if (song && song.language === language) {
              counts[r.songId] = (counts[r.songId] || 0) + 1;
          }
      });

      return Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10) // Top 10
          .map(([songId, count]) => ({
              song: songs.find(s => s.id === songId),
              count
          }))
          .filter(item => item.song !== undefined);
  };

  // --- Logic for Top Singers (Monthly) ---
  const getTopSingers = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setMonth(now.getMonth() - 1);

      const periodRequests = requests.filter(r => new Date(r.requestedAt) > cutoff);
      const counts: Record<string, number> = {};

      periodRequests.forEach(r => {
          const song = songs.find(s => s.id === r.songId);
          if (song && song.artist) {
              counts[song.artist] = (counts[song.artist] || 0) + 1;
          }
      });

      return Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([artist, count]) => ({
              artist,
              count
          }));
  };

  // --- Logic for King of Karaoke (Top Users) ---
  const getTopUsers = () => {
      const counts: Record<string, number> = {};
      requests.forEach(r => {
          counts[r.userId] = (counts[r.userId] || 0) + 1;
      });

      return Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10) // Top 10
          .map(([userId, count]) => ({
              user: users.find(u => u.id === userId),
              count
          }))
          .filter(item => item.user !== undefined);
  };

  // --- Get Song Stats for Modal ---
  const getSelectedSongStats = () => {
      if(!selectedSong) return { globalCount: 0, myCount: 0 };
      const globalCount = requests.filter(r => r.songId === selectedSong.id).length;
      const myCount = requests.filter(r => r.songId === selectedSong.id && r.userId === user?.id).length;
      return { globalCount, myCount };
  };

  // --- Request Logic ---
  const openRequestModal = (song: Song) => {
      if (!user) return showToast("請先登入以點歌", 'error');
      setSelectedSong(song);
  };

  const confirmRequest = async () => {
    if (!user || !selectedSong) return;
    
    setIsSubmitting(true);
    const newRequest: SongRequest = {
      id: Date.now().toString(),
      songId: selectedSong.id,
      userId: user.id,
      requestedAt: new Date().toISOString(),
      status: 'queued',
      // Key Shift Removed
    };

    try {
        await addRequest(newRequest);
        // Optimistic Update
        onAddRequest(newRequest);

        onRequest();
        showToast(`已點歌：${selectedSong.title}`, 'success');
        setSelectedSong(null);
    } catch(err) {
        console.error(err);
        showToast("點歌失敗", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Components ---

  const TopList = ({ title, data, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex-1 min-w-[300px]">
        <div className={`p-4 ${color} text-white flex items-center gap-2`}>
            <Icon size={20} />
            <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <div className="p-2">
            {data.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors group">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 ${
                        idx < 3 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'
                    }`}>
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium dark:text-white truncate">{item.song.title}</div>
                        <div className="text-xs text-gray-500 truncate">{item.song.artist}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                            {item.count} 點播
                        </span>
                        <button 
                            onClick={() => openRequestModal(item.song)}
                            className="p-2 bg-ktv-500 text-white rounded-full hover:bg-ktv-600 shadow-md active:scale-95 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="立即點歌"
                        >
                            <Mic2 size={14} />
                        </button>
                    </div>
                </div>
            ))}
            {data.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">暫無數據</div>
            )}
        </div>
    </div>
  );

  const SingerList = ({ data }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex-1 min-w-[300px]">
        <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center gap-2">
            <UserIcon size={20} />
            <h3 className="font-bold text-lg">本月熱門歌手</h3>
        </div>
        <div className="p-2">
            {data.map((item: any, idx: number) => (
                <div 
                    key={idx} 
                    onClick={() => onSearchSinger && onSearchSinger(item.artist)}
                    className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group"
                    title="點擊搜尋此歌手"
                >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-3 ${
                        idx < 3 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800'
                    }`}>
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 font-medium dark:text-white truncate">
                        {item.artist}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 whitespace-nowrap">
                            {item.count} 次
                        </span>
                    </div>
                </div>
            ))}
             {data.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">暫無數據</div>
            )}
        </div>
    </div>
  );

  const KingList = ({ data }: any) => (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex-1 min-w-[300px] border-t-4 border-t-yellow-400">
        <div className="p-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white flex items-center gap-2">
            <Trophy size={20} className="text-yellow-100" />
            <h3 className="font-bold text-lg">K歌之王 (點歌王)</h3>
        </div>
        <div className="p-2">
            {data.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                     <div className={`relative w-10 h-10 flex items-center justify-center rounded-full font-bold mr-3 ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-600 border-2 border-yellow-400' : 
                        idx === 1 ? 'bg-gray-100 text-gray-600 border-2 border-gray-300' :
                        idx === 2 ? 'bg-orange-50 text-orange-600 border-2 border-orange-300' :
                        'bg-slate-50 text-slate-500'
                    }`}>
                        {idx === 0 && <Crown size={14} className="absolute -top-2 -right-1 text-yellow-500 fill-yellow-500 rotate-12"/>}
                        {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold dark:text-white truncate flex items-center gap-2">
                            {item.user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                             {item.user.building}棟
                        </div>
                    </div>
                     <div className="text-sm font-bold text-ktv-500">
                        {item.count} 首
                    </div>
                </div>
            ))}
            {data.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">暫無數據</div>
            )}
        </div>
      </div>
  );

  const stats = getSelectedSongStats();

  return (
    <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-2">
             <h2 className="text-2xl font-bold dark:text-white">點歌排行榜</h2>
             <p className="text-sm text-gray-500">點擊列表中的 <Mic2 size={12} className="inline"/> 按鈕可直接點歌</p>
        </div>
       
        {/* Main Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            <TopList 
                title="本週熱門" 
                data={getTopSongs('week')} 
                icon={TrendingUp} 
                color="bg-pink-500" 
            />
            <TopList 
                title="本月排行" 
                data={getTopSongs('month')} 
                icon={Star} 
                color="bg-purple-500" 
            />
            <TopList 
                title="年度金曲" 
                data={getTopSongs('year')} 
                icon={Calendar} 
                color="bg-blue-500" 
            />
             <SingerList 
                data={getTopSingers()}
             />
        </div>

        {/* Language & User Stats */}
        <div className="mt-8">
            <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                <Languages className="text-ktv-500" /> 分類排行
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                 <TopList 
                    title="國語歌排行" 
                    data={getTopSongsByLanguage('Mandarin')} 
                    icon={Mic2} 
                    color="bg-red-500" 
                />
                 <TopList 
                    title="台語歌排行" 
                    data={getTopSongsByLanguage('Taiwanese')} 
                    icon={Mic2} 
                    color="bg-green-600" 
                />
                <TopList 
                    title="英語歌排行" 
                    data={getTopSongsByLanguage('English')} 
                    icon={Mic2} 
                    color="bg-blue-600" 
                />
                 <TopList 
                    title="粵語歌排行" 
                    data={getTopSongsByLanguage('Cantonese')} 
                    icon={Mic2} 
                    color="bg-teal-600" 
                />
            </div>
        </div>

         <div className="mt-8">
            <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-500" /> 榮譽榜
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KingList 
                    data={getTopUsers()}
                />
            </div>
        </div>

        {/* Request Options Modal (Reused) */}
        <Modal 
            isOpen={!!selectedSong} 
            onClose={() => setSelectedSong(null)} 
            title="點歌確認"
        >
            <div className="space-y-6 text-center">
                <div>
                    <h3 className="text-2xl font-bold dark:text-white mb-1">{selectedSong?.title}</h3>
                    <p className="text-lg text-gray-500">{selectedSong?.artist}</p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl">
                    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-slate-700">
                        <div className="flex flex-col items-center justify-center p-2">
                             <div className="text-gray-500 text-sm mb-1 flex items-center gap-1">
                                <UserCheck size={14} /> 您已點過
                             </div>
                             <div className="text-3xl font-bold text-ktv-500">{stats.myCount} <span className="text-sm text-gray-400 font-normal">次</span></div>
                        </div>
                         <div className="flex flex-col items-center justify-center p-2">
                             <div className="text-gray-500 text-sm mb-1 flex items-center gap-1">
                                <TrendingUp size={14} /> 歷史熱度
                             </div>
                             <div className="text-3xl font-bold text-orange-500">{stats.globalCount} <span className="text-sm text-gray-400 font-normal">次</span></div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={confirmRequest}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-ktv-500 hover:bg-ktv-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-ktv-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Mic2 size={24} />}
                    確認點歌
                </button>
            </div>
        </Modal>
    </div>
  );
};
