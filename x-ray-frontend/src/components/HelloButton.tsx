/**
 * HelloButton component
 * Button that calls the AppSync getHello query and displays the response
 */

import { useState } from 'react';
import { callGetHello } from '../services/appsync';
import type { HelloResponse } from '../types';

export interface HelloButtonProps {
  onSuccess?: (response: HelloResponse) => void;
  onError?: (error: Error) => void;
}

export const HelloButton: React.FC<HelloButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await callGetHello();
      setResponse(data);
      onSuccess?.(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      const error = err instanceof Error ? err : new Error(errorMessage);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <button
        onClick={() => {
          void handleClick();
        }}
        disabled={loading}
        className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 text-lg"
        aria-label="Call getHello endpoint"
      >
        {loading ? 'Loading...' : 'Call getHello'}
      </button>

      {error !== null && (
        <div
          className="w-full p-4 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
        >
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {response !== null && (
        <div className="w-full p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-green-800 font-semibold mb-3 text-lg">
            Response
          </h3>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="font-medium text-green-700 min-w-[100px]">
                Message:
              </span>
              <span className="text-green-900">{response.message}</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-green-700 min-w-[100px]">
                Timestamp:
              </span>
              <span className="text-green-900 font-mono text-sm">
                {response.timestamp}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
