
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Song, User, SongRequest, Role, Feedback } from '../types';
import { Camera, Save, Trash2, Edit2, Upload, Loader2, Plus, Download, ListMusic, FileUp, Music, Users, Zap, Search, UserPlus, CalendarDays, Activity, CheckCircle2, XCircle, ShieldAlert, KeyRound, Ban, MailCheck, UserX, LayoutDashboard, UserCheck, MessageSquare, Phone, Mail, AlertTriangle, Lightbulb, ThumbsUp, HelpCircle, ChevronLeft, ChevronRight, RefreshCcw, Layers } from 'lucide-react';
import { saveSong, deleteSong, saveUser, deleteUser, updateRequestStatus, exportToCSV, subscribeToTable, hashPassword, fixDuplicateUsers, fetchFeedbacks, deleteFeedback, restoreSong, saveSongsBulk } from '../services/storage';
import { parseSongListImage } from '../services/geminiService';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface AdminProps {
  songs: Song[];
  requests: SongRequest[];
  users: User[];
  refreshData: () => void;
}

const LANGUAGES = [
    { value: 'All', label: '全部語種' },
    { value: 'Mandarin', label: '國語' },
    { value: 'Taiwanese', label: '台語' },
    { value: 'Hakka', label: '客語' },
    { value: 'English', label: '英語' },
    { value: 'Cantonese', label: '粵語' },
    { value: 'Japanese', label: '日語' },
    { value: 'Korean', label: '韓語' },
    { value: 'Unknown', label: '其他' },
];

const ITEMS_PER_PAGE = 10;
const MAX_BATCH_IMAGES = 100; // Increased to 100 for better bulk performance

