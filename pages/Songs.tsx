
import React, { useState, useMemo, useEffect } from 'react';
import { Song, User, SongRequest, SongFilterState, SortMode } from '../types';
import { Search, Heart, Mic2, Music2, Loader2, Globe, Type, ArrowUpDown, Filter, TrendingUp, UserCheck, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
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
  filters?: SongFilterState;
  setFilters?: React.Dispatch<React.SetStateAction<SongFilterState>>;
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

const ITEMS_PER_PAGE = 10;

// --- Helper: Simple Simplified to Traditional Mapping ---
const SIMPLIFIED_MAP: Record<string, string> = {
    '伦': '倫', '杰': '傑', '陈': '陳', '奕': '奕', '迅': '迅',
    '张': '張', '学': '學', '友': '友',
    '刘': '劉', '德': '德', '华': '華',
    '许': '許', '嵩': '嵩', '邓': '鄧', '紫': '紫', '棋': '棋',
    '林': '林', '俊': '俊',
    '萧': '蕭', '敬': '敬', '腾': '騰',
    '孙': '孫', '燕': '燕', '姿': '姿',
    '蔡': '蔡', '依': '依',
    '王': '王', '力': '力', '宏': '宏',
    '谢': '謝', '和': '和', '弦': '弦',
    '爱': '愛', '国': '國', '台': '臺', '湾': '灣', '过': '過', '这': '這', '么': '麼',
    '伤': '傷', '听': '聽', '说': '說', '谁': '誰', '让': '讓', '风': '風', '点': '點',
    '时': '時', '候': '候', '乐': '樂', '团': '團', '号': '號', '双': '雙', '对': '對',
    '个': '個', '们': '們', '来': '來', '两': '兩', '书': '書', '亚': '亞', '仅': '僅',
    '从': '從', '优': '優', '伟': '偉', '传': '傳', '体': '體', '儿': '兒', '动': '動',
    '励': '勵', '医': '醫', '变': '變', '图': '圖', '声': '聲', '夜': '夜', '妈': '媽',
    '宝': '寶', '实': '實', '专': '專', '导': '導', '将': '將', '层': '層', '属': '屬',
    '岁': '歲', '带': '帶', '广': '廣', '归': '歸', '当': '當', '战': '戰', '扩': '擴',
    '扫': '掃', '无': '無', '热': '熱', '独': '獨', '现': '現', '球': '球', '电': '電',
    '监': '監', '确': '確', '种': '種', '稳': '穩', '笔': '筆', '简': '簡', '红': '紅',
    '纤': '纖', '纯': '純', '级': '級', '结': '結', '给': '給', '统': '統', '绩': '績',
    '维': '維', '线': '線', '练': '練', '续': '續', '总': '總', '置': '置',
    '网': '網', '罗': '羅', '聪': '聰', '联': '聯', '脑': '腦', '脸': '臉',
    '举': '舉', '旧': '舊', '觉': '覺', '亲': '親', '诗': '詩', '诚': '誠', '话': '話',
    '认': '認', '语': '語', '读': '讀', '调': '調', '贝': '貝', '质': '質', '车': '車',
    '军': '軍', '办': '辦', '农': '農', '边': '邊', '运': '運', '达': '達',
    '进': '進', '远': '遠', '选': '選', '还': '還', '邮': '郵', '钱': '錢', '钟': '鐘',
    '长': '長', '门': '門', '开': '開', '闻': '聞', '阳': '陽', '队': '隊', '随': '隨',
    '险': '險', '隐': '隱', '隶': '隸', '难': '難', '雨': '雨', '雷': '雷', '面': '面',
    '韦': '韋', '音': '音', '页': '頁', '飞': '飛', '饭': '飯', '马': '馬',
    '验': '驗', '骑': '騎', '鸡': '雞', '麦': '麥', '黄': '黃', '龙': '龍'
};

const toTraditional = (str: string) => {
    return str.split('').map(char => SIMPLIFIED_MAP[char] || char).join('');
};

// --- Helper: Levenshtein Distance for Fuzzy Search ---
const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

export const Songs: React.FC<SongsProps> = ({ songs, user, refreshUserData, onRequest, onAddRequest, variant = 'default', filters, setFilters }) => {
  // Local Fallback State (if filters/setFilters are not passed - e.g. used in Singers page)
  const [localFilters, setLocalFilters] = useState<SongFilterState>({
      searchTerm: '',
      langFilter: 'All',
      wordCountFilter: 0,
      sortBy: 'length',
      showFavOnly: false,
      currentPage: 1
  });

  const activeFilters = filters || localFilters;
  
  // Custom setter to handle both prop-based and local-based updates
  const updateFilters = (update: Partial<SongFilterState> | ((prev: SongFilterState) => SongFilterState)) => {
      if (setFilters) {
          setFilters(prev => {
              const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
              return next;
          });
      } else {
          setLocalFilters(prev => {
              const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
              return next;
          });
      }
  };

  // Search State - Debounced Query (Internal)
  const [debouncedQuery, setDebouncedQuery] = useState(activeFilters.searchTerm);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();
  // Request Modal State
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  // Stats State for Modal
  const [songStats, setSongStats] = useState({ globalCount: 0, myCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // --- Debounce Logic ---
  useEffect(() => {
    // If props updated externally (e.g. from Ranking page), update local debounce immediately
    if (activeFilters.searchTerm !== debouncedQuery && !isSearching) {
        setDebouncedQuery(activeFilters.searchTerm);
    }
  }, [activeFilters.searchTerm]);

  useEffect(() => {
    // Internal debounce logic triggered by input change
    if (activeFilters.searchTerm === debouncedQuery) return;
    
    setIsSearching(true);
    const timer = setTimeout(() => {
        setDebouncedQuery(activeFilters.searchTerm);
        setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [activeFilters.searchTerm, debouncedQuery]);

  const filteredSongs = useMemo(() => {
    // Basic Filter: Hide deleted songs for normal users
    let result = songs.filter(s => !s.isDeleted);

    // 1. Favorites Filter
    if (variant !== 'favorites' && activeFilters.showFavOnly && user) {
      result = result.filter(s => user.favorites.includes(s.id));
    }

    // 2. Search Query (Improved with SC/TC conversion)
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase().trim();
      const qTrad = toTraditional(q);

      result = result.filter(s => {
        const titleLower = s.title.toLowerCase();
        const artistLower = s.artist.toLowerCase();
        
        return (
            titleLower.includes(q) || titleLower.includes(qTrad) ||
            artistLower.includes(q) || artistLower.includes(qTrad) ||
            s.id.includes(q)
        );
      });
    }

    // 3. Language Filter
    if (activeFilters.langFilter !== 'All') {
        result = result.filter(s => s.language === activeFilters.langFilter);
    }

    // 4. Word Count Filter
    if (activeFilters.wordCountFilter > 0) {
        if (activeFilters.wordCountFilter === 11) {
            result = result.filter(s => s.title.length >= 11);
        } else {
            result = result.filter(s => s.title.length === activeFilters.wordCountFilter);
        }
    }

    // 5. Sorting
    result = [...result].sort((a, b) => {
        if (activeFilters.sortBy === 'length') {
            const lenDiff = a.title.length - b.title.length;
            if (lenDiff !== 0) return lenDiff;
            return a.id.localeCompare(b.id);
        } else if (activeFilters.sortBy === 'artist') {
            return a.artist.localeCompare(b.artist, 'zh-TW');
        } else {
            return a.id.localeCompare(b.id);
        }
    });

    return result;
  }, [songs, debouncedQuery, activeFilters.showFavOnly, user, activeFilters.langFilter, activeFilters.wordCountFilter, activeFilters.sortBy, variant]);

  // --- Suggestions Logic ---
  useEffect(() => {
      if (debouncedQuery.length >= 2 && filteredSongs.length === 0) {
          const q = debouncedQuery.toLowerCase().trim();
          const qTrad = toTraditional(q);
          const target = qTrad;

          const uniqueArtists = Array.from(new Set(songs.map(s => s.artist)));
          
          const artistMatches = uniqueArtists.map(artist => {
              const dist = levenshtein(target, artist.toLowerCase());
              return { text: artist, dist, type: '歌手' };
          }).filter(item => item.dist <= 2);

          const sortedSuggestions = artistMatches
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5)
            .map(item => item.text);

          setSuggestions(sortedSuggestions);
      } else {
          setSuggestions([]);
      }
  }, [debouncedQuery, filteredSongs.length, songs]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = filteredSongs.slice(
      (activeFilters.currentPage - 1) * ITEMS_PER_PAGE, 
      activeFilters.currentPage * ITEMS_PER_PAGE
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
    };

    try {
        await addRequest(newRequest);
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

  const handleApplySuggestion = (suggestion: string) => {
      updateFilters(prev => ({ ...prev, searchTerm: suggestion, currentPage: 1 }));
  };

  const handleClearFilters = () => {
      updateFilters({
          searchTerm: '',
          langFilter: 'All',
          wordCountFilter: 0,
          sortBy: 'length',
          showFavOnly: false,
          currentPage: 1
      });
      setSuggestions([]);
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

        {/* Search & Sort Bar */}
        <div className="flex flex-col md:flex-row gap-2 w-full">
            {/* Search Input */}
            <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </div>
                <input 
                    type="text" 
                    placeholder="輸入歌名、歌手或編號搜尋 (支援繁簡搜尋)..." 
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all"
                    value={activeFilters.searchTerm}
                    onChange={(e) => updateFilters(prev => ({ ...prev, searchTerm: e.target.value, currentPage: 1 }))}
                />
                {activeFilters.searchTerm && (
                    <button 
                        onClick={() => {
                            updateFilters(prev => ({ ...prev, searchTerm: '', currentPage: 1 }));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2 h-[42px]">
                 <ArrowUpDown size={16} className="text-gray-400 ml-1" />
                 <select 
                    value={activeFilters.sortBy} 
                    onChange={(e) => updateFilters(prev => ({ ...prev, sortBy: e.target.value as SortMode, currentPage: 1 }))}
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
                    onClick={() => updateFilters(prev => ({ ...prev, showFavOnly: !prev.showFavOnly, currentPage: 1 }))}
                    className={`px-4 rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap h-[42px] ${activeFilters.showFavOnly ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                    <Heart size={18} fill={activeFilters.showFavOnly ? 'currentColor' : 'none'} />
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
                        onClick={() => updateFilters(prev => ({ ...prev, langFilter: lang.value, currentPage: 1 }))}
                        className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
                            activeFilters.langFilter === lang.value 
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
                        onClick={() => updateFilters(prev => ({ ...prev, wordCountFilter: wc.value, currentPage: 1 }))}
                        className={`px-3 py-1 rounded-full text-sm transition-colors whitespace-nowrap ${
                            activeFilters.wordCountFilter === wc.value 
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
                
                {suggestions.length > 0 && (
                    <div className="mt-6 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                         <div className="flex items-center gap-2 text-ktv-500 font-medium">
                            <Sparkles size={16} />
                            您是不是想搜尋：
                         </div>
                         <div className="flex gap-2 flex-wrap justify-center">
                             {suggestions.map((sug, i) => (
                                 <button 
                                    key={i}
                                    onClick={() => handleApplySuggestion(sug)}
                                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-ktv-200 dark:border-slate-700 rounded-full text-sm hover:border-ktv-500 text-gray-700 dark:text-gray-300 hover:text-ktv-600 dark:hover:text-ktv-400 transition-colors"
                                 >
                                     {sug}
                                 </button>
                             ))}
                         </div>
                    </div>
                )}

                {(activeFilters.langFilter !== 'All' || activeFilters.wordCountFilter > 0 || debouncedQuery) && (
                     <button 
                        onClick={handleClearFilters}
                        className="mt-6 text-ktv-500 text-sm hover:underline"
                    >
                        清除所有篩選條件
                    </button>
                )}
            </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredSongs.length > ITEMS_PER_PAGE && (
          <div className="flex justify-center items-center gap-4 mt-8 pb-4">
              <button 
                onClick={() => updateFilters(prev => ({ ...prev, currentPage: Math.max(1, prev.currentPage - 1) }))}
                disabled={activeFilters.currentPage === 1}
                className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
              >
                  <ChevronLeft size={20} />
              </button>
              
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  第 <span className="text-ktv-500 font-bold">{activeFilters.currentPage}</span> / {totalPages} 頁
              </span>

              <button 
                onClick={() => updateFilters(prev => ({ ...prev, currentPage: Math.min(totalPages, prev.currentPage + 1) }))}
                disabled={activeFilters.currentPage === totalPages}
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
