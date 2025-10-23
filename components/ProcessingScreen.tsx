
import React from 'react';

const ProcessingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center h-[60vh]">
       <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-cyan-400 mb-8"></div>
      <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4">AI Magic in Progress...</h2>
      <p className="text-lg text-gray-300">Our AI is analyzing your product, generating the perfect image, and crafting your listing. This might take a moment.</p>
    </div>
  );
};

export default ProcessingScreen;
