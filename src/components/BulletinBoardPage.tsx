import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Send, Trash2, Pencil, MessageSquare, Image as ImageIcon, Video, X, ChevronDown, ChevronUp, Newspaper, Bold, Italic, Underline, FileText, Upload, Search } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCurrentUser } from '../lib/auth';
import type { UserRole } from '../lib/permissions';

interface BulletinPost {
  id: string;
  author: string;
  authorUsername: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  createdAt: Timestamp | null;
  reactions: {
    like: string[];
    dislike: string[];
    surprised: string[];
    heart: string[];
    laugh: string[];
  };
}

interface BulletinComment {
  id: string;
  postId: string;
  author: string;
  authorUsername: string;
  text: string;
  createdAt: Timestamp | null;
}

const REACTIONS: { key: keyof BulletinPost['reactions']; emoji: string; label: string }[] = [
  { key: 'like', emoji: '👍', label: 'Thích' },
  { key: 'heart', emoji: '❤️', label: 'Yêu thích' },
  { key: 'laugh', emoji: '😂', label: 'Hài hước' },
  { key: 'surprised', emoji: '😮', label: 'Bất ngờ' },
  { key: 'dislike', emoji: '👎', label: 'Không thích' },
];

function formatTime(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

const HTML_TAG_RE = /(<[a-z]+[\s/>]|<\/[a-z]+>)/i;

async function compressImageToDataUrl(file: File, maxWidth = 800, quality = 0.5): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) ?? '');
        reader.readAsDataURL(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? '');
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

async function compressImageToBlob(file: File, maxWidth = 800, quality = 0.5): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on') || (attr.name === 'href' && /^javascript:/i.test(attr.value))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

const TOOLBAR_BTN = 'p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40';

interface RichTextEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onImagePaste?: (file: File) => Promise<string>;
  initialHtml?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ onChange, placeholder, disabled, onImagePaste, initialHtml }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && initialHtml !== undefined) {
      editorRef.current.innerHTML = sanitizeHtml(initialHtml);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const applyLetterSpacing = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const selectedText = selection.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    document.execCommand('insertHTML', false, `<span style="letter-spacing:0.08em">${selectedText}</span>`);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!onImagePaste) return;
    const items = Array.from(e.clipboardData.items) as DataTransferItem[];
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    // Show local preview immediately so user sees the image without waiting for upload
    const localUrl = URL.createObjectURL(file);
    const imgId = `img-paste-${crypto.randomUUID()}`;
    document.execCommand(
      'insertHTML',
      false,
      `<img id="${imgId}" src="${localUrl}" alt="Ảnh dán" style="max-width:100%;border-radius:8px;margin:4px 0;opacity:0.75" />`,
    );
    onChange(editorRef.current?.innerHTML ?? '');
    try {
      const url = await onImagePaste(file);
      URL.revokeObjectURL(localUrl);
      const imgEl = editorRef.current?.querySelector(`#${imgId}`) as HTMLImageElement | null;
      if (imgEl) {
        imgEl.src = url;
        imgEl.style.opacity = '1';
        imgEl.removeAttribute('id');
      }
    } catch {
      URL.revokeObjectURL(localUrl);
      const imgEl = editorRef.current?.querySelector(`#${imgId}`);
      if (imgEl) {
        const errSpan = document.createElement('span');
        errSpan.style.color = '#ef4444';
        errSpan.style.fontSize = '0.8em';
        errSpan.textContent = '[Tải ảnh thất bại]';
        imgEl.replaceWith(errSpan);
      }
    }
    onChange(editorRef.current?.innerHTML ?? '');
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('bold'); }}
          className={TOOLBAR_BTN}
          title="In đậm"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('italic'); }}
          className={TOOLBAR_BTN}
          title="In nghiêng"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('underline'); }}
          className={TOOLBAR_BTN}
          title="Gạch dưới"
        >
          <Underline size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('fontSize', '2'); }}
          className={`${TOOLBAR_BTN} text-xs`}
          title="Chữ nhỏ"
        >
          A-
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('fontSize', '3'); }}
          className={`${TOOLBAR_BTN} text-xs`}
          title="Chữ thường"
        >
          A
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); format('fontSize', '5'); }}
          className={`${TOOLBAR_BTN} text-xs font-semibold`}
          title="Chữ lớn"
        >
          A+
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); applyLetterSpacing(); }}
          className={`${TOOLBAR_BTN} text-xs`}
          title="Giãn cách chữ (chọn chữ trước)"
        >
          A↔
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => {
          const html = (e.target as HTMLDivElement).innerHTML;
          onChange(html === '<br>' ? '' : html);
        }}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="min-h-[100px] px-4 py-3 text-sm text-slate-800 focus:outline-none"
        suppressContentEditableWarning
      />
    </div>
  );
};

