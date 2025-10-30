import React from "react";

/**
 * Defines the props for the ErrorDisplay component.
 */
type ErrorDisplayProps = {
  /** The error message string to display. If null, the component renders nothing. */
  error: string | null;
};

/**
 * A component that renders a formatted error message box.
 * It conditionally renders null (nothing) if the 'error' prop is null or empty.
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  // If the error prop is null or an empty string, render nothing.
  if (!error) {
    return null;
  }

  // Otherwise, display the error message in a styled container.
  return (
    <div className="mt-6 w-full bg-red-600/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-center">
      <p className="font-medium">{error}</p>
    </div>
  );
};

export default ErrorDisplay;
