import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by VANIQ ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111508] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161c0c] border border-red-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold font-['Syne'] tracking-wide text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
              An unexpected render error occurred in this view. Don't worry, your drafts and data remain safe.
            </p>
            {this.state.error && (
              <div className="bg-black/40 border border-neutral-800 rounded-xl p-3 mb-6 text-left overflow-auto max-h-32 text-xs font-mono text-neutral-400">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-6 rounded-xl bg-[#c3f400] text-[#111508] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d4ff33] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