interface PostCommentsProps {
  postId: string;
  userRole: UserRole;
}

const PostComments: React.FC<PostCommentsProps> = ({ postId, userRole }) => {
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const currentUser = getCurrentUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, 'bulletin_comments'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as BulletinComment))
          .filter((c) => c.postId === postId),
      );
    });
    return () => unsub();
  }, [postId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const sendComment = async () => {
    const text = input.trim();
    if (!text || !db || !currentUser) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'bulletin_comments'), {
        postId,
        author: currentUser.displayName,
        authorUsername: currentUser.username,
        text,
        createdAt: serverTimestamp(),
      });
      setInput('');
    } catch (err) {
      console.error('Error sending comment:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'bulletin_comments', commentId));
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const canDeleteComment = (comment: BulletinComment) =>
    comment.authorUsername === currentUser?.username || userRole === 'admin';

  return (
    <div className="border-t border-slate-100 pt-3 space-y-3">
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">Chưa có bình luận nào.</p>
        )}
        {comments.map((c) => {
          const isMe = c.authorUsername === currentUser?.username;
          return (
            <div key={c.id} className="flex gap-2 group">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isMe ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {c.author.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                  <span className="text-[10px] text-slate-400">{formatTime(c.createdAt)}</span>
                  {canDeleteComment(c) && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500"
                      title="Xóa bình luận"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 break-words">{c.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {currentUser && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendComment();
              }
            }}
            placeholder="Viết bình luận..."
            disabled={!db || sending}
            className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
          />
          <button
            onClick={sendComment}
            disabled={sending || !input.trim() || !db}
            className="flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white p-2 rounded-xl transition-all active:scale-95 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

interface PostCardProps {
  post: BulletinPost;
  userRole: UserRole;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: { content: string; imageUrl: string; videoUrl: string }) => Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({ post, userRole, onDelete, onEdit }) => {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [editImageLocalPreview, setEditImageLocalPreview] = useState<string | null>(null);
  const [editImageUploadError, setEditImageUploadError] = useState<string | null>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();
  const canDelete =
    post.authorUsername === currentUser?.username || userRole === 'admin';
  const canEdit =
    post.authorUsername === currentUser?.username || userRole === 'admin';

  const startEdit = () => {
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl ?? '');
    setEditVideoUrl(post.videoUrl ?? '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditImageUploadError(null);
    if (editImageLocalPreview) {
      URL.revokeObjectURL(editImageLocalPreview);
      setEditImageLocalPreview(null);
    }
    if (editImageInputRef.current) editImageInputRef.current.value = '';
  };

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onEdit(post.id, {
        content: editContent.trim(),
        imageUrl: editImageUrl.trim(),
        videoUrl: editVideoUrl.trim(),
      });
      setIsEditing(false);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    } finally {
      setSaving(false);
    }
  };

  const handleEditImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately so user sees the image without waiting for upload
    const localUrl = URL.createObjectURL(file);
    setEditImageLocalPreview(localUrl);
    setUploadingEditImage(true);
    setEditImageUploadError(null);
    try {
      if (!storage) throw new Error('Firebase Storage chưa được cấu hình.');
      const blob = await compressImageToBlob(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileRef = storageRef(storage, `bulletin_images/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(fileRef);
      setEditImageUrl(downloadUrl);
      URL.revokeObjectURL(localUrl);
      setEditImageLocalPreview(null);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setEditImageLocalPreview(null);
      console.error('Upload edit image error:', err);
      setEditImageUploadError('Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingEditImage(false);
      if (editImageInputRef.current) editImageInputRef.current.value = '';
    }
  };

  const toggleReaction = async (reactionKey: keyof BulletinPost['reactions']) => {
    if (!db || !currentUser) return;
    const username = currentUser.username;
    const alreadyReacted = post.reactions[reactionKey]?.includes(username);
    try {
      await updateDoc(doc(db, 'bulletin_posts', post.id), {
        [`reactions.${reactionKey}`]: alreadyReacted
          ? arrayRemove(username)
          : arrayUnion(username),
      });
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const embedUrl = post.videoUrl ? getYoutubeEmbedUrl(post.videoUrl) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Post header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {post.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{post.author}</p>
            <p className="text-xs text-slate-400">{formatTime(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && !isEditing && (
            <button
              onClick={startEdit}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Chỉnh sửa bài đăng"
            >
              <Pencil size={16} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              title="Xóa bài đăng"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Post content / inline edit form */}
      {isEditing ? (
        <div className="px-4 pb-4 space-y-3">
          <RichTextEditor
            key={post.id}
            onChange={setEditContent}
            placeholder="Nội dung bài đăng..."
            disabled={saving}
            initialHtml={post.content}
          />
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="url"
              value={editImageUrl}
              onChange={(e) => setEditImageUrl(e.target.value)}
              placeholder="URL ảnh (tuỳ chọn)"
              disabled={saving || uploadingEditImage}
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
            <input
              ref={editImageInputRef}
              type="file"
              accept="image/*"
              disabled={saving || uploadingEditImage}
              onChange={handleEditImageFileSelect}
              className="hidden"
            />
            <button
              type="button"
              disabled={saving || uploadingEditImage}
              onClick={() => editImageInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
              title="Tải ảnh từ máy tính"
            >
              <Upload size={14} />
              {uploadingEditImage ? 'Đang tải...' : 'Tải ảnh lên'}
            </button>
          </div>
          {editImageUploadError && (
            <p className="text-xs text-rose-600 font-medium">{editImageUploadError}</p>
          )}
          {(editImageLocalPreview || editImageUrl) && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img
                src={editImageLocalPreview ?? editImageUrl}
                alt="Xem trước ảnh"
                className={`w-full max-h-48 object-contain bg-slate-50 ${editImageLocalPreview ? 'opacity-60' : ''}`}
              />
              {editImageLocalPreview && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-slate-700 bg-white/80 px-2 py-1 rounded-lg">Đang tải lên...</span>
                </div>
              )}
              {!editImageLocalPreview && editImageUrl && (
                <button
                  type="button"
                  onClick={() => setEditImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-rose-50 rounded-full text-slate-500 hover:text-rose-500 transition-colors"
                  title="Xóa ảnh"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Video size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="url"
              value={editVideoUrl}
              onChange={(e) => setEditVideoUrl(e.target.value)}
              placeholder="URL video / YouTube (tuỳ chọn)"
              disabled={saving}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || uploadingEditImage || !editContent.trim()}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              <Send size={16} />
              {uploadingEditImage ? 'Đang tải ảnh...' : saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Post content */}
      <div className="px-4 pb-3">
        {HTML_TAG_RE.test(post.content) ? (
          <div
            className="text-slate-800 text-sm break-words leading-relaxed [&_b]:font-bold [&_i]:italic [&_u]:underline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        ) : (
          <p className="text-slate-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </p>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="px-4 pb-3">
          <img
            src={post.imageUrl}
            alt="Ảnh bài đăng"
            className="w-full rounded-xl object-cover max-h-96 border border-slate-100"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="px-4 pb-3">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="Video bài đăng"
              className="w-full rounded-xl aspect-video border border-slate-100"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={post.videoUrl}
              controls
              className="w-full rounded-xl max-h-80 border border-slate-100"
            />
          )}
        </div>
      )}

      {/* PDF attachment */}
      {post.pdfUrl && (
        <div className="px-4 pb-3">
          <a
            href={post.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <FileText size={16} className="flex-shrink-0" />
            <span className="flex-1 truncate">{post.pdfName || 'Tài liệu PDF'}</span>
          </a>
        </div>
      )}

      {/* Reactions */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {REACTIONS.map(({ key, emoji, label }) => {
          const users = post.reactions?.[key] ?? [];
          const reacted = currentUser ? users.includes(currentUser.username) : false;
          return (
            <button
              key={key}
              onClick={() => toggleReaction(key)}
              title={label}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all ${
                reacted
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{emoji}</span>
              {users.length > 0 && (
                <span className="text-xs font-medium">{users.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Comment toggle */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setShowComments((v) => !v)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <MessageSquare size={15} />
          <span>Bình luận</span>
          {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4">
          <PostComments postId={post.id} userRole={userRole} />
        </div>
      )}
        </>
      )}
    </div>
  );
};

interface BulletinBoardPageProps {
  userRole: UserRole;
}

export const BulletinBoardPage: React.FC<BulletinBoardPageProps> = ({ userRole }) => {
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLocalPreview, setImageLocalPreview] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const currentUser = getCurrentUser();

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      const textContent = p.content.replace(/<[^>]*>/g, ' ');
      return (
        textContent.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      );
    });
  }, [posts, searchQuery]);

  const handleImagePaste = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      if (!storage) throw new Error('Firebase Storage chưa được cấu hình.');
      const blob = await compressImageToBlob(file);
      const fileRef = storageRef(storage, `bulletin_images/${Date.now()}_${crypto.randomUUID()}.jpg`);
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      return await getDownloadURL(fileRef);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately so user sees the image without waiting for upload
    const localUrl = URL.createObjectURL(file);
    setImageLocalPreview(localUrl);
    setUploadingImage(true);
    setImageUploadError(null);
    try {
      if (!storage) throw new Error('Firebase Storage chưa được cấu hình.');
      const blob = await compressImageToBlob(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileRef = storageRef(storage, `bulletin_images/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(fileRef);
      setImageUrl(downloadUrl);
      URL.revokeObjectURL(localUrl);
      setImageLocalPreview(null);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setImageLocalPreview(null);
      console.error('Upload image error:', err);
      setImageUploadError('Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'bulletin_posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BulletinPost)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !db || !currentUser) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let pdfUrl: string | null = null;
      let pdfName: string | null = null;
      if (pdfFile && storage) {
        setUploadingPdf(true);
        const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = storageRef(storage, `bulletin_pdfs/${Date.now()}_${safeName}`);
        await uploadBytes(fileRef, pdfFile);
        pdfUrl = await getDownloadURL(fileRef);
        pdfName = pdfFile.name;
        setUploadingPdf(false);
      }
      await addDoc(collection(db, 'bulletin_posts'), {
        author: currentUser.displayName,
        authorUsername: currentUser.username,
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        pdfUrl: pdfUrl,
        pdfName: pdfName,
        createdAt: serverTimestamp(),
        reactions: { like: [], dislike: [], surprised: [], heart: [], laugh: [] },
      });
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setPdfFile(null);
      setImageUploadError(null);
      setImageLocalPreview(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      setShowForm(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setSubmitError('Không thể đăng bài. Vui lòng thử lại.');
      setUploadingPdf(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!db || !window.confirm('Xóa bài đăng này?')) return;
    try {
      await deleteDoc(doc(db, 'bulletin_posts', postId));
    } catch (err) {
      console.error('Delete post error:', err);
    }
  };

  const handleEditPost = async (
    postId: string,
    updates: { content: string; imageUrl: string; videoUrl: string },
  ) => {
    if (!db) return;
    await updateDoc(doc(db, 'bulletin_posts', postId), {
      content: updates.content,
      imageUrl: updates.imageUrl || null,
      videoUrl: updates.videoUrl || null,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Create post button / form */}
      {currentUser && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm text-sm"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {currentUser.displayName.charAt(0).toUpperCase()}
          </div>
          <span>Bạn muốn chia sẻ điều gì?</span>
          <Plus size={18} className="ml-auto flex-shrink-0" />
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Tạo bài đăng mới</h3>
            <button
              onClick={() => {
                setShowForm(false);
                setContent('');
                setImageUrl('');
                setVideoUrl('');
                setPdfFile(null);
                setSubmitError(null);
                setImageUploadError(null);
                if (imageLocalPreview) URL.revokeObjectURL(imageLocalPreview);
                setImageLocalPreview(null);
                if (imageInputRef.current) imageInputRef.current.value = '';
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {submitError && (
              <p className="text-xs text-rose-600 font-medium">{submitError}</p>
            )}

            <RichTextEditor
              onChange={setContent}
              placeholder="Nội dung bài đăng (cập nhật tin tức, thông báo...). Dán ảnh trực tiếp vào đây..."
              disabled={submitting}
              onImagePaste={handleImagePaste}
            />

            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL ảnh (tuỳ chọn)"
                disabled={submitting || uploadingImage}
                className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                disabled={submitting || uploadingImage}
                onChange={handleImageFileSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={submitting || uploadingImage}
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                title="Tải ảnh từ máy tính"
              >
                <Upload size={14} />
                {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
              </button>
            </div>
            {imageUploadError && (
              <p className="text-xs text-rose-600 font-medium">{imageUploadError}</p>
            )}

            {(imageLocalPreview || imageUrl) && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={imageLocalPreview ?? imageUrl}
                  alt="Xem trước ảnh"
                  className={`w-full max-h-48 object-contain bg-slate-50 ${imageLocalPreview ? 'opacity-60' : ''}`}
                />
                {imageLocalPreview && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-slate-700 bg-white/80 px-2 py-1 rounded-lg">Đang tải lên...</span>
                  </div>
                )}
                {!imageLocalPreview && imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-rose-50 rounded-full text-slate-500 hover:text-rose-500 transition-colors"
                    title="Xóa ảnh"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Video size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="URL video / YouTube (tuỳ chọn)"
                disabled={submitting}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400 flex-shrink-0" />
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                disabled={submitting}
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => pdfInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Upload size={14} />
                {pdfFile ? pdfFile.name : 'Đính kèm PDF (tuỳ chọn)'}
              </button>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Xóa file PDF"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setContent('');
                  setImageUrl('');
                  setVideoUrl('');
                  setPdfFile(null);
                  setSubmitError(null);
                  setImageUploadError(null);
                  if (imageLocalPreview) URL.revokeObjectURL(imageLocalPreview);
                  setImageLocalPreview(null);
                  if (imageInputRef.current) imageInputRef.current.value = '';
                }}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingImage || !content.trim()}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              >
                <Send size={16} />
                {uploadingImage ? 'Đang tải ảnh...' : uploadingPdf ? 'Đang tải PDF...' : submitting ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài đăng..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Post feed */}
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Newspaper size={48} className="opacity-20" />
          <p className="text-sm">Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!</p>
        </div>
      )}

      {posts.length > 0 && filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Search size={32} className="opacity-20" />
          <p className="text-sm">Không tìm thấy bài đăng phù hợp.</p>
        </div>
      )}

      {filteredPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          userRole={userRole}
          onDelete={handleDeletePost}
          onEdit={handleEditPost}
        />
      ))}
    </div>
  );
};
