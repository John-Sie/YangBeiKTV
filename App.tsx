
import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { User, Song, SongRequest, SongFilterState } from './types';
import { Layout } from './components/Layout';
import { Songs } from './pages/Songs';
import { Admin } from './pages/Admin';
import { Rankings } from './pages/Rankings';
import { Queue } from './pages/Queue';
import { Profile } from './pages/Profile';
import { FeedbackPage } from './pages/Feedback';
import { Singers } from './pages/Singers';
import { fetchSongs, fetchUsers, seedAdmin, deleteLegacyUsers, saveUser, fetchRequests, subscribeToTable } from './services/storage';
import { AuthService } from './services/auth';
import { ToastProvider, useToast } from './components/Toast';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyIdentity: (email: string, building: string, floor: string, door: string) => Promise<{ success: boolean; userId?: string; message: string }>;
  resetPassword: (token: string, newPass: string) => Promise<{ success: boolean; message: string }>;
}
const AuthContext = createContext<AuthContextType>({} as any);
export const useAuth = () => useContext(AuthContext);

// --- Login Page Component ---
type LoginMode = 'login' | 'register' | 'forgot';

interface LoginPageProps {
    onLogin: (email: string, pass: string) => Promise<any>;
    onRegister: (data: Partial<User>) => Promise<any>;
    onVerifyIdentity: (email: string, building: string, floor: string, door: string) => Promise<{ success: boolean; userId?: string; message: string }>;
    onResetPassword: (token: string, newPass: string) => Promise<any>;
    initialMode?: LoginMode;
}

