
import React, { useState, useMemo, useEffect } from 'react';
import { Song, User, SongRequest } from '../types';
import { Search, Heart, Mic2, Music2, Loader2, Globe, Type, ArrowUpDown, Filter, TrendingUp, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toggleFavorite, addRequest, fetchRequests } from '../services/storage';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface SongsProps {
  songs: Song[];
  user: User | null;
  refreshUserData: () => void;
  onRequest: () => void;
  onAddRequest: (req: SongRequest) => void;
  variant?: 'default' | 'favorites';
  initialQuery?: string;
}

const LANGUAGES = [
    { value: 'All', label: '全部' },
    { value: 'Mandarin', label: '國語' },
    { value: 'Taiwanese', label: '台語' },
    { value: 'Hakka', label: '客語' },
    { value: 'English', label: '英語' },
    { value: 'Cantonese', label: '粵語' },
    { value: 'Japanese', label: '日語' },
    { value: 'Korean', label: '韓語' },
];

const WORD_COUNTS = [
    { value: 0, label: '全部' },
    { value: 1, label: '1字' },
    { value: 2, label: '2字' },
    { value: 3, label: '3字' },
    { value: 4, label: '4字' },
    { value: 5, label: '5字' },
    { value: 6, label: '6字' },
    { value: 7, label: '7字' },
    { value: 8, label: '8字' },
    { value: 9, label: '9字' },
    { value: 10, label: '10字' },
    { value: 11, label: '11字+' },
];

type SortMode = 'length' | 'artist' | 'id';
const ITEMS_PER_PAGE = 10;

