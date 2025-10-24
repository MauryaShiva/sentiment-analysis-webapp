import { useState, useMemo, useRef } from "react"; // <-- NEW: useEffect import
import axios from "axios";

// --- Components ---
import Header from "./components/sentiment/Header";
import AnalysisModeTabs from "./components/sentiment/AnalysisModeTabs";
import FileUpload from "./components/sentiment/FileUpload";
import SingleTextAnalyzer from "./components/sentiment/SingleTextAnalyzer";
import ErrorDisplay from "./components/sentiment/ErrorDisplay";
import FileResults from "./components/sentiment/FileResults";
import SingleTextResult from "./components/sentiment/SingleTextResult";

// --- Types & Utils ---
import type {
  FileSentimentResult,
  SentimentResult,
  ChartData,
} from "./components/sentiment/types";

// WebSocket URL
const WS_URL =
  window.location.hostname === "localhost"
    ? "ws://localhost:8000/ws/analyze/"
    : "wss://YOUR_RENDER_BACKEND_URL.onrender.com/ws/analyze/";

// --- NEW: WebSocket Connection Status Type ---
type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

function App() {
  // === STATE MANAGEMENT ===

  // Common States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [analysisMode, setAnalysisMode] = useState<"file" | "text">("file");

  // File Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileResults, setFileResults] = useState<FileSentimentResult>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  // --- NEW: Connection Status State ---
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");

  // WebSocket connection ref
  const ws = useRef<WebSocket | null>(null);

  // Single Text States
  const [singleText, setSingleText] = useState("");
  const [singleResult, setSingleResult] = useState<SentimentResult | null>(
    null
  );

  // === API & EVENT HANDLERS ===

  // Common Error Handler
  const handleApiError = (err: unknown) => {
    /* ... (same) ... */ console.error("API Error:", err);
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

  // File select handler (Same as before)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    /* ... (same) ... */ if (
      event.target.files &&
      event.target.files.length > 0
    ) {
      const file = event.target.files[0];
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
      setSelectedFile(null);
      setCsvHeaders([]);
      setSelectedColumn("");
    }
  };

  // File Upload (WebSocket Logic - UPDATED with connection status)
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
    // --- NEW: Set connecting status ---
    setConnectionStatus("connecting");
    setProgressMessage("Connecting to server..."); // Initial message

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
        // --- NEW: Set connected status ---
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
        // --- NEW: Set error status ---
        setConnectionStatus("error");
      };

      ws.current.onclose = () => {
        // Only set loading false if it wasn't already stopped by 'complete' or 'error'
        if (loading) {
          setLoading(false);
        }
        // --- NEW: Set closed status ---
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

  // Single Text API call (Same as before)
  const handleAnalyzeTextClick = async () => {
    /* ... (same) ... */ if (!singleText.trim()) {
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

  // Tab change handler (UPDATED: Will not clear results anymore)
  const changeMode = (mode: "file" | "text") => {
    setAnalysisMode(mode);
    // Only reset the error and progress (when tab switches)
    setError(null);
    setProgress(0);
    setProgressMessage("");
    // It's also necessary to reset the connection status
    setConnectionStatus("idle");

    // Let's also reset the page when coming to the file tab
    if (mode === "file") {
      setCurrentPage(1);
    }

    // Don't touch the input states (selectedFile, csvHeaders, selectedColumn, singleText)
    // Don't touch the result states (fileResults, singleResult) either

    // If the WebSocket was running, close it
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close();
      ws.current = null; // Clean up ref
    }
  };

  // Data Computation (Same as before)
  const chartData = useMemo((): ChartData[] => {
    /* ... (same) ... */ if (fileResults.length === 0) return [];
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
            onFileChange={handleFileChange}
            onAnalyzeClick={handleAnalyzeFileClick}
            progress={progress}
            progressMessage={progressMessage}
            csvHeaders={csvHeaders}
            selectedColumn={selectedColumn}
            onColumnChange={setSelectedColumn}
            // --- NEW: Pass connection status ---
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
