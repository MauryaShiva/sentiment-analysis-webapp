import React from "react";

// Defining what props this component needs
type AnalysisModeTabsProps = {
  analysisMode: "file" | "text";
  onChangeMode: (mode: "file" | "text") => void;
};

const AnalysisModeTabs: React.FC<AnalysisModeTabsProps> = ({
  analysisMode,
  onChangeMode,
}) => {
  return (
    <div className="w-full max-w-2xl flex mb-6 rounded-xl bg-slate-900/50 border border-slate-700 p-1">
      <button
        onClick={() => onChangeMode("file")}
        className={`w-1/2 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 ${
          analysisMode === "file"
            ? "bg-blue-600 text-white shadow-md"
            : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
        }`}
      >
        File Upload
      </button>
      <button
        onClick={() => onChangeMode("text")}
        className={`w-1/2 py-2.5 rounded-lg text-base font-semibold transition-all duration-300 ${
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
