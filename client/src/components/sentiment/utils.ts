/**
 * A mapping of sentiment types to their corresponding hex color codes
 * for use in charts (e.g., Recharts).
 */
export const COLORS = {
  positive: "#22c55e", // green-500
  negative: "#ef4444", // red-500
  neutral: "#64748b", // slate-500
  unknown: "#f97316", // orange-500
};

/**
 * Utility function that returns Tailwind CSS classes for styling
 * text or badges based on the sentiment.
 * @param sentiment The sentiment string.
 * @returns A string of Tailwind CSS classes.
 */
export const getSentimentColorClasses = (
  sentiment: "positive" | "negative" | "neutral" | "unknown"
) => {
  switch (sentiment) {
    case "positive":
      return "bg-green-600/20 text-green-300 border border-green-500/30";
    case "negative":
      return "bg-red-600/20 text-red-300 border border-red-500/3M0";
    default:
      // Covers "neutral" and "unknown"
      return "bg-slate-700/60 text-slate-200 border border-slate-600/80";
  }
};
