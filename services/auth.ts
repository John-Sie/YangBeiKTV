import { User, Role } from '../types';
import { fetchUsers, saveUser, hashPassword } from './storage';
import { sendEmail } from './email';
import { supabase } from './supabaseClient';

export const AuthService = {
    login: async (email: string, pass: string): Promise<{ success: boolean, user?: User, error?: string }> => {
        // Direct query is more robust and secure
        const { data: userRecord, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !userRecord) {
            return { success: false, error: '帳號或密碼錯誤' };
        }

        // Hash the input password to compare with stored hash
        const inputHash = await hashPassword(pass);
        
        if (userRecord.password_hash !== inputHash) {
            return { success: false, error: '帳號或密碼錯誤' };
        }
        
        // 1. Check Suspension (Mapped to is_active being false)
        if (userRecord.is_active === false || userRecord.is_suspended) {
             return { success: false, error: '您的帳號已被停權，請聯繫管理員' };
        }

        // Map DB record to User type
        const found: User = {
            id: userRecord.id,
            email: userRecord.email,
            passwordHash: userRecord.password_hash,
            role: userRecord.role as Role,
            name: userRecord.name,
            building: userRecord.building as any,
            floor: userRecord.floor,
            door: userRecord.door,
            // Map status
            isVerified: true, // Always true now
            isSuspended: !userRecord.is_active, // Check inactive status for suspension
            
            loginCount: userRecord.login_count,
            lastLogin: userRecord.last_login,
            favorites: userRecord.favorites || [],
            themePreference: userRecord.theme_preference || 'dark'
        };

        // Update stats (Non-blocking)
        try {
            found.loginCount += 1;
            found.lastLogin = new Date().toISOString();
            await saveUser(found);
        } catch (err) {
            console.warn("Failed to update login stats in DB, but proceeding with login.", err);
        }

        return { success: true, user: found };
    },

    register: async (data: Partial<User>): Promise<{ success: boolean, message: string }> => {
        // Check for duplicate email
        const { data: existing, error } = await supabase
            .from('users')
            .select('email')
            .eq('email', data.email)
            .single();

        if (existing) {
            return { success: false, message: '此 Email 已被註冊' };
        }

        // Use crypto.randomUUID() for cleaner UUIDs if DB requires uuid type.
        // Fallback to random string if crypto not available (older browsers/http)
        const userId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Hash the password before saving
        const hashedPassword = await hashPassword(data.passwordHash || '');

        const newUser: User = {
            id: userId,
            email: data.email || '',
            passwordHash: hashedPassword,
            name: data.name || '住戶',
            role: Role.USER,
            building: data.building as any || 'A',
            floor: data.floor || '',
            door: data.door || '',
            
            // Initial Status - Auto Verified
            isVerified: true, 
            isSuspended: false, 
            
            loginCount: 0,
            lastLogin: '',
            favorites: [],
            themePreference: 'dark' // Default for new users
        };
        
        try {
            await saveUser(newUser);
        } catch (err: any) {
            console.error("Registration failed:", err);
            return { success: false, message: '註冊失敗: ' + (err.message || '資料庫儲存錯誤') };
        }

        return { success: true, message: '註冊成功！請直接登入' };
    },

    verifyIdentity: async (email: string, building: string, floor: string, door: string): Promise<{ success: boolean, userId?: string, message: string }> => {
        const { data: userRecord } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!userRecord) {
            return { success: false, message: '此 Email 尚未註冊' };
        }

        // Strict comparison of building info
        // Using String() to ensure safety against number/string mismatches
        if (
            String(userRecord.building) !== String(building) ||
            String(userRecord.floor) !== String(floor) ||
            String(userRecord.door) !== String(door)
        ) {
             return { success: false, message: '身份驗證失敗：住戶資料不符' };
        }

        return { success: true, userId: userRecord.id, message: '身份驗證成功' };
    },

    requestPasswordReset: async (email: string): Promise<{ success: boolean, message: string }> => {
        // Legacy method kept for interface compatibility if needed, but UI now uses verifyIdentity + resetPassword directly
        return { success: false, message: '請使用新的身份驗證重設流程' };
    },

    resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean, message: string }> => {
        // 'token' here is treated as the userId
        const { data: userRecord } = await supabase
            .from('users')
            .select('*')
            .eq('id', token)
            .single();

        if (!userRecord) {
            return { success: false, message: '無效的用戶 ID' };
        }

        // Hash new password
        const newHash = await hashPassword(newPassword);
        
        // Construct User object to save
        const user: User = {
            id: userRecord.id,
            email: userRecord.email,
            passwordHash: newHash,
            role: userRecord.role as Role,
            name: userRecord.name,
            building: userRecord.building,
            floor: userRecord.floor,
            door: userRecord.door,
            // Keep status same
            isVerified: true, 
            isSuspended: !userRecord.is_active,
            
            loginCount: userRecord.login_count,
            lastLogin: userRecord.last_login,
            favorites: userRecord.favorites,
            themePreference: userRecord.theme_preference || 'dark'
        };

        await saveUser(user);

        return { success: true, message: '密碼重設成功！請使用新密碼登入' };
    }
};