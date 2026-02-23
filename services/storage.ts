
import { supabase } from './supabaseClient';
import { Song, User, SongRequest, Role, Feedback } from '../types';

// --- Mappers ---

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  email: u.email,
  passwordHash: u.password_hash,
  role: u.role as Role,
  name: u.name,
  building: u.building,
  floor: u.floor,
  door: u.door,
  // Map 'is_active' from DB to 'isVerified' AND 'isSuspended' (inverse)
  // Since we don't have is_suspended column, we treat !is_active as suspended.
  isVerified: true, // Verification not fully implemented, default to true
  isSuspended: !u.is_active, 
  loginCount: u.login_count,
  lastLogin: u.last_login,
  favorites: u.favorites || [],
  themePreference: u.theme_preference || 'dark' // Default to dark
});

const mapUserToDB = (u: User) => ({
  id: u.id,
  email: u.email,
  password_hash: u.passwordHash,
  role: u.role,
  name: u.name,
  building: u.building,
  floor: u.floor,
  door: u.door,
  // We map isSuspended to is_active (false means suspended/inactive)
  // This fixes the "column is_suspended not found" error while keeping the feature working
  is_active: !u.isSuspended,
  login_count: u.loginCount,
  last_login: u.lastLogin,
  favorites: u.favorites,
  theme_preference: u.themePreference
});

const mapSongFromDB = (s: any): Song => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    language: s.language,
    tags: s.tags,
    addedAt: s.added_at,
    isDeleted: s.is_deleted || false
});

const mapSongToDB = (s: Song) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    language: s.language,
    tags: s.tags,
    added_at: s.addedAt,
    is_deleted: s.isDeleted || false
});

const mapRequestFromDB = (r: any): SongRequest => ({
    id: r.id,
    songId: r.song_id,
    userId: r.user_id,
    requestedAt: r.requested_at,
    status: r.status,
    keyShift: r.key_shift
});

const mapRequestToDB = (r: SongRequest) => ({
    id: r.id,
    song_id: r.songId,
    user_id: r.userId,
    requested_at: r.requestedAt,
    status: r.status,
    key_shift: r.keyShift
});

const mapFeedbackFromDB = (f: any): Feedback => ({
    id: f.id,
    userId: f.user_id,
    name: f.name,
    email: f.email,
    phone: f.phone,
    type: f.type,
    content: f.content,
    createdAt: f.created_at,
    isRead: f.is_read
});

const mapFeedbackToDB = (f: Feedback) => ({
    // id is usually auto-generated if omitted, but we can pass it if we generate client-side
    // user_id is optional
    user_id: f.userId || null,
    name: f.name,
    email: f.email,
    phone: f.phone,
    type: f.type,
    content: f.content,
    created_at: f.createdAt,
    is_read: f.isRead
});

// --- Songs ---

export const fetchSongs = async (): Promise<Song[]> => {
    // FIX: Use iterative fetching to bypass the 1000-row limit of Supabase API
    // This allows us to fetch 50k-60k songs robustly.
    let allSongs: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .range(from, from + limit - 1);

            if (error) {
                console.error('Error fetching songs chunk:', error);
                // If we get an error, break loop but return what we have
                break;
            }

            if (data && data.length > 0) {
                allSongs = allSongs.concat(data);
                if (data.length < limit) {
                    hasMore = false; // Reached the end
                } else {
                    from += limit;
                }
            } else {
                hasMore = false;
            }
        }
    } catch (err) {
        console.error('Failed to fetch all songs:', err);
        return [];
    }

    return allSongs.map(mapSongFromDB);
};

export const saveSong = async (song: Song) => {
    const { error } = await supabase.from('songs').upsert(mapSongToDB(song));
    if (error) console.error('Error saving song:', error);
};

export const saveSongsBulk = async (songs: Song[]) => {
    // Batch upsert for efficient importing
    const { error } = await supabase.from('songs').upsert(songs.map(mapSongToDB));
    if (error) {
        console.error('Error saving songs bulk:', error);
        throw error;
    }
};

export const deleteSong = async (id: string) => {
    // Soft Delete: Just update the flag
    const { error } = await supabase.from('songs').update({ is_deleted: true }).eq('id', id);
    if (error) {
        console.error('Error soft deleting song:', error);
        throw error;
    }
};

export const restoreSong = async (id: string) => {
    // Restore: Set flag back to false
    const { error } = await supabase.from('songs').update({ is_deleted: false }).eq('id', id);
    if (error) {
        console.error('Error restoring song:', error);
        throw error;
    }
};


// --- Users ---

export const fetchUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data.map(mapUserFromDB);
};

export const saveUser = async (user: User) => {
    // Upsert will update if ID exists, insert if not.
    // This handles both "Create" and "Update" (Full Edit) scenarios.
    const { error } = await supabase.from('users').upsert(mapUserToDB(user));
    if (error) {
        console.error('Error saving user:', error);
        // Throw the actual error message so the UI knows what went wrong (e.g., UUID format, RLS policy)
        throw new Error(error.message || 'Save user failed');
    }
};

export const deleteUser = async (id: string) => {
  // 1. Delete related requests first to prevent Foreign Key constraint errors
  // (Simulating ON DELETE CASCADE behavior manually for safety)
  const { error: reqError } = await supabase.from('requests').delete().eq('user_id', id);
  if (reqError) console.error('Error deleting user requests:', reqError);

  // 2. Delete the user record
  // Note: 'favorites' column is part of the user record, so it is deleted automatically.
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
      console.error('Error deleting user:', error);
      return false;
  }
  
  return true;
};

