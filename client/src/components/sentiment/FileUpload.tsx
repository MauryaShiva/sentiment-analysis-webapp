import React from "react";

// Assuming ConnectionStatus is exported from App.tsx or a types file
import type { ConnectionStatus } from "../../App"; // Adjust path if needed

/**
 * Defines the props for the FileUpload component.
 */
type FileUploadProps = {
  /** Indicates if an analysis is in progress. */
  loading: boolean;
  /** The file selected by the user. */
  selectedFile: File | null;
  /** Callback for when a new file is selected. */
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback to initiate the analysis. */
  onAnalyzeClick: () => void;
  /** The current progress percentage (0-100). */
  progress: number;
  /** A message to display during loading/progress. */
  progressMessage: string;
  /** List of headers found in the CSV file. */
  csvHeaders: string[];
  /** The currently selected CSV column to analyze. */
  selectedColumn: string;
  /** Callback for when the column selection changes. */
  onColumnChange: (columnName: string) => void;
  /** The current status of the model/backend connection. */
  connectionStatus: ConnectionStatus;
};

/**
 * A simple SVG spinning loader component.
 */
const SimpleSpinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-blue-400 mr-2"
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

/**
 * Handles the file selection, column selection, and displays loading/progress
 * UI for file analysis.
 */
const FileUpload: React.FC<FileUploadProps> = ({
  loading,
  selectedFile,
  onFileChange,
  onAnalyzeClick,
  progress,
  progressMessage,
  csvHeaders,
  selectedColumn,
  onColumnChange,
  connectionStatus, // <-- Received new prop
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* --- File Dropzone Label --- */}
      <label
        htmlFor="csv-upload"
        className={`flex flex-col items-center justify-center w-full min-h-64 h-auto border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-800/60 transition-colors ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {/* Show the name of the selected file */}
        {selectedFile && !loading && (
          <div className="text-center p-4">
            <p className="text-lg font-semibold text-green-400">
              File Selected:
            </p>
            <p className="text-md text-slate-200 break-all">
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Click again to change file
            </p>
          </div>
        )}

        {/* --- Loading/Progress UI --- */}
        {loading && (
          <div className="w-full px-10 text-center">
            {/* Conditional Rendering based on connectionStatus */}
            {connectionStatus === "connecting" ? (
              // Show a simple spinner while connecting
              <div className="flex items-center justify-center">
                <SimpleSpinner />
                <p className="text-lg font-semibold text-blue-300">
                  {progressMessage || "Connecting..."}
                </p>
              </div>
            ) : (
              // Show the full progress bar once connected and processing
              <>
                {/* Progress Message */}
                <p className="text-lg font-semibold text-blue-300 mb-4">
                  {progressMessage || "Analyzing..."}
                </p>
                {/* Progress Bar Container */}
                <div className="w-full bg-slate-700 rounded-full h-4">
                  {/* Progress Bar Fill */}
                  <div
                    className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {/* Percentage Text */}
                <p className="text-sm text-blue-200 mt-2">
                  {progress}% Complete
                </p>
              </>
            )}
          </div>
        )}
        {/* --- End Loading/Progress UI --- */}

        {/* Show the default upload icon */}
        {!selectedFile && !loading && (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-10 h-10 mb-4 text-slate-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-slate-400">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-slate-500">CSV file only (MAX. 5MB)</p>
          </div>
        )}

        <input
          id="csv-upload"
          type="file"
          className="hidden"
          accept=".csv"
          onChange={onFileChange}
          disabled={loading}
        />
      </label>
      {/* --- File Dropzone End --- */}

      {/* --- Column Selection Dropdown --- */}
      {selectedFile && !loading && csvHeaders.length > 0 && (
        <div className="w-full mt-6">
          <label
            htmlFor="column-select"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Select the column to analyze:
          </label>
          <select
            id="column-select"
            value={selectedColumn}
            onChange={(e) => onColumnChange(e.target.value)}
            className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>
              -- Select a column --
            </option>
            {csvHeaders.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* --- Analyze Button --- */}
      <button
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none"
        disabled={!selectedFile || !selectedColumn || loading}
        onClick={onAnalyzeClick}
      >
        {loading ? progressMessage || "Analyzing..." : "Analyze File"}
      </button>
    </div>
  );
};

export default FileUpload;
