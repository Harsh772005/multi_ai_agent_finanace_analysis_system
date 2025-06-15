"use client";
import React from 'react';
import { FormatType } from '@/lib/langgraph';

interface FormatClarifierProps {
  options: FormatType[];
  onSelect: (format: FormatType) => void;
}

const FormatClarifier: React.FC<FormatClarifierProps> = ({ options, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-2 self-start">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-semibold hover:bg-blue-600 transition-colors shadow-md"
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default FormatClarifier; 