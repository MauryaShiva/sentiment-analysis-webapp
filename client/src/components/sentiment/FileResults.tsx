import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import type { FileSentimentResult, ChartData } from "./types";
import { COLORS, getSentimentColorClasses } from "./utils";

// --- Constants ---
const ROWS_PER_PAGE = 50;
type SentimentFilter = "all" | "positive" | "negative" | "neutral";

/**
 * Defines the props for the FileResults component.
 */
type FileResultsProps = {
  /** The full list of sentiment analysis results for the file */
  results: FileSentimentResult;
  /** Data formatted for use in charts (Pie and Bar) */
  chartData: ChartData[];
  /** The currently active page number for pagination */
  currentPage: number;
  /** Callback function to set the current page */
  setCurrentPage: (page: number) => void;
};

/**
 * A component to display file analysis results, including charts,
 * filterable/pageinated data table, and CSV download functionality.
 */
const FileResults: React.FC<FileResultsProps> = ({
  results,
  chartData,
  currentPage,
  setCurrentPage,
}) => {
  // --- State ---
  const [filterSentiment, setFilterSentiment] =
    useState<SentimentFilter>("all");
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  // Ref to detect clicks outside the download dropdown
  const downloadButtonRef = useRef<HTMLDivElement>(null);

  // --- Memoized Calculations ---

  /**
   * Calculates the total count for each sentiment type.
   * Re-calculates only when 'results' prop changes.
   */
  const sentimentCounts = useMemo(() => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    results.forEach((item) => {
      if (item.sentiment === "positive") counts.positive++;
      else if (item.sentiment === "negative") counts.negative++;
      else if (item.sentiment === "neutral") counts.neutral++;
    });
    return counts;
  }, [results]);

  /**
   * Calculates pagination and filtering logic.
   * Re-calculates when results, page, or filter change.
   */
  const { totalPages, currentRows, filteredCount } = useMemo(() => {
    // 1. Filter results based on the selected sentiment
    const filteredResults =
      filterSentiment === "all"
        ? results
        : results.filter((item) => item.sentiment === filterSentiment);

    // 2. Calculate total pages based on filtered results
    const totalPages = Math.ceil(filteredResults.length / ROWS_PER_PAGE);

    // 3. Calculate the slice of rows for the current page
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const currentRows = filteredResults.slice(startIndex, endIndex);

    return { totalPages, currentRows, filteredCount: filteredResults.length };
  }, [results, currentPage, filterSentiment]);

  // --- Event Handlers ---

  /**
   * Handles changing the sentiment filter and resets pagination to page 1.
   */
  const handleFilterChange = (filter: SentimentFilter) => {
    setFilterSentiment(filter);
    setCurrentPage(1);
  };

  const goToNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    setCurrentPage(currentPage - 1);
  };

  /**
   * Generates and triggers a download for a CSV file based on the selected filter.
   */
  const handleDownloadCSV = (filter: SentimentFilter = "all") => {
    const dataToDownload =
      filter === "all"
        ? results
        : results.filter((item) => item.sentiment === filter);

    if (dataToDownload.length === 0) {
      alert(`No ${filter} results to download.`);
      return;
    }

    // Helper to escape CSV special characters
    const escapeCSV = (value: string): string => {
      let str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
      }
      return str;
    };

    const headers = '"text","sentiment"';
    const rows = dataToDownload.map(
      (row) => `${escapeCSV(row.text)},${escapeCSV(row.sentiment)}`
    );
    const csvString = [headers, ...rows].join("\n");

    // Create and trigger a download link
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const fileName =
      filter === "all" ? "all_results.csv" : `${filter}_results.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadOptions(false);
  };

  /**
   * Dynamically generates Tailwind CSS classes for filter buttons
   * based on their active (selected) or inactive state.
   */
  const getFilterButtonStyle = (filter: SentimentFilter) => {
    const baseStyle =
      "font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300 mr-2 mb-2 sm:mb-0";

    if (filter === filterSentiment) {
      // Active state: solid color + shadow
      switch (filter) {
        case "positive":
          return `${baseStyle} bg-green-500 text-white shadow-md shadow-green-500/30`;
        case "negative":
          return `${baseStyle} bg-red-500 text-white shadow-md shadow-red-500/30`;
        case "neutral":
          return `${baseStyle} bg-slate-600 text-white shadow-md shadow-slate-600/30`;
        default: // 'all'
          return `${baseStyle} bg-blue-600 text-white shadow-md shadow-blue-500/30`;
      }
    } else {
      // Inactive state:
      return `${baseStyle} bg-slate-900/60 hover:bg-slate-700/80 text-slate-300 hover:text-slate-100`;
    }
  };

  // --- Effects ---

  /**
   * Effect to listen for clicks outside the download dropdown to close it.
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadButtonRef.current &&
        !downloadButtonRef.current.contains(event.target as Node)
      ) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [downloadButtonRef]);

  // --- Render ---
  return (
    <section className="w-full max-w-6xl mt-12">
      <h2 className="text-3xl font-bold text-blue-400 mb-6 text-center">
        Analysis Results
      </h2>

      {/* --- Charts Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Pie Chart: Distribution */}
        <div className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-slate-100 mb-4 text-center">
            Distribution (%)
          </h3>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          (
                            entry.name as string
                          ).toLowerCase() as keyof typeof COLORS
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${value} (${(
                      (Number(value) / results.length) *
                      100
                    ).toFixed(1)}%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Legend wrapperStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Counts */}
        <div className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-slate-100 mb-4 text-center">
            Counts
          </h3>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" tick={{ fill: "#cbd5e0" }} />
                <YAxis allowDecimals={false} tick={{ fill: "#cbd5e0" }} />
                <Tooltip
                  cursor={{ fill: "rgba(100, 116, 139, 0.2)" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="value" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          (
                            entry.name as string
                          ).toLowerCase() as keyof typeof COLORS
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* --- End Charts Section --- */}

      {/* --- Results Table Section --- */}
      <div className="w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Table Header: Filters & Download */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 border-b border-slate-700">
          {/* Filter Buttons */}
          <div className="flex flex-wrap mb-4 sm:mb-0">
            <button
              onClick={() => handleFilterChange("all")}
              className={getFilterButtonStyle("all")}
            >
              All ({results.length})
            </button>
            <button
              onClick={() => handleFilterChange("positive")}
              className={getFilterButtonStyle("positive")}
            >
              Positive ({sentimentCounts.positive})
            </button>
            <button
              onClick={() => handleFilterChange("negative")}
              className={getFilterButtonStyle("negative")}
            >
              Negative ({sentimentCounts.negative})
            </button>
            <button
              onClick={() => handleFilterChange("neutral")}
              className={getFilterButtonStyle("neutral")}
            >
              Neutral ({sentimentCounts.neutral})
            </button>
          </div>

          {/* Download Dropdown */}
          <div className="relative" ref={downloadButtonRef}>
            <button
              onClick={() => setShowDownloadOptions(!showDownloadOptions)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all duration-300 shrink-0 flex items-center shadow-lg hover:shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none"
            >
              Download CSV
              <svg
                className="w-4 h-4 ml-2 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </button>
            {showDownloadOptions && (
              <ul className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-2xl z-10 py-1 border border-slate-700">
                <li
                  onClick={() => handleDownloadCSV("all")}
                  className="px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Download All ({results.length})
                </li>
                {sentimentCounts.positive > 0 && (
                  <li
                    onClick={() => handleDownloadCSV("positive")}
                    className="px-4 py-2 text-sm text-green-400 hover:bg-slate-700 cursor-pointer"
                  >
                    Download Positive ({sentimentCounts.positive})
                  </li>
                )}
                {sentimentCounts.negative > 0 && (
                  <li
                    onClick={() => handleDownloadCSV("negative")}
                    className="px-4 py-2 text-sm text-red-400 hover:bg-slate-700 cursor-pointer"
                  >
                    Download Negative ({sentimentCounts.negative})
                  </li>
                )}
                {sentimentCounts.neutral > 0 && (
                  <li
                    onClick={() => handleDownloadCSV("neutral")}
                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Download Neutral ({sentimentCounts.neutral})
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Table Body */}
        <table className="w-full min-w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Text
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider w-40">
                Sentiment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {currentRows.map((item, index) => (
              <tr key={index} className="hover:bg-slate-800/50">
                <td className="px-6 py-4 whitespace-pre-wrap wrap-break-word text-slate-200">
                  {item.text}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getSentimentColorClasses(
                      item.sentiment
                    )}`}
                  >
                    {item.sentiment}
                  </span>
                </td>
              </tr>
            ))}
            {currentRows.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-10 text-slate-500">
                  No results found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-700">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages} (Showing {currentRows.length}{" "}
              of {filteredCount} filtered results)
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FileResults;
