import React from "react";

/**
 * Defines the props accepted by the AnalysisModeTabs component.
 */
type AnalysisModeTabsProps = {
  /** The currently active mode, either 'file' or 'text' */
  analysisMode: "file" | "text";
  /** Callback function to change the active mode */
  onChangeMode: (mode: "file" | "text") => void;
};

/**
 * Renders a tab switcher component to toggle between
 * 'file' (File Upload) and 'text' (Analyze Single Text) modes.
 */
const AnalysisModeTabs: React.FC<AnalysisModeTabsProps> = ({
  analysisMode,
  onChangeMode,
}) => {
  return (
    // Main container for the tab buttons
    <div className="w-full max-w-2xl flex mb-6 rounded-xl bg-slate-900/50 border border-slate-700 p-1">
      {/* File Upload Tab Button */}
      <button
        onClick={() => onChangeMode("file")}
        className={`w-1/2 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 ${
          // Apply active styles if 'file' mode is selected, otherwise default/hover styles
          analysisMode === "file"
            ? "bg-blue-600 text-white shadow-md"
            : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
        }`}
      >
        File Upload
      </button>

      {/* Analyze Single Text Tab Button */}
      <button
        onClick={() => onChangeMode("text")}
        className={`w-1/2 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 ${
          // Apply active styles if 'text' mode is selected, otherwise default/hover styles
          analysisMode === "text"
            ? "bg-blue-600 text-white shadow-md"
            : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
        }`}
      >
        Analyze Single Text
      </button>
    </div>
  );
};

export default AnalysisModeTabs;