// Deduplication Logic
export const fixDuplicateUsers = async () => {
    // Fetch all users
    const { data: users, error } = await supabase.from('users').select('*');
    if (error || !users) return;

    // Group by email
    const emailMap = new Map<string, any[]>();
    users.forEach(u => {
        const email = u.email ? u.email.toLowerCase() : '';
        if (email) {
            if (!emailMap.has(email)) emailMap.set(email, []);
            emailMap.get(email)!.push(u);
        }
    });

    // Find duplicates and clean up
    for (const [email, userList] of emailMap.entries()) {
        if (userList.length > 1) {
            console.log(`Found duplicates for ${email}:`, userList);
            
            // Priority: ADMIN > Most active/recent
            // 1. Find Admin
            let winner = userList.find(u => u.role === 'ADMIN');
            
            // 2. If no admin, find latest login
            if (!winner) {
                winner = userList.sort((a, b) => {
                    const timeA = a.last_login ? new Date(a.last_login).getTime() : 0;
                    const timeB = b.last_login ? new Date(b.last_login).getTime() : 0;
                    return timeB - timeA; // Descending
                })[0];
            }

            // Delete others
            const losers = userList.filter(u => u.id !== winner.id);
            for (const loser of losers) {
                console.log(`Auto-deleting duplicate user: ${loser.id} (${loser.role})`);
                await deleteUser(loser.id);
            }
        }
    }
};

export const deleteLegacyUsers = async () => {
    // Alias for fixDuplicateUsers to satisfy external calls
    await fixDuplicateUsers();
};

export const toggleFavorite = async (userId: string, songId: string) => {
    const { data, error } = await supabase.from('users').select('favorites').eq('id', userId).single();
    if (error || !data) return;

    let favorites = data.favorites || [];
    if (favorites.includes(songId)) {
        favorites = favorites.filter((id: string) => id !== songId);
    } else {
        favorites.push(songId);
    }

    await supabase.from('users').update({ favorites }).eq('id', userId);
};

// --- Requests ---

export const fetchRequests = async (): Promise<SongRequest[]> => {
    const { data, error } = await supabase.from('requests').select('*');
    if (error) {
        console.error('Error fetching requests:', error);
        return [];
    }
    return data.map(mapRequestFromDB);
};

export const addRequest = async (req: SongRequest) => {
    const { error } = await supabase.from('requests').insert(mapRequestToDB(req));
    if (error) console.error('Error adding request:', error);
};

export const updateRequestStatus = async (id: string, status: 'queued' | 'played' | 'cancelled') => {
    const { error } = await supabase.from('requests').update({ status }).eq('id', id);
    if (error) console.error('Error updating request status:', error);
};

// --- Feedbacks ---

export const fetchFeedbacks = async (): Promise<Feedback[]> => {
    const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching feedbacks:', error);
        return [];
    }
    return data.map(mapFeedbackFromDB);
};

export const addFeedback = async (feedback: Omit<Feedback, 'id'>) => {
    // We assume ID is generated by DB or we can generate it if needed, but Omit 'id' is safer for insert
    const { error } = await supabase.from('feedbacks').insert(mapFeedbackToDB(feedback as Feedback));
    if (error) {
        console.error('Error adding feedback:', error);
        throw error;
    }
};

export const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (error) {
        console.error('Error deleting feedback:', error);
        throw error;
    }
};

// --- Utilities ---

export const hashPassword = async (password: string) => {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const seedAdmin = async () => {
    const adminEmail = 'ahwayhsieh@gmail.com'; 
    const adminPass = await hashPassword('admin123');

    // 1. Check if ANY user with this email exists (avoid duplicates)
    const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('email', adminEmail)
        .maybeSingle();

    if (existing) {
        // If user exists, ensure they are admin
        if (existing.role !== Role.ADMIN) {
             console.log("Promoting existing user to ADMIN");
             await supabase.from('users').update({ role: Role.ADMIN }).eq('id', existing.id);
        }
    } else {
        // Only insert if absolutely no user with this email exists
        const adminId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : 'admin-' + Date.now();
            
        const admin: User = {
            id: adminId, 
            email: adminEmail,
            passwordHash: adminPass,
            role: Role.ADMIN,
            name: '系統管理員',
            building: 'A',
            floor: '1',
            door: '1',
            isVerified: true,
            isSuspended: false,
            loginCount: 0,
            lastLogin: new Date().toISOString(),
            favorites: [],
            themePreference: 'dark'
        };
        
        try {
            await saveUser(admin);
            console.log("Seeded default admin user");
        } catch (e) {
            console.warn("Admin seed failed:", e);
        }
    }
};

export const subscribeToTable = (table: string, callback: () => void) => {
    const channel = supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
            callback();
        })
        .subscribe();
    
    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
};

export const exportToCSV = (filename: string, data: any[]) => {
    if (!data || !data.length) return;
    const separator = ',';
    const keys = Object.keys(data[0]);
    
    const csvContent =
        keys.join(separator) +
        '\n' +
        data.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                if (typeof cell === 'object') cell = JSON.stringify(cell).replace(/"/g, '""');
                else cell = cell.toString().replace(/"/g, '""');
                
                if (cell.search(/("|,|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    // Add Byte Order Mark (BOM) for UTF-8 to prevent Excel from displaying garbage characters
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
