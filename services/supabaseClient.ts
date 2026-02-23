import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://skdwdzjbawrzwrjiygfj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_E0mPKNH_N8abezLqkrIVSQ_bFcsfBCq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);