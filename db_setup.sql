
-- 請在 Supabase 的 SQL Editor 中執行此腳本以修復權限與快取問題

-- 1. 強制重新載入 Schema Cache
NOTIFY pgrst, 'reload schema';

-- 2. 確保資料表結構正確
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';

-- 3. 確保 Tables 存在
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.requests (
    id TEXT PRIMARY KEY,
    song_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL, -- 'queued', 'played', 'cancelled'
    key_shift INTEGER DEFAULT 0
);

-- 4. 設定 Requests 表格權限 (修復點歌列表無法顯示的問題)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.requests;
CREATE POLICY "Enable all access for everyone" ON public.requests FOR ALL USING (true) WITH CHECK (true);

-- 5. 設定 Songs 表格權限
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.songs;
CREATE POLICY "Enable all access for everyone" ON public.songs FOR ALL USING (true) WITH CHECK (true);

-- 6. 設定 Feedbacks 表格權限
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.feedbacks;
CREATE POLICY "Enable all access for everyone" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);

-- 7. 設定 Users 表格權限
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.users;
CREATE POLICY "Enable all access for everyone" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 8. 確保權限 (Grant permissions)
GRANT ALL ON TABLE public.songs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.feedbacks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.requests TO anon, authenticated, service_role;

-- 9. 最後再次通知重新載入
NOTIFY pgrst, 'reload schema';
