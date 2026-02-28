import React from 'react';
import { MessageCircle, Bell, X } from 'lucide-react';

interface ChatNotificationBannerProps {
  mentionCount: number;
  newMessageCount: number;
  onNavigateToChat: () => void;
  onDismissNewMessages?: () => void;
  taskMentionCount?: number;
}

export const ChatNotificationBanner: React.FC<ChatNotificationBannerProps> = ({
  mentionCount,
  newMessageCount,
  onNavigateToChat,
  onDismissNewMessages,
  taskMentionCount = 0,
}) => {
  const total = mentionCount + newMessageCount + taskMentionCount;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
      <div className="relative flex-shrink-0">
        <MessageCircle className="text-emerald-600" size={20} />
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full px-1">
          {total > 99 ? '99+' : total}
        </span>
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {taskMentionCount > 0 && (
          <p className="text-sm text-emerald-800">
            <Bell size={13} className="inline text-rose-500 mr-1 flex-shrink-0" />
            Bạn được nhắc đến <strong>{taskMentionCount}</strong> lần trong bình luận dự án.
          </p>
        )}
        {mentionCount > 0 && (
          <p className="text-sm text-emerald-800">
            <Bell size={13} className="inline text-amber-500 mr-1 flex-shrink-0" />
            Bạn được nhắc đến <strong>{mentionCount}</strong> lần trong chat nội bộ.
          </p>
        )}
        {newMessageCount > 0 && (
          <p className="text-sm text-emerald-800">
            Có <strong>{newMessageCount}</strong> tin nhắn mới trong chat nội bộ.
          </p>
        )}
      </div>
      <button
        onClick={onNavigateToChat}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
      >
        <MessageCircle size={14} />
        Xem chat
      </button>
      {onDismissNewMessages && newMessageCount > 0 && (
        <button
          onClick={onDismissNewMessages}
          title="Ẩn thông báo tin nhắn mới"
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
