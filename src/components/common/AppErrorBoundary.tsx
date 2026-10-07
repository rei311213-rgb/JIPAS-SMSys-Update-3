import React, { ErrorInfo, ReactNode } from 'react';
import { reportError } from '../../services/errorMonitoringService';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends (React.Component as any) {
  public props: Props;
  public state: State;
  public setState: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      errorMessage: ''
    };
    this.setState = super.setState?.bind(this) || ((s: any) => {
      this.state = { ...this.state, ...(typeof s === 'function' ? s(this.state) : s) };
    });
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred in this view.'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportError(error, 'UI', {
      componentStack: errorInfo.componentStack
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleReloadPage = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 m-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {this.props.fallbackTitle || 'Component Recovery Boundary'}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              JIPAS Students Hub encountered an isolated rendering exception in this section. Other application modules remain active.
            </p>

            {this.state.errorMessage && (
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 text-left overflow-x-auto max-h-24">
                {this.state.errorMessage}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry View
              </button>

              <button
                onClick={this.handleReloadPage}
                className="px-4 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