export const Admin: React.FC<AdminProps> = ({ songs, requests, users, refreshData }) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'users' | 'queue' | 'feedback'>('songs');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Song>[]>([]);
  const { showToast } = useToast();

  // Search & Filter State
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Async State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Modal & Form State ---
  // Song Modal
  const [isSongModalOpen, setIsSongModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Partial<Song>>({});
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  
  // User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isNewUser, setIsNewUser] = useState(false);
  const [originalUserHash, setOriginalUserHash] = useState('');
  
  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Feedback Delete Modal
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Admin Data (Only Feedback needs fetching now, others passed as props)
  const loadFeedbacks = async () => {
    const f = await fetchFeedbacks();
    setFeedbacks(f);
    setLoading(false);
  };

  useEffect(() => {
    fixDuplicateUsers();
    loadFeedbacks();
    const subFeed = subscribeToTable('feedbacks', loadFeedbacks);
    return () => { 
        subFeed.unsubscribe();
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [songSearchQuery, filterLanguage, activeTab]);

  // --- Stats Calculation ---
  const getStats = () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(new Date().setMonth(now.getMonth() - 1));

      const weeklyActiveUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin) > oneWeekAgo).length;
      const monthlyActiveUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin) > oneMonthAgo).length;
      
      const weeklyRequests = requests.filter(r => new Date(r.requestedAt) > oneWeekAgo).length;
      const monthlyRequests = requests.filter(r => new Date(r.requestedAt) > oneMonthAgo).length;

      return { weeklyActiveUsers, monthlyActiveUsers, weeklyRequests, monthlyRequests };
  };

  const stats = getStats();
  const queueRequests = requests.filter(r => r.status === 'queued').sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()); 

  // Search Logic (Calculated on render for songs)
  const filteredSongs = useMemo(() => {
      let result = songs;
      
      // 1. Language Filter
      if (filterLanguage !== 'All') {
          result = result.filter(s => s.language === filterLanguage);
      }

      // 2. Search Query
      if (songSearchQuery) {
        const q = songSearchQuery.toLowerCase();
        result = result.filter(s => 
            s.title.toLowerCase().includes(q) || 
            s.artist.toLowerCase().includes(q) || 
            s.id.includes(q)
        );
      }
      return result;
  }, [songs, songSearchQuery, filterLanguage]);

  // Pagination Logic
  const totalSongPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = filteredSongs.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  // --- Song Handlers ---

  const processFile = async (file: File): Promise<Partial<Song>[]> => {
      return new Promise<Partial<Song>[]>(async (resolve, reject) => {
          try {
              const base64 = await new Promise<string>((res, rej) => {
                  const reader = new FileReader();
                  reader.onloadend = () => res(reader.result as string);
                  reader.onerror = rej;
                  reader.readAsDataURL(file);
              });
              const result = await parseSongListImage(base64);
              const songsWithDate = result.map(s => ({ ...s, addedAt: new Date().toISOString() }));
              resolve(songsWithDate);
          } catch (e) {
              console.error(`Error processing file ${file.name}:`, e);
              // Resolve empty to keep the batch going
              resolve([]);
          }
      });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > MAX_BATCH_IMAGES) {
        showToast(`單次上傳上限為 ${MAX_BATCH_IMAGES} 張，請分批操作`, 'error');
        return;
    }

    setIsProcessing(true);
    setUploadProgress({ current: 0, total: files.length });
    
    const fileArray = Array.from(files);
    const newPreviewSongs: Partial<Song>[] = [];
    
    // Increased Concurrency for faster processing
    const CONCURRENCY = 5; 
    let processedCount = 0;

    // Chunk the files
    for (let i = 0; i < fileArray.length; i += CONCURRENCY) {
        const chunk = fileArray.slice(i, i + CONCURRENCY);
        
        // Process chunk in parallel
        const chunkResults = await Promise.all(chunk.map(processFile));
        
        // Aggregate results
        chunkResults.forEach(res => newPreviewSongs.push(...res));
        
        processedCount += chunk.length;
        setUploadProgress({ current: Math.min(processedCount, fileArray.length), total: fileArray.length });
    }

    setPreviewData(prev => [...prev, ...newPreviewSongs]);
    setIsProcessing(false);
    setUploadProgress(null);

    if (newPreviewSongs.length > 0) {
        showToast(`AI 辨識完成！成功解析 ${newPreviewSongs.length} 首歌曲`, 'success');
    } else {
        showToast(`辨識失敗，請檢查圖片清晰度`, 'error');
    }
    
    // Clear input
    e.target.value = '';
  };

  const handleSavePreview = async () => {
    // Convert preview data to valid Song objects
    const songsToSave: Song[] = [];
    for (const s of previewData) {
      // Changed: Only require title. If artist is missing, fill with "未知"
      if (s.title) {
          songsToSave.push({
            id: s.id || Math.floor(Math.random() * 1000000).toString(), // Fallback ID
            title: s.title,
            artist: s.artist || '未知', // Default to '未知' if missing
            language: s.language || 'Unknown',
            addedAt: new Date().toISOString(),
            isDeleted: false
          } as Song);
      }
    }
    
    if (songsToSave.length === 0) {
        showToast("沒有有效的歌曲資料可匯入", 'error');
        return;
    }

    setIsProcessing(true);
    showToast(`正在分批匯入 ${songsToSave.length} 首歌曲，請勿關閉視窗...`, 'info');

    // Reduced Batch Size to 100 to prevent timeouts on large payloads
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;
    
    // Using a loop with try/catch inside to allow partial success
    for (let i = 0; i < songsToSave.length; i += BATCH_SIZE) {
        const batch = songsToSave.slice(i, i + BATCH_SIZE);
        try {
            await saveSongsBulk(batch);
            successCount += batch.length;
            
            // Add a small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch(err) {
            console.error(`Batch ${i} failed:`, err);
            errorCount += batch.length;
        }
    }

    setIsProcessing(false);

    if (errorCount === 0) {
        showToast(`匯入成功！共 ${successCount} 首`, 'success');
        setPreviewData([]);
        refreshData();
    } else {
        showToast(`匯入完成：成功 ${successCount} 首，失敗 ${errorCount} 首`, 'warning');
        if (successCount > 0) {
            setPreviewData([]);
            refreshData();
        }
    }
  };

  const handleEditSong = (song?: Song) => {
    if (song) {
      setEditingSong(song);
      setOriginalId(song.id);
    } else {
      setEditingSong({ id: '', title: '', artist: '', language: 'Mandarin' });
      setOriginalId(null);
    }
    setIsSongModalOpen(true);
  };

  const handleSaveSongForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong.title || !editingSong.artist || !editingSong.id) {
        showToast("編號、歌名與歌手為必填", 'error');
        return;
    }
    
    // Check for ID collision
    const collision = songs.find(s => s.id === editingSong.id);
    if (collision) {
        const isOverwrite = originalId === null || (originalId !== null && originalId !== editingSong.id);
        if (isOverwrite) {
            const confirmed = window.confirm(`編號 ${editingSong.id} 已存在，確定覆蓋？`);
            if (!confirmed) return;
        }
    }

    await saveSong({
        id: editingSong.id,
        title: editingSong.title,
        artist: editingSong.artist,
        language: editingSong.language || 'Mandarin',
        addedAt: editingSong.addedAt || new Date().toISOString(),
        isDeleted: editingSong.isDeleted || false
    } as Song);

    showToast(originalId ? "歌曲已更新" : "歌曲已新增", 'success');
    setIsSongModalOpen(false);
    refreshData();
  };

  const initiateDeleteSong = (song: Song) => {
      setSongToDelete(song);
  };

  const handleConfirmDeleteSong = async () => {
    if (!songToDelete) return;
    try {
        await deleteSong(songToDelete.id);
        showToast("歌曲已刪除 (已標記為下架)", 'success');
        setSongToDelete(null);
        refreshData();
    } catch (err: any) {
        console.error(err);
        if (err.message && (err.message.includes("Could not find the 'is_deleted' column") || err.message.includes("schema cache"))) {
             showToast("錯誤：資料庫結構未更新，請執行 db_setup.sql", 'error');
        } else {
             showToast("刪除失敗: " + (err.message || "資料庫權限錯誤"), 'error');
        }
    }
  };

  const handleRestoreSong = async (song: Song) => {
      try {
          await restoreSong(song.id);
          showToast("歌曲已恢復上架", 'success');
          refreshData();
      } catch (err: any) {
          console.error(err);
          showToast("恢復失敗: " + (err.message || "資料庫權限錯誤"), 'error');
      }
  };

  const parseCSVLine = (str: string) => {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      showToast("正在讀取 CSV 檔案...", "info");

      const reader = new FileReader();
      reader.onload = async (evt) => {
          const text = evt.target?.result as string;
          if (!text) {
               setIsProcessing(false);
               return; 
          }
          try {
              const rows = text.split('\n').filter(r => r.trim() !== '');
              if (rows.length < 1) {
                  showToast("檔案內容為空", 'error');
                  setIsProcessing(false);
                  return;
              }
              
              const headers = rows[0].split(','); // Simple header check
              
              const songsToImport: Song[] = [];
              const now = new Date().toISOString();

              // Parse rows
              for (let i = 1; i < rows.length; i++) {
                  const values = parseCSVLine(rows[i]);
                  if (values.length >= 2) {
                      const id = values[0]?.trim();
                      const title = values[1]?.trim();
                      const artist = values[2]?.trim();
                      const language = values[3]?.trim() || 'Unknown';
                      const addedAt = values[5]?.trim() || now;

                      if (id && title) {
                          songsToImport.push({
                              id,
                              title,
                              artist: artist || '未知',
                              language,
                              tags: [], 
                              addedAt,
                              isDeleted: false
                          });
                      }
                  }
              }

              if (songsToImport.length === 0) {
                  showToast("未解析到有效歌曲資料", 'error');
                  setIsProcessing(false);
                  return;
              }

              showToast(`解析完成，準備匯入 ${songsToImport.length} 首歌曲...`, 'info');

              const BATCH_SIZE = 100;
              let successCount = 0;
              let errorCount = 0;
              
              for (let i = 0; i < songsToImport.length; i += BATCH_SIZE) {
                  const batch = songsToImport.slice(i, i + BATCH_SIZE);
                  try {
                      await saveSongsBulk(batch);
                      successCount += batch.length;
                      await new Promise(resolve => setTimeout(resolve, 100));
                  } catch (err) {
                      console.error(`Batch ${i} failed:`, err);
                      errorCount += batch.length;
                  }
              }

              if (errorCount === 0) {
                 showToast(`匯入完成！成功 ${successCount} 首`, 'success');
              } else {
                 showToast(`匯入完成：成功 ${successCount} 首，失敗 ${errorCount} 首`, 'warning');
              }
              
              refreshData();
              // Don't need loadAdminData call since refreshData updates songs and we use props for others

          } catch (err) {
              console.error(err);
              showToast("匯入失敗：CSV 解析或網路錯誤", 'error');
          } finally {
              setIsProcessing(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      };
      
      reader.onerror = () => {
          showToast("讀取檔案失敗", 'error');
          setIsProcessing(false);
      };

      reader.readAsText(file);
  };

  const triggerImport = () => fileInputRef.current?.click();

  // --- User Handlers ---

  const handleOpenUserModal = (user?: User) => {
      if (user) {
          setIsNewUser(false);
          setEditingUser({ ...user, passwordHash: '' }); 
          setOriginalUserHash(user.passwordHash);
      } else {
          setIsNewUser(true);
          setEditingUser({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
              email: '',
              passwordHash: '',
              name: '',
              role: Role.USER,
              building: 'A',
              floor: '',
              door: '',
              isVerified: true,
              isSuspended: false,
              loginCount: 0,
              favorites: [],
              themePreference: 'dark'
          });
          setOriginalUserHash('');
      }
      setIsUserModalOpen(true);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!editingUser.email || !editingUser.name) {
          showToast("Email 與 姓名 為必填", 'error');
          return;
      }

      let finalPasswordHash = originalUserHash;
      
      if (isNewUser) {
          if (!editingUser.passwordHash) {
              showToast("建立新用戶必須設定密碼", 'error');
              return;
          }
          finalPasswordHash = await hashPassword(editingUser.passwordHash);
      } else {
          if (editingUser.passwordHash && editingUser.passwordHash.trim() !== '') {
              finalPasswordHash = await hashPassword(editingUser.passwordHash);
          }
      }

      if (isNewUser && users.find(u => u.email === editingUser.email)) {
          showToast("此 Email 已被註冊", 'error');
          return;
      }

      try {
          await saveUser({
              id: editingUser.id!,
              email: editingUser.email!,
              passwordHash: finalPasswordHash,
              name: editingUser.name!,
              role: editingUser.role || Role.USER,
              building: editingUser.building as any || 'A',
              floor: editingUser.floor || '',
              door: editingUser.door || '',
              isVerified: true, 
              isSuspended: editingUser.isSuspended ?? false,
              loginCount: editingUser.loginCount || 0,
              lastLogin: editingUser.lastLogin || '',
              favorites: editingUser.favorites || [],
              themePreference: editingUser.themePreference || 'dark'
          });

          showToast(isNewUser ? "用戶已新增" : "用戶資料已更新", 'success');
          setIsUserModalOpen(false);
          // refreshData handles fetchSongs, App subscription handles users update
      } catch (err: any) {
          showToast("儲存失敗: " + (err.message || ''), 'error');
      }
  };

  const toggleUserSuspension = async (e: React.MouseEvent, user: User) => {
       e.stopPropagation();
       if (user.role === Role.ADMIN) return showToast("無法停權管理員", 'error');
       
       const newState = !user.isSuspended;
       const updated = { ...user, isSuspended: newState };

       try {
           await saveUser(updated);
           showToast(`用戶已${newState ? '停權 (禁止登入)' : '復權 (解除停權)'}`, newState ? 'error' : 'success');
       } catch (err) {
           console.error("Suspension error:", err);
           showToast("停權操作失敗，請稍後再試", 'error');
       }
  }

  const handleConfirmDeleteUser = async () => {
      if (!userToDelete) return;

      try {
          const success = await deleteUser(userToDelete.id);
          if (success) {
              showToast('用戶及其相關資料已完整刪除', 'success');
          } else {
              throw new Error("Delete operation returned false");
          }
      } catch (error) {
          console.error("Deletion error:", error);
          showToast('刪除失敗，請檢查權限或稍後再試', 'error');
      } finally {
          setUserToDelete(null);
      }
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    try {
        await deleteFeedback(feedbackToDelete);
        showToast('回饋已刪除', 'success');
        setFeedbackToDelete(null);
        loadFeedbacks();
    } catch(err) {
        console.error(err);
        showToast('刪除失敗，請檢查網路或權限', 'error');
    }
  };

  const getFeedbackIcon = (type: string) => {
      switch(type) {
          case 'issue': return <AlertTriangle size={16} className="text-red-500" />;
          case 'suggestion': return <Lightbulb size={16} className="text-yellow-500" />;
          case 'praise': return <ThumbsUp size={16} className="text-green-500" />;
          default: return <HelpCircle size={16} className="text-blue-500" />;
      }
  };
  const getFeedbackLabel = (type: string) => {
      switch(type) {
          case 'issue': return '問題回報';
          case 'suggestion': return '需求建議';
          case 'praise': return '支持點讚';
          default: return '其他';
      }
  };

  const handleBackup = (type: 'songs' | 'users' | 'feedbacks') => {
      if (type === 'songs') {
          exportToCSV('ktv_songs_backup.csv', songs);
      } else if (type === 'users') {
          exportToCSV('ktv_users_backup.csv', users);
      } else {
          exportToCSV('ktv_feedbacks_backup.csv', feedbacks);
      }
      showToast('資料已匯出', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold dark:text-white flex items-center gap-2">
            <LayoutDashboard className="text-ktv-500" /> 後台管理
          </h2>
          <p className="text-gray-500">系統數據概覽與資料管理</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => handleBackup('songs')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <Download size={16} /> 備份歌單
            </button>
            <button onClick={() => handleBackup('users')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <Download size={16} /> 備份用戶
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Users size={12}/> 週活躍用戶</div>
            <div className="text-2xl font-bold dark:text-white">{stats.weeklyActiveUsers}</div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><CalendarDays size={12}/> 月活躍用戶</div>
            <div className="text-2xl font-bold dark:text-white">{stats.monthlyActiveUsers}</div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Music size={12}/> 週點播數</div>
            <div className="text-2xl font-bold text-ktv-500">{stats.weeklyRequests}</div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Activity size={12}/> 月點播數</div>
            <div className="text-2xl font-bold text-orange-500">{stats.monthlyRequests}</div>
         </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-800 flex gap-6 overflow-x-auto">
        <button 
            onClick={() => setActiveTab('songs')} 
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'songs' ? 'border-ktv-500 text-ktv-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
            <Music size={16}/> 歌曲管理 ({songs.length})
        </button>
        <button 
            onClick={() => setActiveTab('users')} 
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-ktv-500 text-ktv-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
            <Users size={16}/> 用戶管理 ({users.length})
        </button>
        <button 
            onClick={() => setActiveTab('queue')} 
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'queue' ? 'border-ktv-500 text-ktv-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
            <ListMusic size={16}/> 排隊管理 ({queueRequests.length})
        </button>
        <button 
            onClick={() => setActiveTab('feedback')} 
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'feedback' ? 'border-ktv-500 text-ktv-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
            <MessageSquare size={16}/> 意見回饋 ({feedbacks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
         {activeTab === 'songs' && (
             <div className="space-y-4">
                 <div className="flex flex-col md:flex-row gap-2 justify-between">
                     <div className="flex gap-2 flex-1 max-w-2xl">
                         <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="搜尋歌名、歌手或編號..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none"
                                value={songSearchQuery}
                                onChange={e => setSongSearchQuery(e.target.value)}
                            />
                         </div>
                         <select 
                            value={filterLanguage}
                            onChange={(e) => setFilterLanguage(e.target.value)}
                            className="w-32 py-2 px-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none text-sm"
                         >
                            {LANGUAGES.map(lang => (
                                <option key={lang.value} value={lang.value}>{lang.label}</option>
                            ))}
                         </select>
                     </div>
                     <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleEditSong()} className="flex items-center gap-1 px-3 py-2 bg-ktv-500 text-white rounded-lg hover:bg-ktv-600 transition-colors text-sm font-bold">
                            <Plus size={16}/> 新增歌曲
                        </button>
                        <button onClick={triggerImport} className={`flex items-center gap-1 px-3 py-2 text-white rounded-lg transition-colors text-sm font-bold ${isProcessing ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`} disabled={isProcessing}>
                             {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <FileUp size={16}/>}
                             CSV 匯入
                        </button>
                        <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleCSVImport} disabled={isProcessing} />
                        
                        <label className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors ${
                            isProcessing ? 'bg-purple-400 cursor-not-allowed text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}>
                            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>}
                            <span>{isProcessing ? `處理中 (${uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : ''})` : 'AI 批量辨識'}</span>
                            <input 
                                type="file" 
                                hidden 
                                accept="image/*" 
                                multiple // Allow multiple files
                                onChange={handleImageUpload} 
                                disabled={isProcessing} 
                            />
                        </label>
                     </div>
                 </div>
                 
                 {previewData.length > 0 && (
                     <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-4 rounded-xl">
                         <h4 className="font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
                             <Zap size={16}/> AI 辨識預覽 ({previewData.length} 首)
                         </h4>
                         <div className="max-h-60 overflow-y-auto bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 mb-3">
                             {previewData.map((s, idx) => (
                                 <div key={idx} className="flex gap-2 p-2 border-b dark:border-slate-800 text-sm">
                                     <span className="w-16 font-mono text-gray-500">{s.id || 'N/A'}</span>
                                     <span className="flex-1 font-bold dark:text-white">{s.title}</span>
                                     <span className="flex-1 text-gray-600 dark:text-gray-400">{s.artist}</span>
                                 </div>
                             ))}
                         </div>
                         <div className="flex gap-2 items-center">
                             <button onClick={handleSavePreview} disabled={isProcessing} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 disabled:opacity-70 flex items-center gap-2">
                                {isProcessing && <Loader2 className="animate-spin" size={14}/>}
                                確認匯入 ({previewData.length} 首)
                             </button>
                             <button onClick={() => setPreviewData([])} disabled={isProcessing} className="px-4 py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300">取消</button>
                             {isProcessing && <span className="text-xs text-gray-500 animate-pulse">正在分批匯入中，請勿關閉...</span>}
                         </div>
                     </div>
                 )}

                 <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
                            <tr>
                                <th className="p-3">編號</th>
                                <th className="p-3">歌名</th>
                                <th className="p-3">歌手</th>
                                <th className="p-3">語種</th>
                                <th className="p-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {paginatedSongs.map(song => (
                                <tr key={song.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${song.isDeleted ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="p-3 font-mono text-ktv-500">{song.id}</td>
                                    <td className="p-3 font-medium dark:text-white flex items-center gap-2">
                                        {song.title}
                                        {song.isDeleted && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">已下架</span>}
                                    </td>
                                    <td className="p-3 text-gray-500 dark:text-gray-400">{song.artist}</td>
                                    <td className="p-3 text-gray-400">
                                        {LANGUAGES.find(l => l.value === song.language)?.label || song.language}
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        <button onClick={() => handleEditSong(song)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit2 size={16}/></button>
                                        {song.isDeleted ? (
                                            <button onClick={() => handleRestoreSong(song)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="恢復上架"><RefreshCcw size={16}/></button>
                                        ) : (
                                            <button onClick={() => initiateDeleteSong(song)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="下架刪除"><Trash2 size={16}/></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                     {filteredSongs.length === 0 && (
                         <div className="p-8 text-center text-gray-400">
                             沒有找到符合條件的歌曲
                         </div>
                     )}
                 </div>

                 {/* Pagination Controls */}
                 {totalSongPages > 1 && (
                      <div className="flex justify-center items-center gap-4 pt-2">
                          <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
                          >
                              <ChevronLeft size={20} />
                          </button>
                          
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              第 <span className="text-ktv-500 font-bold">{currentPage}</span> / {totalSongPages} 頁
                          </span>

                          <button 
                            onClick={() => setCurrentPage(p => Math.min(totalSongPages, p + 1))}
                            disabled={currentPage === totalSongPages}
                            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
                          >
                              <ChevronRight size={20} />
                          </button>
                      </div>
                  )}
             </div>
         )}

         {activeTab === 'users' && (
             <div className="space-y-4">
                 <div className="flex justify-end">
                     <button onClick={() => handleOpenUserModal()} className="flex items-center gap-1 px-3 py-2 bg-ktv-500 text-white rounded-lg hover:bg-ktv-600 transition-colors text-sm font-bold">
                         <UserPlus size={16}/> 新增用戶
                     </button>
                 </div>
                 <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
                            <tr>
                                <th className="p-3">姓名</th>
                                <th className="p-3">住戶資訊</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">身份</th>
                                <th className="p-3">狀態</th>
                                <th className="p-3">登入次數</th>
                                <th className="p-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 font-bold dark:text-white flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                                            {u.name[0]}
                                        </div>
                                        {u.name}
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-gray-400">{u.building}棟 {u.floor}F-{u.door}</td>
                                    <td className="p-3 text-gray-500">{u.email}</td>
                                    <td className="p-3">
                                        {u.role === 'ADMIN' 
                                            ? <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-xs font-bold">管理員</span>
                                            : <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded text-xs">一般住戶</span>
                                        }
                                    </td>
                                    <td className="p-3">
                                        {u.isSuspended 
                                            ? <span className="text-red-500 flex items-center gap-1 text-xs font-bold"><Ban size={12}/> 停權中</span>
                                            : <span className="text-green-500 flex items-center gap-1 text-xs"><CheckCircle2 size={12}/> 正常</span>
                                        }
                                    </td>
                                    <td className="p-3 text-gray-400">{u.loginCount}</td>
                                    <td className="p-3 text-right space-x-1">
                                        {u.role !== 'ADMIN' && (
                                            <>
                                                <button onClick={(e) => toggleUserSuspension(e, u)} className={`p-1.5 rounded ${u.isSuspended ? 'text-green-500 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`} title={u.isSuspended ? "解除停權" : "停權用戶"}>
                                                    {u.isSuspended ? <UserCheck size={16}/> : <Ban size={16}/>}
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (u.role === Role.ADMIN) {
                                                            showToast("無法刪除系統管理員", 'error');
                                                        } else {
                                                            setUserToDelete(u);
                                                        }
                                                    }} 
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" 
                                                    title="刪除用戶"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleOpenUserModal(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="編輯資料">
                                            <Edit2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                 </div>
             </div>
         )}

         {activeTab === 'queue' && (
             <div className="space-y-4">
                 <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
                            <tr>
                                <th className="p-3">順序</th>
                                <th className="p-3">歌曲</th>
                                <th className="p-3">點歌者</th>
                                <th className="p-3">時間</th>
                                <th className="p-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {queueRequests.map((req, idx) => {
                                const song = songs.find(s => s.id === req.songId);
                                const user = users.find(u => u.id === req.userId);
                                return (
                                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="p-3 font-bold text-ktv-500">{idx + 1}</td>
                                        <td className="p-3">
                                            <div className="font-bold dark:text-white">{song?.title}</div>
                                            <div className="text-xs text-gray-500">{song?.artist}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-gray-900 dark:text-gray-300">{user?.name}</div>
                                            <div className="text-xs text-gray-500">{user?.building}棟 {user?.floor}F</div>
                                        </td>
                                        <td className="p-3 text-gray-400 text-xs">
                                            {new Date(req.requestedAt).toLocaleTimeString()}
                                        </td>
                                        <td className="p-3 text-right">
                                             <button 
                                                onClick={() => updateRequestStatus(req.id, 'cancelled')} 
                                                className="px-3 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs font-bold border border-red-200 dark:border-red-900/50"
                                             >
                                                移除
                                             </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {queueRequests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">目前沒有排隊的歌曲</td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                 </div>
             </div>
         )}

         {activeTab === 'feedback' && (
             <div className="space-y-4">
                 <div className="flex justify-end">
                     <button onClick={() => handleBackup('feedbacks')} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                         <Download size={16} /> 匯出回饋
                     </button>
                 </div>
                 <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500">
                            <tr>
                                <th className="p-3 w-32">時間</th>
                                <th className="p-3 w-32">類型</th>
                                <th className="p-3 w-48">聯絡人</th>
                                <th className="p-3">內容</th>
                                <th className="p-3 text-right w-20">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {feedbacks.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                    <td className="p-3 text-gray-500 text-xs align-top">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-3 align-top">
                                        <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                            {getFeedbackIcon(item.type)} {getFeedbackLabel(item.type)}
                                        </span>
                                    </td>
                                    <td className="p-3 align-top">
                                        <div className="font-bold dark:text-white">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Phone size={10}/> {item.phone}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Mail size={10}/> {item.email}
                                        </div>
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap align-top">
                                        {item.content}
                                    </td>
                                    <td className="p-3 text-right align-top">
                                         <button 
                                            onClick={() => setFeedbackToDelete(item.id)} 
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                            title="刪除"
                                         >
                                            <Trash2 size={16}/>
                                         </button>
                                    </td>
                                </tr>
                            ))}
                            {feedbacks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">目前沒有收到任何回饋</td>
                                </tr>
                            )}
                        </tbody>
                     </table>
                 </div>
             </div>
         )}
      </div>

      {/* Song Modal */}
      <Modal isOpen={isSongModalOpen} onClose={() => setIsSongModalOpen(false)} title={editingSong.id ? '編輯歌曲' : '新增歌曲'}>
          <form onSubmit={handleSaveSongForm} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                      <label className="block text-sm text-gray-500 mb-1">編號</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={editingSong.id || ''}
                        onChange={e => setEditingSong({...editingSong, id: e.target.value})}
                      />
                  </div>
                  <div className="col-span-2">
                       <label className="block text-sm text-gray-500 mb-1">語種</label>
                       <select 
                            className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={editingSong.language || 'Mandarin'}
                            onChange={e => setEditingSong({...editingSong, language: e.target.value})}
                       >
                           {LANGUAGES.filter(l => l.value !== 'All').map(lang => (
                               <option key={lang.value} value={lang.value}>{lang.label}</option>
                           ))}
                       </select>
                  </div>
              </div>
              <div>
                  <label className="block text-sm text-gray-500 mb-1">歌名</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={editingSong.title || ''}
                    onChange={e => setEditingSong({...editingSong, title: e.target.value})}
                  />
              </div>
              <div>
                  <label className="block text-sm text-gray-500 mb-1">歌手</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={editingSong.artist || ''}
                    onChange={e => setEditingSong({...editingSong, artist: e.target.value})}
                  />
              </div>
              <button type="submit" className="w-full py-3 bg-ktv-500 text-white rounded-lg font-bold hover:bg-ktv-600">儲存</button>
          </form>
      </Modal>

      {/* User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={isNewUser ? '新增住戶' : '編輯住戶'}>
          <form onSubmit={handleSaveUserForm} className="space-y-4">
              <div>
                  <label className="block text-sm text-gray-500 mb-1">Email (帳號)</label>
                  <input 
                    required 
                    type="email" 
                    className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white disabled:opacity-50"
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm text-gray-500 mb-1">姓名 / 稱呼</label>
                      <input 
                        required 
                        type="text" 
                        className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={editingUser.name || ''}
                        onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      />
                  </div>
                   <div>
                       <label className="block text-sm text-gray-500 mb-1">角色權限</label>
                       <select 
                            className="w-full p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={editingUser.role || Role.USER}
                            onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})}
                       >
                           <option value={Role.USER}>一般住戶</option>
                           <option value={Role.ADMIN}>系統管理員</option>
                       </select>
                  </div>
              </div>
              <div>
                  <label className="block text-sm text-gray-500 mb-1">密碼 {isNewUser ? '(必填)' : '(留空則不修改)'}</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input 
                        type="password" 
                        className="w-full pl-9 p-2 rounded border dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder={isNewUser ? "設定預設密碼" : "輸入新密碼以重設"}
                        value={editingUser.passwordHash || ''} // We reuse passwordHash field for plain text input in form
                        onChange={e => setEditingUser({...editingUser, passwordHash: e.target.value})}
                    />
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                   <div>
                       <label className="block text-xs text-gray-500 mb-1">棟別</label>
                       <select 
                            className="w-full p-1.5 rounded border dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                            value={editingUser.building || 'A'}
                            onChange={e => setEditingUser({...editingUser, building: e.target.value as any})}
                       >
                           <option value="A">A棟</option>
                           <option value="B">B棟</option>
                       </select>
                  </div>
                  <div>
                      <label className="block text-xs text-gray-500 mb-1">樓層</label>
                      <input 
                        required type="text" 
                        className="w-full p-1.5 rounded border dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                        value={editingUser.floor || ''}
                        onChange={e => setEditingUser({...editingUser, floor: e.target.value})}
                      />
                  </div>
                   <div>
                      <label className="block text-xs text-gray-500 mb-1">門牌</label>
                      <input 
                        required type="text" 
                        className="w-full p-1.5 rounded border dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                        value={editingUser.door || ''}
                        onChange={e => setEditingUser({...editingUser, door: e.target.value})}
                      />
                  </div>
              </div>

              <button type="submit" className="w-full py-3 bg-ktv-500 text-white rounded-lg font-bold hover:bg-ktv-600">
                  {isNewUser ? '建立用戶' : '儲存變更'}
              </button>
          </form>
      </Modal>

      {/* Delete Feedback Confirmation Modal */}
      <Modal isOpen={!!feedbackToDelete} onClose={() => setFeedbackToDelete(null)} title="刪除確認">
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">確定要刪除這則意見回饋嗎？此操作無法復原。</p>
                <div className="flex gap-4">
                    <button onClick={() => setFeedbackToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">取消</button>
                    <button onClick={handleConfirmDeleteFeedback} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 transition-colors">確認刪除</button>
                </div>
            </div>
      </Modal>

      {/* Delete Song Confirmation Modal */}
      <Modal isOpen={!!songToDelete} onClose={() => setSongToDelete(null)} title="刪除歌曲確認">
            <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50 flex gap-3">
                    <AlertTriangle className="text-red-500 shrink-0" size={24} />
                    <div className="text-sm text-red-800 dark:text-red-200">
                        <p className="font-bold text-lg mb-1">確定要下架此歌曲嗎？</p>
                        <p>您即將刪除 <strong>{songToDelete?.title}</strong>。</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1 opacity-90">
                            <li>此歌曲將無法被用戶點播。</li>
                            <li><strong>過去的點歌紀錄將被保留。</strong></li>
                            <li>您隨時可以在後台恢復此歌曲。</li>
                        </ul>
                    </div>
                </div>
                <div className="flex gap-4 pt-2">
                     <button onClick={() => setSongToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        取消
                     </button>
                     <button onClick={handleConfirmDeleteSong} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={18} /> 確認下架
                     </button>
                </div>
            </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="刪除用戶確認">
            <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/50 flex gap-3">
                    <ShieldAlert className="text-red-500 shrink-0" size={24} />
                    <div className="text-sm text-red-800 dark:text-red-200">
                        <p className="font-bold text-lg mb-1">警告：此操作無法復原！</p>
                        <p>您即將刪除用戶 <strong>{userToDelete?.name}</strong>。</p>
                        <ul className="list-disc pl-4 mt-2 space-y-1 opacity-90">
                            <li>該用戶的帳號將永久消失。</li>
                            <li>所有<strong>點歌紀錄</strong>將被清除。</li>
                            <li><strong>收藏清單</strong>將被移除。</li>
                        </ul>
                    </div>
                </div>
                <div className="flex gap-4 pt-2">
                     <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                        取消
                     </button>
                     <button onClick={handleConfirmDeleteUser} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-500/30 transition-colors flex items-center justify-center gap-2">
                        <Trash2 size={18} /> 確認刪除
                     </button>
                </div>
            </div>
      </Modal>
    </div>
  );
};
