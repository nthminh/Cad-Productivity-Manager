import React, { useState, useEffect, useRef } from 'react';
import { Plus, Send, Trash2, MessageSquare, Image as ImageIcon, Video, X, ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { db } from '../lib/firebase';
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
import { getCurrentUser } from '../lib/auth';
import type { UserRole } from '../lib/permissions';

interface BulletinPost {
  id: string;
  author: string;
  authorUsername: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
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
}

const PostCard: React.FC<PostCardProps> = ({ post, userRole, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const currentUser = getCurrentUser();
  const canDelete =
    post.authorUsername === currentUser?.username || userRole === 'admin';

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

      {/* Post content */}
      <div className="px-4 pb-3">
        <p className="text-slate-800 text-sm whitespace-pre-wrap break-words leading-relaxed">
          {post.content}
        </p>
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
    </div>
  );
};

interface BulletinBoardPageProps {
  userRole: UserRole;
}

export const BulletinBoardPage: React.FC<BulletinBoardPageProps> = ({ userRole }) => {
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const currentUser = getCurrentUser();

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
      await addDoc(collection(db, 'bulletin_posts'), {
        author: currentUser.displayName,
        authorUsername: currentUser.username,
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        createdAt: serverTimestamp(),
        reactions: { like: [], dislike: [], surprised: [], heart: [], laugh: [] },
      });
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setShowForm(false);
    } catch (err) {
      console.error('Error creating post:', err);
      setSubmitError('Không thể đăng bài. Vui lòng thử lại.');
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
                setSubmitError(null);
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

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nội dung bài đăng (cập nhật tin tức, thông báo...)..."
              rows={4}
              required
              disabled={submitting}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm resize-none"
            />

            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-slate-400 flex-shrink-0" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL ảnh (tuỳ chọn)"
                disabled={submitting}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm"
              />
            </div>

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

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setContent('');
                  setImageUrl('');
                  setVideoUrl('');
                  setSubmitError(null);
                }}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
              >
                <Send size={16} />
                {submitting ? 'Đang đăng...' : 'Đăng bài'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Post feed */}
      {posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Newspaper size={48} className="opacity-20" />
          <p className="text-sm">Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!</p>
        </div>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          userRole={userRole}
          onDelete={handleDeletePost}
        />
      ))}
    </div>
  );
};
