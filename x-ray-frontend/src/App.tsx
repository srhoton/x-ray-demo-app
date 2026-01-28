/**
 * Main App component
 * Root component for the X-Ray demo application
 */

import { useEffect, useState } from 'react';
import { HelloButton } from './components/HelloButton';
import { initializeRUM } from './services/rum';
import type { HelloResponse } from './types';

export const App: React.FC = () => {
  const [rumInitialized, setRumInitialized] = useState(false);

  useEffect(() => {
    const rum = initializeRUM();
    setRumInitialized(rum !== null);
  }, []);

  const handleSuccess = (response: HelloResponse) => {
    console.log('Successfully received response:', response);
  };

  const handleError = (error: Error) => {
    console.error('Error calling AppSync:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AWS X-Ray Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Distributed tracing demonstration with CloudWatch RUM, AppSync, and
            Lambda
          </p>
        </header>

        <main className="flex flex-col items-center gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Test Endpoint
              </h2>
              <p className="text-gray-600">
                Click the button below to call the AppSync GraphQL API. The
                request will be traced through CloudWatch RUM, AppSync, Lambda
                Resolver, and the backend Lambda function.
              </p>
            </div>

            <HelloButton onSuccess={handleSuccess} onError={handleError} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              System Status
            </h3>
            <div className="space-y-3">
              <StatusItem
                label="CloudWatch RUM"
                status={rumInitialized ? 'active' : 'not configured'}
                isActive={rumInitialized}
              />
              <StatusItem
                label="AppSync API"
                status="ready"
                isActive={true}
              />
              <StatusItem label="X-Ray Tracing" status="enabled" isActive={true} />
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mt-4">
            <p>View traces in AWS X-Ray Console</p>
            <p className="mt-1">Region: us-west-2</p>
          </div>
        </main>
      </div>
    </div>
  );
};

interface StatusItemProps {
  label: string;
  status: string;
  isActive: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({ label, status, isActive }) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-yellow-500'
          }`}
          aria-label={isActive ? 'Active' : 'Inactive'}
        />
        <span className="text-sm text-gray-600">{status}</span>
      </div>
    </div>
  );
};
