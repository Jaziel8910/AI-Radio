import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface LoaderProps {
  text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 h-64">
      <LoaderCircle className="w-16 h-16 animate-spin text-purple-400" />
      <p className="mt-6 text-lg font-medium text-slate-200">{text}</p>
      <p className="text-sm text-slate-400">Tu sesión estará lista en un momento...</p>
    </div>
  );
};

export default Loader;