import { useState, useMemo, useRef } from "react";
import axios from "axios";

import Header from "./components/sentiment/Header";
import AnalysisModeTabs from "./components/sentiment/AnalysisModeTabs";
import FileUpload from "./components/sentiment/FileUpload";
import SingleTextAnalyzer from "./components/sentiment/SingleTextAnalyzer";
import ErrorDisplay from "./components/sentiment/ErrorDisplay";
import FileResults from "./components/sentiment/FileResults";
import SingleTextResult from "./components/sentiment/SingleTextResult";

import type {
  FileSentimentResult,
  SentimentResult,
  ChartData,
} from "./components/sentiment/types";

/**
 * Dynamically sets the WebSocket URL based on the environment.
 * Uses 'ws://' for localhost and 'wss://' (secure) for production.
 */
const WS_URL =
  window.location.hostname === "localhost"
    ? "ws://localhost:8000/ws/analyze/"
    : "wss://YOUR_RENDER_BACKEND_URL.onrender.com/ws/analyze/";

/**
 * Represents the different states of the WebSocket connection.
 */
type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

/**
 * The main application component.
 * Manages all application state, event handlers, and API/WebSocket logic.
 */
function App() {
  // === STATE MANAGEMENT ===

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysisMode, setAnalysisMode] = useState<"file" | "text">("file");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileResults, setFileResults] = useState<FileSentimentResult>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");

  // Holds the WebSocket instance, persisting across renders.
  const ws = useRef<WebSocket | null>(null);

  const [singleText, setSingleText] = useState("");
  const [singleResult, setSingleResult] = useState<SentimentResult | null>(
    null
  );

  // === API & EVENT HANDLERS ===

  /**
   * A centralized error handler for API calls (Axios) and other errors.
   * Sets the 'error' state to display a user-friendly message.
   */
  const handleApiError = (err: unknown) => {
    console.error("API Error:", err);
    if (axios.isAxiosError(err) && err.response) {
      if (err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("An unknown error occurred during analysis.");
      }
    } else {
      setError("Could not connect to the server.");
    }
  };

  /**
   * Processes a newly selected file (from click or drag-and-drop).
   * Resets state, reads the file, and parses the first line
   * to extract CSV headers and auto-select a likely column.
   */
  const processNewFile = (file: File | null) => {
    if (file) {
      // Check for file type (security measure)
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Invalid file type. Please upload a .csv file.");
        return;
      }

      setSelectedFile(file);
      setError(null);
      setFileResults([]);
      setCurrentPage(1);
      setProgress(0);
      setProgressMessage("");
      setCsvHeaders([]);
      setSelectedColumn("");

      const slice = file.slice(0, 1024);
      const reader = new FileReader();
      reader.readAsText(slice);

      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        if (fileContent) {
          const firstLine = fileContent.split("\n")[0].trim();
          const headers = firstLine
            .split(",")
            .map((header) => header.replace(/"/g, ""));
          setCsvHeaders(headers);
          const commonHeaders = [
            "text",
            "review",
            "comment",
            "review_text",
            "Tweet",
            "sentence", // Added 'sentence'
          ];
          const foundHeader = headers.find((h) =>
            commonHeaders.includes(h.toLowerCase())
          );
          if (foundHeader) {
            setSelectedColumn(foundHeader);
          }
        }
      };
      reader.onerror = () => {
        setError("Error reading file headers.");
      };
    } else {
      // Handle deselection
      setSelectedFile(null);
      setCsvHeaders([]);
      setSelectedColumn("");
    }
  };

  /**
   * Initiates the file analysis via WebSocket.
   * 1. Resets state and sets status to "connecting".
   * 2. Reads the file content.
   * 3. Establishes a WebSocket connection.
   * 4. Sends the file content and selected column on 'onopen'.
   * 5. Listens for 'onmessage' events (info, progress, complete, error).
   * 6. Handles 'onerror' and 'onclose' events to update state and clean up.
   */
  const handleAnalyzeFileClick = () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }
    if (!selectedColumn) {
      setError("Please select the column to analyze.");
      return;
    }

    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
    }

    setLoading(true);
    setError(null);
    setFileResults([]);
    setCurrentPage(1);
    setProgress(0);
    setConnectionStatus("connecting");
    setProgressMessage("Connecting to server...");

    const reader = new FileReader();
    reader.readAsText(selectedFile);

    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      if (!fileContent) {
        setError("Could not read file content.");
        setLoading(false);
        setConnectionStatus("error");
        return;
      }

      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setConnectionStatus("connected");
        setProgressMessage("Uploading file to server...");
        const payload = { columnName: selectedColumn, csvData: fileContent };
        ws.current?.send(JSON.stringify(payload));
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // Ensure we are still connected before processing
        if (connectionStatus !== "closed" && connectionStatus !== "error") {
          switch (message.type) {
            case "info":
              setProgressMessage(message.message);
              break;
            case "progress":
              setProgress(message.progress);
              setProgressMessage(`Analyzing... ${message.progress}%`);
              break;
            case "complete":
              setFileResults(message.data);
              setProgress(100);
              setProgressMessage("Analysis complete!");
              setLoading(false);
              setConnectionStatus("closed"); // Mark as closed after completion
              ws.current?.close();
              break;
            case "error":
              setError(message.message);
              setLoading(false);
              setConnectionStatus("error"); // Mark error status
              ws.current?.close();
              break;
          }
        }
      };

      ws.current.onerror = () => {
        setError("WebSocket connection error. Check if backend is running.");
        setLoading(false);
        setConnectionStatus("error");
      };

      ws.current.onclose = () => {
        // Only set loading false if it wasn't already stopped by 'complete' or 'error'
        if (loading) {
          setLoading(false);
        }
        // Avoid overwriting error state
        if (connectionStatus !== "error") {
          setConnectionStatus("closed");
        }
        // Clean up ref
        ws.current = null;
      };
    };
    reader.onerror = () => {
      setError("Error reading file.");
      setLoading(false);
      setConnectionStatus("error");
    };
  };

  /**
   * Initiates the single text analysis via a standard HTTP POST request.
   * Uses an Axios client and the 'handleApiError' helper.
   */
  const handleAnalyzeTextClick = async () => {
    if (!singleText.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }
    setLoading(true);
    setError(null);
    setSingleResult(null);
    try {
      const response = await axios.post<SentimentResult>(
        "http://localhost:8000/analyze-text/",
        { text: singleText }
      );
      setSingleResult(response.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles switching between 'file' and 'text' analysis modes.
   * Resets errors, progress, and connection status.
   * Closes any active WebSocket connection.
   * Does NOT clear results or inputs, allowing users to switch back.
   */
  const changeMode = (mode: "file" | "text") => {
    setAnalysisMode(mode);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    setConnectionStatus("idle");

    // Let's also reset the page when coming to the file tab
    if (mode === "file") {
      setCurrentPage(1);
    }

    // If the WebSocket was running, close it
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
      ws.current = null; // Clean up ref
    }
  };

  /**
   * Memoized calculation to transform the raw file results array
   * into a data structure suitable for Recharts (Pie/Bar charts).
   * Re-calculates only when 'fileResults' changes.
   */
  const chartData = useMemo((): ChartData[] => {
    if (fileResults.length === 0) return [];
    const counts = { positive: 0, negative: 0, neutral: 0, unknown: 0 };
    fileResults.forEach((res) => {
      counts[res.sentiment]++;
    });
    return [
      { name: "Positive", value: counts.positive },
      { name: "Negative", value: counts.negative },
      { name: "Neutral", value: counts.neutral },
    ].filter((entry) => entry.value > 0);
  }, [fileResults]);

  // === JSX RENDER ===

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 sm:p-6 md:p-10">
      <Header />

      <AnalysisModeTabs analysisMode={analysisMode} onChangeMode={changeMode} />

      <main className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8">
        {analysisMode === "file" && (
          <FileUpload
            loading={loading}
            selectedFile={selectedFile}
            onFileProcess={processNewFile}
            onError={setError}
            onAnalyzeClick={handleAnalyzeFileClick}
            progress={progress}
            progressMessage={progressMessage}
            csvHeaders={csvHeaders}
            selectedColumn={selectedColumn}
            onColumnChange={setSelectedColumn}
            connectionStatus={connectionStatus}
          />
        )}

        {analysisMode === "text" && (
          <SingleTextAnalyzer
            loading={loading}
            text={singleText}
            onTextChange={setSingleText}
            onAnalyzeClick={handleAnalyzeTextClick}
          />
        )}

        <ErrorDisplay error={error} />
      </main>

      {/* --- Result Sections --- */}
      {analysisMode === "file" && !loading && fileResults.length > 0 && (
        <FileResults
          results={fileResults}
          chartData={chartData}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      )}

      {analysisMode === "text" && !loading && singleResult && (
        <SingleTextResult result={singleResult} />
      )}
    </div>
  );
}

export type { ConnectionStatus };

export default App;
