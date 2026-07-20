import { Component, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary: Catches any unhandled render error in the child tree
 * and displays a recovery UI instead of a blank black screen.
 * Without this, a single undefined .map() crash wipes the entire app.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary] Caught render crash:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-10 max-w-md w-full">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-rose-400" />
            </div>
            <h2 className="font-bold text-white text-base mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-1">
              A rendering error was caught before it could crash the whole app.
            </p>
            {this.state.errorMessage && (
              <code className="block text-[10px] font-mono text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 mt-3 mb-5 text-left break-words">
                {this.state.errorMessage}
              </code>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
