"use client";
import React, { useRef, useEffect, useState, Dispatch, SetStateAction, FormEvent } from 'react';
import MessageBubble from './MessageBubble';
import FormatClarifier from './FormatClarifier';
import { Message, FormatType, StockData } from '@/lib/langgraph';
import { format } from 'date-fns';

interface ChatWindowProps {
  messages: Message[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: FormEvent) => void;
  handleClarifySelection: (selection: FormatType) => void;
  isLoading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isClarifying: boolean;
  clarifyOptions: FormatType[] | null;
  isClarifyingData: boolean;
  dataClarifyOptions: string[] | null;
  handleDataClarifySelection: (dataQuery: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  input,
  setInput,
  handleSubmit,
  handleClarifySelection,
  isLoading,
  error,
  messagesEndRef,
  isClarifying,
  clarifyOptions,
  isClarifyingData,
  dataClarifyOptions,
  handleDataClarifySelection,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isClarifying || isClarifyingData) {
      inputRef.current?.focus();
    }
  }, [isClarifying, isClarifyingData]);

  const isBotMessage = (message: Message) => message.role === 'bot';

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-gray-50 to-gray-100 rounded-t-xl custom-scrollbar">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${isBotMessage(msg) ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 shadow-md ${isBotMessage(msg)
                ? 'bg-blue-100 text-blue-900 rounded-bl-none'
                : 'bg-indigo-500 text-white rounded-br-none'
                }`}
            >
              <p className="font-medium mb-1">{msg.content}</p>
              {msg.timestamp && (
                <span className="text-xs opacity-70 block text-right">
                  {format(new Date(msg.timestamp), 'hh:mm a')}
                </span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-center items-center mt-4 text-blue-600 font-semibold">
            <svg
              className="animate-spin h-5 w-5 mr-3 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Thinking...
          </div>
        )}
        {isClarifying && clarifyOptions && clarifyOptions.length > 0 && (
          <div className="flex justify-center space-x-2 mt-4 flex-wrap gap-2">
            {clarifyOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleClarifySelection(option)}
                className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
                disabled={isLoading}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        )}
        {isClarifyingData && dataClarifyOptions && dataClarifyOptions.length > 0 && (
          <div className="flex justify-center space-x-2 mt-4 flex-wrap gap-2">
            {dataClarifyOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleDataClarifySelection(option)}
                className="px-6 py-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                disabled={isLoading}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} className="pb-4" />
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4"
          role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex p-4 border-t border-gray-100 bg-white backdrop-blur-sm sticky bottom-0 z-10 w-full">
        <input
          className="flex-1 px-4 py-3 border border-gray-200 rounded-full mr-3 text-lg focus:outline-none focus:ring-3 focus:ring-blue-300 transition-all duration-200 shadow-sm bg-white text-gray-800 placeholder-gray-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isClarifyingData ? "Type company name or financial metric..." : "Ask me about financial data..."}
          disabled={isLoading}
          ref={inputRef}
        />
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-lg"
          disabled={isLoading || (!input.trim() && !isClarifyingData && !isClarifying)}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow; 