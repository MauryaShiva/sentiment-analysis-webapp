import React from "react";

// Defining the props for this component
type SingleTextAnalyzerProps = {
  loading: boolean;
  text: string;
  onTextChange: (text: string) => void;
  onAnalyzeClick: () => void;
};

// --- NEW: Spinner SVG Component ---
const SpinnerIcon = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" // Adjust size and margin as needed
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const SingleTextAnalyzer: React.FC<SingleTextAnalyzerProps> = ({
  loading,
  text,
  onTextChange,
  onAnalyzeClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={loading}
        rows={5}
        placeholder="Type or paste your text here..."
        className="w-full p-4 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none" // <-- NEW: flex added
        disabled={!text.trim() || loading}
        onClick={onAnalyzeClick}
      >
        {/* --- NEW: Conditional Rendering with Spinner --- */}
        {loading ? (
          <>
            <SpinnerIcon />
            Analyzing...
          </>
        ) : (
          "Analyze Text"
        )}
      </button>
    </div>
  );
};

export default SingleTextAnalyzer;
