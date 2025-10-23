
import React from 'react';

interface WelcomeScreenProps {
  onGoLive: () => void;
  error: string | null;
}

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a2 2 0 010 3.1l-4.55 2.55M4 12h11M4 6h11M4 18h11" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
  </svg>
);


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoLive, error }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center min-h-[50vh] p-8 bg-gray-800 rounded-3xl shadow-2xl border border-gray-700">
      <CameraIcon />
      <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Sell Live AI Assistant</h1>
      <p className="text-lg text-gray-300 max-w-2xl mb-8">
        No more boring forms. Just show your product, describe it out loud, and let our AI create a perfect e-commerce listing for you.
      </p>
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 max-w-md w-full" role="alert">
          <strong className="font-bold">Oops! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <button
        onClick={onGoLive}
        className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-full hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-cyan-300 transform hover:scale-105 transition-transform duration-300 ease-in-out text-xl shadow-lg"
      >
        Go Live to Sell
      </button>
    </div>
  );
};

export default WelcomeScreen;
