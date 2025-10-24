import React from "react";

// Defining the props for this component
type ErrorDisplayProps = {
  error: string | null;
};

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  // If there is no error (or it's null), don't render anything
  if (!error) {
    return null;
  }

  return (
    <div className="mt-6 w-full bg-red-600/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-center">
      <p className="font-medium">{error}</p>
    </div>
  );
};

export default ErrorDisplay;
