import React from 'react';
import { X, Maximize2, ExternalLink } from 'lucide-react';

interface DrawingViewerProps {
  url: string;
  onClose: () => void;
}

export const DrawingViewer: React.FC<DrawingViewerProps> = ({ url, onClose }) => {
  // Helper to convert Google Drive share link to preview link
  const getEmbedUrl = (link: string) => {
    if (link.includes('drive.google.com')) {
      // Standard: https://drive.google.com/file/d/ID/view?usp=sharing
      const match = link.match(/\/d\/(.+?)(\/|$|\?)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return link;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white w-full h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Maximize2 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Trình xem Google Drive</h2>
              <p className="text-xs text-slate-500">Xem trực tiếp tài liệu từ Drive</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ExternalLink size={16} />
              Mở tab mới
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-slate-100 relative">
          <iframe 
            src={embedUrl} 
            className="w-full h-full border-none"
            title="Document Viewer"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};
