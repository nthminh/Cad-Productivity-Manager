import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, MessageCircle, Paperclip, Image as ImageIcon, Mic, MicOff,
  X, Reply, Edit2, Trash2, Check, Download, FileText, AtSign
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  Timestamp, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getCurrentUser, getUsers } from '../lib/auth';

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  username: string;
  createdAt: Timestamp | null;
  type?: 'text' | 'image' | 'file' | 'voice';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  edited?: boolean;
  editedAt?: Timestamp | null;
  mentions?: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReplyPreviewText(msg: ChatMessage): string {
  if (msg.text) return msg.text;
  switch (msg.type) {
    case 'image': return '📷 Ảnh';
    case 'file': return `📎 ${msg.fileName ?? 'File'}`;
    case 'voice': return '🎙️ Voice';
    default: return '';
  }
}

function renderTextWithMentions(text: string, currentUsername?: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (/^@\w+$/.test(part)) {
      const isSelf = currentUsername && part === `@${currentUsername}`;
      return (
        <span
          key={i}
          className={`font-semibold ${isSelf ? 'bg-yellow-200 text-yellow-800 rounded px-0.5' : 'text-emerald-600'}`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Reply
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // @ mention
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<{ username: string; displayName: string }[]>([]);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // File inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    setAllUsers(getUsers().map((u) => ({ username: u.username, displayName: u.displayName })));
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const match = val.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  };

  const filteredUsers = mentionQuery !== null
    ? allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(mentionQuery) ||
          u.displayName.toLowerCase().includes(mentionQuery)
      )
    : [];

  const insertMention = (username: string) => {
    const newInput = input.replace(/@(\w*)$/, `@${username} `);
    setInput(newInput);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(\w+)/g);
    return matches ? matches.map((m) => m.slice(1)) : [];
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !db || !currentUser) return;
    setSending(true);
    setSendError(null);
    try {
      const mentions = extractMentions(text);
      const msgData: Record<string, unknown> = {
        text,
        sender: currentUser.displayName,
        username: currentUser.username,
        createdAt: serverTimestamp(),
        type: 'text',
        mentions,
      };
      if (replyTo) {
        msgData.replyToId = replyTo.id;
        msgData.replyToText = getReplyPreviewText(replyTo);
        msgData.replyToSender = replyTo.sender;
      }
      await addDoc(collection(db, 'chat_messages'), msgData);
      setInput('');
      setReplyTo(null);
      setMentionQuery(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError('Gửi tin nhắn thất bại. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const uploadFile = useCallback(async (file: File, type: 'image' | 'file') => {
    if (!storage || !db || !currentUser) return;
    setSendError(null);
    setSending(true);
    try {
      const path = `chat/${Date.now()}_${file.name}`;
      const sRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });
      setUploadProgress(null);
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      const msgData: Record<string, unknown> = {
        text: '',
        sender: currentUser.displayName,
        username: currentUser.username,
        createdAt: serverTimestamp(),
        type,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mentions: [],
      };
      if (replyTo) {
        msgData.replyToId = replyTo.id;
        msgData.replyToText = getReplyPreviewText(replyTo);
        msgData.replyToSender = replyTo.sender;
      }
      await addDoc(collection(db, 'chat_messages'), msgData);
      setReplyTo(null);
    } catch (err) {
      console.error('Upload error:', err);
      setSendError('Tải lên thất bại. Kiểm tra Firebase Storage đã được bật chưa.');
      setUploadProgress(null);
    } finally {
      setSending(false);
    }
  }, [currentUser, replyTo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, type);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoice(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setSendError('Không thể truy cập microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const uploadVoice = async (blob: Blob) => {
    if (!storage || !db || !currentUser) return;
    setSending(true);
    setSendError(null);
    try {
      const fileName = `voice_${Date.now()}.webm`;
      const path = `chat/${fileName}`;
      const sRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sRef, blob);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });
      setUploadProgress(null);
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      const msgData: Record<string, unknown> = {
        text: '',
        sender: currentUser.displayName,
        username: currentUser.username,
        createdAt: serverTimestamp(),
        type: 'voice',
        fileUrl: url,
        fileName,
        fileSize: blob.size,
        mentions: [],
      };
      if (replyTo) {
        msgData.replyToId = replyTo.id;
        msgData.replyToText = getReplyPreviewText(replyTo);
        msgData.replyToSender = replyTo.sender;
      }
      await addDoc(collection(db, 'chat_messages'), msgData);
      setReplyTo(null);
    } catch (err) {
      console.error('Voice upload error:', err);
      setSendError('Gửi voice thất bại.');
      setUploadProgress(null);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const submitEdit = async (msgId: string) => {
    const text = editText.trim();
    if (!text || !db) return;
    try {
      await updateDoc(doc(db, 'chat_messages', msgId), {
        text,
        edited: true,
        editedAt: serverTimestamp(),
        mentions: extractMentions(text),
      });
      cancelEdit();
    } catch (err) {
      console.error('Edit error:', err);
      setSendError('Chỉnh sửa thất bại.');
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!db || !window.confirm('Xóa tin nhắn này?')) return;
    try {
      await deleteDoc(doc(db, 'chat_messages', msgId));
    } catch (err) {
      console.error('Delete error:', err);
      setSendError('Xóa tin nhắn thất bại.');
    }
  };

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return '';
    const d = ts.toDate();
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const role = currentUser?.role;
  const canModify = (msg: ChatMessage) => msg.username === currentUser?.username;
  const canDelete = (msg: ChatMessage) => msg.username === currentUser?.username || role === 'admin';
  const noStorage = !storage;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 flex-shrink-0">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <MessageCircle className="text-white" size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base">Chat nội bộ</h2>
          <p className="text-xs text-slate-500">Nhắn tin với các thành viên trong nhóm</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <MessageCircle size={40} className="opacity-30" />
            <p className="text-sm">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.username === currentUser?.username;
          const isEditing = editingId === msg.id;
          return (
            <div key={msg.id} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-xs font-semibold text-slate-500 px-1">{msg.sender}</span>
                )}

                {/* Reply preview */}
                {msg.replyToId && (
                  <div className={`text-xs px-3 py-1.5 rounded-lg mb-0.5 border-l-2 ${isMe ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-300 text-slate-500'}`}>
                    <span className="font-semibold">{msg.replyToSender}</span>: {msg.replyToText}
                  </div>
                )}

                {/* Message bubble or edit input */}
                {isEditing ? (
                  <div className="flex gap-1 items-center w-full">
                    <input
                      className="flex-1 px-3 py-1.5 text-sm border border-emerald-400 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitEdit(msg.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <button onClick={() => submitEdit(msg.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                      <Check size={14} />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={`relative px-4 py-2 rounded-2xl text-sm break-words ${isMe ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {msg.type === 'image' && msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                        <img src={msg.fileUrl} alt="ảnh" className="max-w-[240px] rounded-lg" />
                      </a>
                    )}
                    {msg.type === 'file' && msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName} className={`flex items-center gap-2 hover:underline ${isMe ? 'text-white' : 'text-slate-700'}`}>
                        <FileText size={16} className="flex-shrink-0" />
                        <span className="flex-1 truncate max-w-[180px]">{msg.fileName}</span>
                        {msg.fileSize !== undefined && <span className="text-[10px] opacity-70">{formatFileSize(msg.fileSize)}</span>}
                        <Download size={14} className="flex-shrink-0 opacity-70" />
                      </a>
                    )}
                    {msg.type === 'voice' && msg.fileUrl && (
                      <audio controls src={msg.fileUrl} className="max-w-[220px] h-8" />
                    )}
                    {(msg.type === 'text' || !msg.type) && msg.text && (
                      <span>{renderTextWithMentions(msg.text, currentUser?.username)}</span>
                    )}
                    {msg.edited && <span className="text-[9px] opacity-60 ml-1">(đã sửa)</span>}
                  </div>
                )}

                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Phản hồi"
                        onClick={() => setReplyTo(msg)}
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <Reply size={12} />
                      </button>
                      {canModify(msg) && (msg.type === 'text' || !msg.type) && (
                        <button
                          title="Chỉnh sửa"
                          onClick={() => startEdit(msg)}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {canDelete(msg) && (
                        <button
                          title="Xóa"
                          onClick={() => handleDelete(msg.id)}
                          className="p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-100 flex-shrink-0">
        {/* Reply preview bar */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <div className="flex-1 text-xs bg-slate-50 border-l-2 border-emerald-400 px-3 py-1.5 rounded-r-lg text-slate-600">
              <span className="font-semibold text-emerald-600">↩ {replyTo.sender}</span>: {getReplyPreviewText(replyTo)}
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* @ mention dropdown */}
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <div className="mx-4 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {filteredUsers.slice(0, 6).map((u) => (
              <button
                key={u.username}
                onClick={() => insertMention(u.username)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-left text-sm"
              >
                <AtSign size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="font-medium text-slate-800">{u.displayName}</span>
                <span className="text-slate-400 text-xs">@{u.username}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="p-4 flex flex-col gap-2">
          {sendError && <p className="text-xs text-rose-600 font-medium px-1">{sendError}</p>}
          {uploadProgress !== null && (
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-xl text-rose-600 text-sm">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Đang ghi âm... {recordingSeconds}s</span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {/* Hidden file inputs */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFileChange(e, 'file')} />

            <button
              type="button"
              title="Gửi ảnh"
              disabled={noStorage || !currentUser || sending}
              onClick={() => imageInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <ImageIcon size={18} />
            </button>

            <button
              type="button"
              title="Gửi file"
              disabled={noStorage || !currentUser || sending}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              title={isRecording ? 'Dừng ghi âm' : 'Ghi voice'}
              disabled={noStorage || !currentUser || (sending && !isRecording)}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-xl transition-colors flex-shrink-0 disabled:opacity-40 ${isRecording ? 'text-rose-500 bg-rose-50 hover:bg-rose-100' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setMentionQuery(null); setReplyTo(null); }
              }}
              placeholder="Nhập tin nhắn... (dùng @ để nhắc ai đó)"
              disabled={!db || !currentUser || sending}
              className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || !db || !currentUser}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
          {noStorage && (
            <p className="text-[10px] text-amber-600 text-center">
              Firebase Storage chưa được cấu hình – chức năng gửi ảnh/file/voice sẽ không hoạt động.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