const LoginPage = ({ onLogin, onRegister, onVerifyIdentity, onResetPassword, initialMode = 'login' }: LoginPageProps) => {
    const [mode, setMode] = useState<LoginMode>(initialMode);
    const [isLoading, setIsLoading] = useState(false);
    
    // resetStep: 0 = verify, 1 = set new password
    const [resetStep, setResetStep] = useState(0); 
    const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);

    const [formData, setFormData] = useState({ 
        email: '', 
        password: '', 
        name: '', 
        building: 'A', 
        floor: '', 
        door: '' 
    });
    const { showToast } = useToast();

    useEffect(() => {
        if (initialMode) setMode(initialMode);
    }, [initialMode]);

    // Reset internal state when mode changes
    useEffect(() => {
        setResetStep(0);
        setVerifiedUserId(null);
        setFormData(prev => ({ ...prev, password: '' })); // clear password
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (mode === 'register') {
                const result = await onRegister({
                    ...formData,
                    building: formData.building as 'A' | 'B',
                    passwordHash: formData.password
                });
                if (!result.success) {
                    showToast(result.message, 'error');
                } else {
                    showToast(result.message, 'success');
                    setMode('login');
                }
            } else if (mode === 'login') {
                const result = await onLogin(formData.email, formData.password);
                if (!result.success) {
                    showToast(result.error || '登入失敗', 'error');
                } else {
                    showToast('登入成功', 'success');
                }
            } else if (mode === 'forgot') {
                if (resetStep === 0) {
                    const result = await onVerifyIdentity(formData.email, formData.building, formData.floor, formData.door);
                    if (result.success && result.userId) {
                        setVerifiedUserId(result.userId);
                        setResetStep(1);
                        showToast(result.message, 'success');
                    } else {
                        showToast(result.message, 'error');
                    }
                } else {
                    if (!verifiedUserId) return;
                    if (!formData.password) {
                        showToast("請輸入新密碼", 'error');
                        setIsLoading(false);
                        return;
                    }
                    const result = await onResetPassword(verifiedUserId, formData.password);
                    if (result.success) {
                        showToast(result.message, 'success');
                        setMode('login');
                    } else {
                        showToast(result.message, 'error');
                    }
                }
            }
        } catch (error) {
            showToast('發生錯誤，請稍後再試', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-slate-950">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-slate-800">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-ktv-700 to-ktv-500 bg-clip-text text-transparent mb-2">
                        潤泰央北 KTV
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {mode === 'login' && '歡迎回來，請登入您的帳戶'}
                        {mode === 'register' && '建立新帳戶以開始點歌'}
                        {mode === 'forgot' && '重設密碼'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'forgot' && resetStep === 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-600 dark:text-blue-300 mb-4 flex items-start gap-2">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0"/>
                            <div>為確保帳戶安全，請輸入您的住戶資訊進行身份驗證。</div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email (帳號)"
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-ktv-500 outline-none dark:text-white"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            required
                        />
                        
                        {(mode === 'register' || (mode === 'forgot' && resetStep === 0)) && (
                            <>
                                <input
                                    type="text"
                                    placeholder={mode === 'register' ? "姓名 / 稱呼" : "姓名 (驗證用)"}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-ktv-500 outline-none dark:text-white"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required={mode === 'register'}
                                    style={{ display: mode === 'forgot' ? 'none' : 'block' }}
                                />
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-6 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium min-w-fit">棟別：</span>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="building" 
                                                    value="A" 
                                                    checked={formData.building === 'A'} 
                                                    onChange={e => setFormData({...formData, building: e.target.value})}
                                                    className="w-4 h-4 text-ktv-500 focus:ring-ktv-500 accent-ktv-500"
                                                />
                                                <span className="text-gray-700 dark:text-gray-200">A棟</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    name="building" 
                                                    value="B" 
                                                    checked={formData.building === 'B'} 
                                                    onChange={e => setFormData({...formData, building: e.target.value})}
                                                    className="w-4 h-4 text-ktv-500 focus:ring-ktv-500 accent-ktv-500"
                                                />
                                                <span className="text-gray-700 dark:text-gray-200">B棟</span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="門牌號"
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-ktv-500 outline-none dark:text-white"
                                            value={formData.door}
                                            onChange={e => setFormData({...formData, door: e.target.value})}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="樓層"
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-ktv-500 outline-none dark:text-white"
                                            value={formData.floor}
                                            onChange={e => setFormData({...formData, floor: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {(mode === 'login' || mode === 'register' || (mode === 'forgot' && resetStep === 1)) && (
                            <input
                                type="password"
                                placeholder={mode === 'forgot' ? "請輸入新密碼" : "密碼"}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-ktv-500 outline-none dark:text-white"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-ktv-500 hover:bg-ktv-600 text-white rounded-xl font-bold shadow-lg shadow-ktv-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isLoading && <Loader2 className="animate-spin" size={18} />}
                        {mode === 'login' && '登入'}
                        {mode === 'register' && '註冊'}
                        {mode === 'forgot' && (resetStep === 0 ? '驗證身份' : '重設密碼')}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-3 text-center text-sm">
                    {mode === 'login' ? (
                        <>
                            <button onClick={() => setMode('register')} className="text-gray-500 hover:text-ktv-500 transition-colors">
                                還沒有帳號？立即註冊
                            </button>
                            <button onClick={() => setMode('forgot')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                忘記密碼？
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setMode('login')} className="flex items-center justify-center gap-1 text-gray-500 hover:text-ktv-500 transition-colors">
                            <ArrowLeft size={14} /> 返回登入
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
export const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [currentPage, setCurrentPage] = useState('songs');
  
  // Data State - Centralized
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Persistent State for Songs Page
  const [songFilters, setSongFilters] = useState<SongFilterState>({
      searchTerm: '',
      langFilter: 'All',
      wordCountFilter: 0,
      sortBy: 'length',
      showFavOnly: false,
      currentPage: 1
  });

  // Initialize Data
  useEffect(() => {
    const initData = async () => {
        try {
            await seedAdmin();
            // await deleteLegacyUsers(); // Cleanup if needed
            
            // Load everything in parallel
            const [fetchedSongs, fetchedUsers, fetchedRequests] = await Promise.all([
                fetchSongs(),
                fetchUsers(),
                fetchRequests()
            ]);
            
            setSongs(fetchedSongs);
            setUsers(fetchedUsers);
            setRequests(fetchedRequests);
        } catch (error) {
            console.error("Initialization error:", error);
        } finally {
            setIsInitialLoading(false);
        }
    };

    initData();

    // Setup Subscriptions for Real-time Updates
    const subRequests = subscribeToTable('requests', async () => {
        const r = await fetchRequests();
        setRequests(r);
    });

    const subUsers = subscribeToTable('users', async () => {
        const u = await fetchUsers();
        setUsers(u);
    });

    // Optionally subscribe to songs if multiple admins editing
    const subSongs = subscribeToTable('songs', async () => {
        const s = await fetchSongs();
        setSongs(s);
    });

    return () => {
        subRequests.unsubscribe();
        subUsers.unsubscribe();
        subSongs.unsubscribe();
    };
  }, []);

  // Sync user object when users list updates
  useEffect(() => {
      if (user) {
          const updatedUser = users.find(u => u.id === user.id);
          if (updatedUser) {
              if (JSON.stringify(updatedUser.favorites) !== JSON.stringify(user.favorites) || 
                  updatedUser.role !== user.role ||
                  updatedUser.isSuspended !== user.isSuspended) {
                  setUser(updatedUser);
              }
          }
      }
  }, [users, user]);

  // Auth Handlers
  const login = async (email: string, pass: string) => {
    const res = await AuthService.login(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      setDarkMode(res.user.themePreference === 'dark');
      setCurrentPage('songs'); // Redirect to home on successful login
    }
    return res;
  };

  const register = async (data: Partial<User>) => AuthService.register(data);
  
  const logout = () => {
    setUser(null);
    setCurrentPage('songs');
  };

  const verifyIdentity = AuthService.verifyIdentity;
  const resetPassword = AuthService.resetPassword;

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    if (user) {
        saveUser({ ...user, themePreference: !darkMode ? 'dark' : 'light' });
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const refreshUserData = async () => {
      const u = await fetchUsers();
      setUsers(u);
  };

  const refreshAllData = async () => {
      const [s, u, r] = await Promise.all([fetchSongs(), fetchUsers(), fetchRequests()]);
      setSongs(s);
      setUsers(u);
      setRequests(r);
  };

  // Optimistic Update Handlers
  const handleAddRequest = (req: SongRequest) => {
      setRequests(prev => [...prev, req]);
  };

  const handleUpdateRequestStatus = (reqId: string, status: 'played' | 'cancelled') => {
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status } : r));
  };

  // --- Derived State for Layout (Now Playing) ---
  const currentStatus = useMemo(() => {
      // Find the first 'queued' song, sorted by time
      const activeQueue = requests
          .filter(r => r.status === 'queued')
          .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
      
      const currentReq = activeQueue[0];
      const nextReq = activeQueue[1];

      return {
          currentSong: currentReq ? songs.find(s => s.id === currentReq.songId) : undefined,
          currentUser: currentReq ? users.find(u => u.id === currentReq.userId) : undefined,
          queueCount: activeQueue.length,
          nextSong: nextReq ? songs.find(s => s.id === nextReq.songId) : undefined
      };
  }, [requests, songs, users]);

  if (isInitialLoading) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-ktv-500/30 border-t-ktv-500 rounded-full animate-spin"></div>
                  <p className="font-medium animate-pulse">系統啟動中...</p>
              </div>
          </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, verifyIdentity, resetPassword }}>
      <ToastProvider>
        {currentPage === 'login' ? (
            <LoginPage 
                onLogin={login} 
                onRegister={register} 
                onVerifyIdentity={verifyIdentity}
                onResetPassword={resetPassword}
            />
        ) : (
            <Layout 
                darkMode={darkMode} 
                toggleTheme={toggleTheme} 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage}
                queueCount={currentStatus.queueCount}
                currentSong={currentStatus.currentSong}
                currentUser={currentStatus.currentUser}
            >
                {currentPage === 'songs' && (
                    <Songs 
                        songs={songs} 
                        user={user} 
                        refreshUserData={refreshUserData} 
                        onRequest={() => {}} 
                        onAddRequest={handleAddRequest}
                        // Pass persistent state and setter
                        filters={songFilters}
                        setFilters={setSongFilters}
                    />
                )}
                {currentPage === 'singers' && (
                    <Singers 
                        songs={songs} 
                        user={user} 
                        refreshUserData={refreshUserData} 
                        onRequest={() => {}} 
                        onAddRequest={handleAddRequest}
                    />
                )}
                {currentPage === 'queue' && (
                    <Queue 
                        requests={requests} 
                        songs={songs} 
                        users={users} 
                        user={user} 
                        refreshUserData={refreshUserData}
                        onUpdateStatus={handleUpdateRequestStatus}
                    />
                )}
                {currentPage === 'rankings' && (
                    <Rankings 
                        songs={songs} 
                        requests={requests} 
                        users={users}
                        user={user} 
                        onRequest={() => {}} 
                        onAddRequest={handleAddRequest}
                        onSearchSinger={(term) => {
                            // Update filter state and navigate
                            setSongFilters({
                                searchTerm: term,
                                langFilter: 'All',
                                wordCountFilter: 0,
                                sortBy: 'length',
                                showFavOnly: false,
                                currentPage: 1
                            });
                            setCurrentPage('songs');
                        }}
                    />
                )}
                {currentPage === 'profile' && (
                    <Profile 
                        user={user} 
                        songs={songs} 
                        requests={requests}
                        refreshData={refreshAllData} 
                        onNavigate={setCurrentPage}
                    />
                )}
                {currentPage === 'admin' && user?.role === 'ADMIN' && (
                    <Admin 
                        songs={songs} 
                        requests={requests}
                        users={users}
                        refreshData={refreshAllData} 
                    />
                )}
                {currentPage === 'feedback' && (
                    <FeedbackPage user={user} />
                )}
            </Layout>
        )}
      </ToastProvider>
    </AuthContext.Provider>
  );
};
