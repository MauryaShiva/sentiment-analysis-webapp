// This type will be the base for both file upload results (array) and single text results (object)
export type SentimentResult = {
  text: string;
  sentiment: "positive" | "negative" | "neutral" | "unknown";
};

// The result of a file analysis will always be an array
export type FileSentimentResult = SentimentResult[];

// Type for the chart data
export type ChartData = {
  name: string;
  value: number;
};
