// Chart colors
export const COLORS = {
  positive: "#22c55e", // Green-500
  negative: "#ef4444", // Red-500
  neutral: "#64748b", // Slate-500 (UPDATED from gray)
  unknown: "#f97316", // Orange-500
};

// Helper function to provide color-coded CSS classes based on sentiment
export const getSentimentColorClasses = (
  sentiment: "positive" | "negative" | "neutral" | "unknown"
) => {
  switch (sentiment) {
    case "positive":
      // UPDATED: Added border and bg-opacity
      return "bg-green-600/20 text-green-300 border border-green-500/30";
    case "negative":
      // UPDATED: Added border and bg-opacity
      return "bg-red-600/20 text-red-300 border border-red-500/30";
    default:
      // UPDATED: Changed to slate colors, added border and bg-opacity
      return "bg-slate-700/60 text-slate-200 border border-slate-600/80";
  }
};
