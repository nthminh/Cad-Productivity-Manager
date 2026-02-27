import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getCurrentUser } from '../lib/auth';

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  username: string;
  createdAt: Timestamp | null;
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'chat_messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !db || !currentUser) return;
    setSending(true);
    setSendError(null);
    try {
      await addDoc(collection(db, 'chat_messages'), {
        text,
        sender: currentUser.displayName,
        username: currentUser.username,
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError('Gửi tin nhắn thất bại. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <MessageCircle className="text-white" size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base">Chat nội bộ</h2>
          <p className="text-xs text-slate-500">Nhắn tin với các thành viên trong nhóm</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <MessageCircle size={40} className="opacity-30" />
            <p className="text-sm">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.username === currentUser?.username;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-xs font-semibold text-slate-500 px-1">{msg.sender}</span>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm break-words ${
                    isMe
                      ? 'bg-emerald-500 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
        {sendError && (
          <p className="text-xs text-rose-600 font-medium px-1">{sendError}</p>
        )}
        <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          disabled={!db || !currentUser}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !db || !currentUser}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95"
        >
          <Send size={18} />
        </button>
        </div>
      </form>
    </div>
  );
};
