
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Song, SongRequest } from './types';
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
                    