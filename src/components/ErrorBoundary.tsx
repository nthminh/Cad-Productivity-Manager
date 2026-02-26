import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  declare readonly props: Readonly<Props>;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-rose-50 p-4 rounded-full">
                <AlertTriangle className="text-rose-500" size={32} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Đã xảy ra lỗi</h2>
            <p className="text-slate-500 text-sm">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
            </p>
            {this.state.error && (
              <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-3 font-mono text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 mx-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all"
            >
              <RefreshCw size={16} />
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    const { children } = this.props;
    return <>{children}</>;
  }
}
