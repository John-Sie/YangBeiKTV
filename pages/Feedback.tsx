
import React, { useState } from 'react';
import { User, FeedbackType } from '../types';
import { addFeedback } from '../services/storage';
import { useToast } from '../components/Toast';
import { MessageSquare, Send, Mail, Phone, User as UserIcon, HelpCircle, ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface FeedbackProps {
  user: User | null;
}

export const FeedbackPage: React.FC<FeedbackProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    type: 'issue' as FeedbackType,
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.content) {
      showToast('請填寫所有必填欄位', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addFeedback({
        userId: user?.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        type: formData.type,
        content: formData.content,
        createdAt: new Date().toISOString(),
        isRead: false
      });
      showToast('感謝您的回饋！我們已收到您的訊息。', 'success');
      // Reset form (keep name/email if logged in)
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        phone: '',
        type: 'issue',
        content: ''
      });
    } catch (error: any) {
      console.error("Feedback submit error:", error);
      if (error?.code === 'PGRST205') {
          showToast('系統錯誤：資料庫尚未設定 feedbacks 資料表', 'error');
          alert('請管理員至 Supabase SQL Editor 執行 db_setup.sql 中的指令以建立資料表。');
      } else {
          showToast('發送失敗，請稍後再試', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
      switch(type) {
          case 'issue': return <AlertTriangle size={18} className="text-red-500" />;
          case 'suggestion': return <Lightbulb size={18} className="text-yellow-500" />;
          case 'praise': return <ThumbsUp size={18} className="text-green-500" />;
          default: return <HelpCircle size={18} className="text-blue-500" />;
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
      <div className="text-center space-y-2 mb-8">
         <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
            <MessageSquare className="text-ktv-500 w-8 h-8"/>
            意見回饋
         </h2>
         <p className="text-gray-500 dark:text-gray-400">
            您的建議是我們進步的動力，歡迎隨時告訴我們您的想法。
         </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <UserIcon size={16}/> 姓名 / 稱呼 <span className="text-red-500">*</span>
                    </label>
                    <input 
                        required
                        type="text" 
                        placeholder="您的稱呼"
                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <Phone size={16}/> 手機號碼 <span className="text-red-500">*</span>
                    </label>
                    <input 
                        required
                        type="tel" 
                        placeholder="0912345678"
                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Mail size={16}/> Email <span className="text-red-500">*</span>
                </label>
                <input 
                    required
                    type="email" 
                    placeholder="example@mail.com"
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>

            {/* Feedback Type */}
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    回饋類型
                 </label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {[
                         { id: 'issue', label: '問題回報', icon: AlertTriangle, color: 'text-red-500' },
                         { id: 'suggestion', label: '需求建議', icon: Lightbulb, color: 'text-yellow-500' },
                         { id: 'praise', label: '支持點讚', icon: ThumbsUp, color: 'text-green-500' },
                         { id: 'other', label: '其他', icon: HelpCircle, color: 'text-blue-500' }
                     ].map((item) => (
                         <button
                            key={item.id}
                            type="button"
                            onClick={() => setFormData({...formData, type: item.id as FeedbackType})}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                formData.type === item.id 
                                ? 'bg-ktv-50 dark:bg-ktv-900/30 border-ktv-500 ring-1 ring-ktv-500' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                         >
                             <item.icon size={24} className={item.color} />
                             <span className={`text-sm font-medium ${formData.type === item.id ? 'text-ktv-700 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                 {item.label}
                             </span>
                         </button>
                     ))}
                 </div>
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    反應內容 <span className="text-red-500">*</span>
                </label>
                <textarea 
                    required
                    rows={6}
                    placeholder="請詳細描述您的問題或建議..."
                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-ktv-500 outline-none transition-all resize-none"
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-ktv-500 hover:bg-ktv-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-ktv-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        發送中...
                    </>
                ) : (
                    <>
                        <Send size={20} />
                        送出回饋
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};
