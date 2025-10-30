/**
 * Base type for a single sentiment analysis result.
 * Used for both single text analysis and individual rows in a file analysis.
 */
export type SentimentResult = {
  /** The original text that was analyzed. */
  text: string;
  /** The resulting sentiment. */
  sentiment: "positive" | "negative" | "neutral" | "unknown";
};

/**
 * Represents the result of a full file analysis, which is an array of SentimentResult objects.
 */
export type FileSentimentResult = SentimentResult[];

/**
 * Defines the data structure required by Recharts for Pie and Bar charts.
 */
export type ChartData = {
  /** The label for the chart segment (e.g., "Positive", "Negative"). */
  name: string;
  /** The numerical value for the chart segment (e.g., the count). */
  value: number;
};
