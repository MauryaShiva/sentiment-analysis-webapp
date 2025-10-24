import React from "react";
import type { SentimentResult } from "./types";
import { getSentimentColorClasses } from "./utils";

// Define the props for this component
type SingleTextResultProps = {
  result: SentimentResult;
};

const SingleTextResult: React.FC<SingleTextResultProps> = ({ result }) => {
  return (
    <section className="w-full max-w-2xl mt-12 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">
        Analysis Result:
      </h2>
      <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-xl">
        <p className="text-lg text-slate-200 mb-6 wrap-break-word text-center">
          "{result.text}"
        </p>
        <div className="flex justify-center">
          <span
            className={`px-4 py-2 text-lg font-medium rounded-lg ${getSentimentColorClasses(
              result.sentiment
            )}`}
          >
            {result.sentiment}
          </span>
        </div>
      </div>
    </section>
  );
};

export default SingleTextResult;
