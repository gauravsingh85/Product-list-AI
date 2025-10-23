
import React from 'react';
import type { ResultsData } from '../types';

interface ResultsScreenProps {
  results: ResultsData;
  onReset: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ results, onReset }) => {
  let parsedJson;
  try {
    parsedJson = JSON.parse(results.json);
  } catch (error) {
    parsedJson = { error: "Failed to parse JSON response." };
  }

  return (
    <div className="w-full p-6 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
      <h2 className="text-4xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Your AI-Generated Listing is Ready!</h2>
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Generated Image */}
        <div className="flex flex-col items-center">
          <h3 className="text-2xl font-semibold mb-3 text-cyan-300">Generated Product Image</h3>
          <img 
            src={results.image} 
            alt="AI-generated product" 
            className="rounded-lg shadow-xl w-full object-contain border-2 border-gray-600" 
          />
        </div>

        {/* Extracted Information */}
        <div className="flex flex-col">
          <h3 className="text-2xl font-semibold mb-3 text-cyan-300">Extracted Product Information</h3>
          <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto h-full border border-gray-700">
            <pre className="text-sm text-green-300 whitespace-pre-wrap">
              <code>
                {JSON.stringify(parsedJson, null, 2)}
              </code>
            </pre>
          </div>
        </div>

      </div>
      <div className="text-center mt-8">
        <button
          onClick={onReset}
          className="px-10 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-full hover:from-purple-600 hover:to-indigo-600 focus:outline-none focus:ring-4 focus:ring-purple-300 transform hover:scale-105 transition-transform duration-300 ease-in-out text-lg shadow-lg"
        >
          Create Another Listing
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