export const Songs: React.FC<SongsProps> = ({ songs, user, refreshUserData, onRequest, onAddRequest, variant = 'default', initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Filters
  const [langFilter, setLangFilter] = useState('All');
  const [wordCountFilter, setWordCountFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortMode>('length'); // Default by length
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Request Modal State
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  // Stats State for Modal
  const [songStats, setSongStats] = useState({ globalCount: 0, myCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Handle Initial Query Updates
  useEffect(() => {
    if (initialQuery) {
        setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, langFilter, wordCountFilter, sortBy, showFavOnly]);

  const filteredSongs = useMemo(() => {
    // Basic Filter: Hide deleted songs for normal users
    let result = songs.filter(s => !s.isDeleted);

    // 1. Favorites Filter (Only if enabled and NOT in favorites variant, assuming favorites variant passes pre-filtered list)
    if (variant !== 'favorites' && showFavOnly && user) {
      result = result.filter(s => user.favorites.includes(s.id));
    }

    // 2. Search Query
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q) || 
        s.id.includes(q)
      );
    }

    // 3. Language Filter
    if (langFilter !== 'All') {
        result = result.filter(s => s.language === langFilter);
    }

    // 4. Word Count Filter
    if (wordCountFilter > 0) {
        if (wordCountFilter === 11) {
            result = result.filter(s => s.title.length >= 11);
        } else {
            result = result.filter(s => s.title.length === wordCountFilter);
        }
    }

    // 5. Sorting
    result = [...result].sort((a, b) => {
        if (sortBy === 'length') {
            // Sort by length, then by ID as fallback
            const lenDiff = a.title.length - b.title.length;
            if (lenDiff !== 0) return lenDiff;
            return a.id.localeCompare(b.id);
        } else if (sortBy === 'artist') {
            // Use localCompare for proper Chinese sorting
            return a.artist.localeCompare(b.artist, 'zh-TW');
        } else {
            // ID Sort
            return a.id.localeCompare(b.id);
        }
    });

    return result;
  }, [songs, query, showFavOnly, user, langFilter, wordCountFilter, sortBy, variant]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = filteredSongs.slice(
      (currentPage - 1) * ITEMS_PER_PAGE, 
      currentPage * ITEMS_PER_PAGE
  );

  // Load stats when a song is selected
  useEffect(() => {
    if (selectedSong && user) {
        setIsLoadingStats(true);
        fetchRequests().then((requests: SongRequest[]) => {
            const globalCount = requests.filter(r => r.songId === selectedSong.id).length;
            const myCount = requests.filter(r => r.songId === selectedSong.id && r.userId === user.id).length;
            setSongStats({ globalCount, myCount });
            setIsLoadingStats(false);
        });
    } else {
        setSongStats({ globalCount: 0, myCount: 0 });
    }
  }, [selectedSong, user]);

  const handleFavorite = async (songId: string) => {
    if (!user) return showToast("請先登入", 'error');
    await toggleFavorite(user.id, songId);
    refreshUserData();
    showToast("收藏清單已更新", 'success');
  };

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
        // Optimistic Update call
        onAddRequest(newRequest);

        onRequest();
        showToast(`已點歌：${selectedSong.title}`, 'success');
        setSelectedSong(null);
    } catch(err) {
        console.error(err);
        showToast("點歌失敗，請檢查網路", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Top Header: Title */}
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <Music2 className="text-ktv-500"/>
                點歌大廳
            </h2>
             <span className="text-sm text-gray-500">共 {filteredSongs.length} 首歌曲</span>
        </div>

        {/* Search & Sort Bar (Combined Row) */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
            {/* Search Input (Grow) */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="輸入歌名、歌手或編號搜尋..." 
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2 h-[42px]">
                 <ArrowUpDown size={16} className="text-gray-400 ml-1" />
                 <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as SortMode)}
                    className="text-sm bg-transparent border-none outline-none dark:text-white p-2 cursor-pointer"
                >
                    <option value="length">字數排序</option>
                    <option value="artist">歌手排序</option>
                    <option value="id">編號排序</option>
                </select>
            </div>

            {/* Favorite Filter Toggle */}
            {user && variant === 'default' && (
                <button 
                    onClick={() => setShowFavOnly(!showFavOnly)}
                    className={`px-4 rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap h-[42px] ${showFavOnly ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                    <Heart size={18} fill={showFavOnly ? 'currentColor' : 'none'} />
                    <span className="hidden sm:inline">只看收藏</span>
                </button>
            )}
             {variant === 'favorites' && (
                <div className="px-4 rounded-lg border border-pink-500 bg-pink-500 text-white flex items-center gap-2 whitespace-nowrap cursor-default h-[42px]">
                    <Heart size={18} fill="currentColor" />
                    <span className="hidden sm:inline">只看收藏</span>
                </div>
            )}
        </div>

        {/* Secondary Filters: Language & Word Count */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            {/* Language Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs font-medium whitespace-nowrap uppercase tracking-wider">
                    <Globe size={14} /> 語種
                </div>
                {LANGUAGES.map(lang => (
                    <button
                        key={lang.value}
                        onClick={() => setLangFilter(lang.value)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
                            langFilter === lang.value 
                            ? 'bg-ktv-500 text-white shadow-md shadow-ktv-500/20' 
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {lang.label}
                    </button>
                ))}
            </div>

            {/* Word Count Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar border-t border-gray-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs font-medium whitespace-nowrap uppercase tracking-wider">
                    <Type size={14} /> 字數
                </div>
                {WORD_COUNTS.map(wc => (
                    <button
                        key={wc.value}
                        onClick={() => setWordCountFilter(wc.value)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
                            wordCountFilter === wc.value 
                            ? 'bg-ktv-500 text-white shadow-md shadow-ktv-500/20' 
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {wc.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Song Grid (Paginated) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {paginatedSongs.map(song => (
            <div key={song.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center group hover:border-ktv-400 transition-colors">
                <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-ktv-500 font-mono bg-ktv-50 dark:bg-ktv-900/30 px-1.5 py-0.5 rounded">{song.id}</span>
                        {song.language !== 'Mandarin' && song.language !== 'Unknown' && (
                           <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-slate-600 px-1 rounded">
                               {LANGUAGES.find(l => l.value === song.language)?.label || song.language}
                           </span>
                        )}
                    </div>
                    <h3 className="font-bold text-lg dark:text-white truncate tracking-wide">{song.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{song.artist}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleFavorite(song.id)}
                        className={`p-2 rounded-full hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors ${user?.favorites.includes(song.id) ? 'text-pink-500' : 'text-gray-300'}`}
                    >
                        <Heart size={20} fill={user?.favorites.includes(song.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                        onClick={() => openRequestModal(song)}
                        className="p-2 rounded-full bg-ktv-500 text-white hover:bg-ktv-600 shadow-lg shadow-ktv-500/30 active:scale-95 transition-all"
                    >
                        <Mic2 size={20} />
                    </button>
                </div>
            </div>
        ))}
        {paginatedSongs.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 flex flex-col items-center">
                <Filter size={48} className="mb-4 opacity-20" />
                <p>沒有找到符合條件的歌曲</p>
                <button 
                    onClick={() => {
                        setLangFilter('All');
                        setWordCountFilter(0);
                        setQuery('');
                    }}
                    className="mt-4 text-ktv-500 text-sm hover:underline"
                >
                    清除所有篩選條件
                </button>
            </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredSongs.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 mt-8 pb-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
              >
                  <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  第 <span className="text-ktv-500 font-bold">{currentPage}</span> / {totalPages} 頁
              </span>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
              >
                  <ChevronRight size={20} />
              </button>
          </div>
      )}

      {/* Request Options Modal */}
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

            {/* Stats Section */}
            <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-xl">
                {isLoadingStats ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : (
                    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-slate-700">
                        <div className="flex flex-col items-center justify-center p-2">
                             <div className="text-gray-500 text-sm mb-1 flex items-center gap-1">
                                <UserCheck size={14} /> 您已點過
                             </div>
                             <div className="text-3xl font-bold text-ktv-500">{songStats.myCount} <span className="text-sm text-gray-400 font-normal">次</span></div>
                        </div>
                         <div className="flex flex-col items-center justify-center p-2">
                             <div className="text-gray-500 text-sm mb-1 flex items-center gap-1">
                                <TrendingUp size={14} /> 歷史熱度
                             </div>
                             <div className="text-3xl font-bold text-orange-500">{songStats.globalCount} <span className="text-sm text-gray-400 font-normal">次</span></div>
                        </div>
                    </div>
                )}
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
