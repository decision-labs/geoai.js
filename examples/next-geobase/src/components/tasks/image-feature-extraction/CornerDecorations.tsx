import React from 'react';

export const CornerDecorations: React.FC = () => {
  return (
    <>
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-green-400/40 rounded-tr-lg"></div>
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-lg"></div>
    </>
  );
};
