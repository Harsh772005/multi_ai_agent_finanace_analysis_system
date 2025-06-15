"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AgentResponse, Message, FormatType, StockData, VisualizationHistoryItem } from '@/lib/langgraph';
import ChatWindow from '@/components/ChatWindow';
import VisualizationPane from '@/components/VisualizationPane';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State for format clarification
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [clarifyOptions, setClarifyOptions] = useState<FormatType[] | null>(null);

  // New state to track if we are clarifying data (e.g., companies/metrics)
  const [isClarifyingData, setIsClarifyingData] = useState<boolean>(false);
  const [dataClarifyOptions, setDataClarifyOptions] = useState<string[] | null>(null); // Changed to null

  // State for visualization history
  const [visualizationHistory, setVisualizationHistory] = useState<VisualizationHistoryItem[]>([]);

  // Consolidated useEffect for session and message loading
  useEffect(() => {
    // Attempt to load session ID from local storage
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      console.log('Frontend: Loaded session ID from local storage:', storedSessionId);
      // Fetch history for the loaded session ID
      fetchHistory(storedSessionId);
    } else {
      console.log('Frontend: No session ID found in local storage.');
    }
  }, []); // Run once on component mount

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll to bottom whenever messages change

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHistory = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/message?sessionId=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }
      const data: { history: Message[] | undefined; visualizationHistory: VisualizationHistoryItem[] | undefined | null } = await response.json();
      if (data.history) {
        setMessages(data.history);
        console.log('Frontend: Fetched history for session:', id, 'length:', data.history.length);
      } else {
        console.log('Frontend: No history found for session:', id);
      }
      // Update to use visualizationHistory
      if (data.visualizationHistory) {
        setVisualizationHistory(data.visualizationHistory);
        console.log('Frontend: Loaded visualization history for session:', id, 'length:', data.visualizationHistory.length);
      } else {
        setVisualizationHistory([]); // Initialize as empty array if not found
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Failed to load chat history.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageContent: string, selectedFormat?: FormatType, selectedDataQuery?: string) => {
    setError(null);
    setIsLoading(true);
    // DO NOT clear clarifyOptions or isClarifying immediately here.
    // They should only be cleared or updated based on the *response* from the backend.
    // This allows clarification buttons to persist while the API call is in progress
    // or if the graph needs further input.

    console.log('Frontend: sendMessage called with:', { messageContent, selectedFormat, selectedDataQuery });

    const userMessage: Message = { role: 'user', content: messageContent };
    // Only add user message to history if it's a new input, not a clarification click (format or data)
    if (!selectedFormat && !selectedDataQuery) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setInput('');

    const payload = {
      message: (selectedFormat || selectedDataQuery) ? undefined : messageContent, // Only send message if it's new user input
      sessionId,
      selection: selectedFormat, // Send format selection if available
      dataQuery: selectedDataQuery, // Send data query if available
    };
    console.log('Frontend: Sending payload to /api/message:', JSON.stringify(payload));

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      console.log('Frontend: Sent POST request to /api/message with sessionId:', sessionId, 'and messageContent:', messageContent, 'selectedFormat:', selectedFormat, 'selectedDataQuery:', selectedDataQuery);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      const data: { sessionId: string; response: AgentResponse; history: Message[] } = await response.json();
      console.log('Frontend: Received response from API. New sessionId:', data.sessionId, 'History length:', data.history.length, 'Response:', JSON.stringify(data.response, null, 2));
      setSessionId(data.sessionId);
      localStorage.setItem('sessionId', data.sessionId); // Save new or updated session ID
      setMessages(data.history); // Update with history from backend

      // --- IMPORTANT: Handle clarification states based on backend response ---
      if (data.response.type === 'clarify') {
        // Check if options array exists and is not empty (for format clarification)
        if (data.response.options && data.response.options.length > 0) {
          setIsClarifying(true);
          setClarifyOptions(data.response.options as FormatType[]);
          setIsClarifyingData(false); // Ensure data clarification is off
          setDataClarifyOptions(null); // No data options here
          console.log('Frontend: Backend requested format clarification. isClarifying=true.');
        } else {
          // This path means it's a data clarification (asking for typed input, no specific options buttons)
          setIsClarifying(false); // Turn off format clarification
          setClarifyOptions(null); // No format options here
          setIsClarifyingData(true);
          setDataClarifyOptions(null); // No data options buttons for typed input
          console.log('Frontend: Backend requested data clarification. isClarifyingData=true. Options: (none expected)');
        }
      } else {
        // If not clarify type, then reset all clarification states
        setIsClarifying(false);
        setClarifyOptions(null);
        setIsClarifyingData(false);
        setDataClarifyOptions(null);
        console.log('Frontend: Backend did not request clarification. All clarification states cleared.');
      }

      if (data.response.type === 'data') {
        // Append new visualization to history
        setVisualizationHistory(prev => [...prev, {
          type: 'data',
          format: data.response.format as FormatType,
          data: data.response.data as StockData[],
          content: data.response.content || '',
          timestamp: new Date().toISOString(),
        }]);
      } else if (data.response.type === 'general') {
        // For general responses, we don't add to visualization history
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'An unexpected error occurred.');
      // Ensure loading state is reset even on error
      setIsLoading(false);
      // If error, also clear all clarifying states to allow user to try again
      setIsClarifying(false);
      setClarifyOptions(null); // Changed to null for consistency
      setIsClarifyingData(false);
      setDataClarifyOptions(null); // Changed to null for consistency
      setVisualizationHistory([]); // Clear visualization history on error
    } finally {
      setIsLoading(false); // Ensure loading state is always reset
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // Determine if this is a response to data clarification
      if (isClarifyingData) {
        sendMessage(input.trim(), undefined, input.trim()); // Send input as dataQuery
      } else {
        sendMessage(input.trim()); // Normal message
      }
    }
  };

  const handleClarifySelection = (selection: FormatType) => {
    console.log('Frontend: handleClarifySelection (format) called with selection:', selection);
    sendMessage('', selection); // Send selected format
  };

  const handleDataClarifySelection = (dataQuery: string) => {
    console.log('Frontend: handleDataClarifySelection (data) called with dataQuery:', dataQuery);
    sendMessage('', undefined, dataQuery); // Send selected data query
  };

  const handleResetChat = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Frontend: Initiating chat reset.");

    try {
      // Make API call to backend to clear session history
      const response = await fetch('/api/message', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }), // Send current sessionId to clear
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear session history.');
      }

      console.log("Frontend: Session history cleared on backend.");
      // Clear frontend states
      setMessages([]);
      setVisualizationHistory([]); // Clear visualization history
      setIsClarifying(false);
      setClarifyOptions(null);
      setIsClarifyingData(false);
      setDataClarifyOptions(null);
      localStorage.removeItem('sessionId'); // Remove from local storage
      setSessionId(null); // Clear current sessionId state
      console.log("Frontend: Chat history cleared and session ID removed.");
    } catch (err: any) {
      console.error("Error resetting chat:", err);
      setError(err.message || 'Failed to reset chat.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-50 font-sans antialiased text-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Placeholder for Logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-blue-200"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.504 1.161h1.12c.311 0 .616.05.908.147l.034.01c.294.098.575.234.84.407.265.174.51.38.734.618.224.238.423.493.593.77a2.843 2.843 0 01.374.839c.097.291.146.596.146.908v.113c0 .311-.05.616-.147.908l-.01.034a2.871 2.871 0 01-.407.84c-.174.265-.38.51-.618.734-.238.224-.493.423-.77.593a2.843 2.843 0 01-.839.374c-.291.097-.596.146-.908.146h-.113c-.311 0-.616-.05-.908-.147l-.034-.01a2.871 2.871 0 01-.84-.407c-.265-.174-.51-.38-.734-.618-.238-.224-.423-.493-.593-.77a2.843 2.843 0 01-.374-.839c-.097-.291-.146-.596-.146-.908v-.113c0-.311.05-.616.147-.908l.01-.034a2.871 2.871 0 01.407-.84c.174-.265.38-.51.618-.734.238-.224.493-.423.77-.593a2.843 2.843 0 01.839-.374c.291-.097.596-.146.908-.146zm4.996 4.996a1 1 0 00-1.414 0L10 10.586 6.914 7.501a1 1 0 00-1.414 1.414l3.086 3.086-3.086 3.086a1 1 0 001.414 1.414L10 13.414l3.086 3.086a1 1 0 001.414-1.414L11.414 12l3.086-3.086a1 1 0 000-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <h1 className="text-3xl font-extrabold tracking-tight">Multi-AI Agent Financial Analysis</h1>
          </div>
          {/* Reset Chat Button */}
          <button
            onClick={handleResetChat}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            aria-label="Reset Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 12c0 2.21.817 4.227 2.138 5.75L6 18h-.043m.444-4h.087l-.023.003h.001m.002 0l-.001.002H6m.001 0a2 2 0 11-4 0 2 2 0 014 0zm0 0h.087a2 2 0 01-4 0h-.087zm.444 4h.087l-.023.003h.001m.002 0l-.001.002H6m.001 0a2 2 0 11-4 0 2 2 0 014 0zM20 10V5h-5" />
            </svg>
            <span>Reset Chat</span>
          </button>
          {/* You can add navigation links or other elements here */}
        </div>
      </header>

      <main className="flex flex-col md:flex-row flex-1 p-4 md:p-8 gap-4 md:gap-8 overflow-hidden container mx-auto">
        {/* Left Pane: Chat Window */}
        <div className="flex flex-col w-full md:w-1/2 bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-blue-100 transition-all duration-300 ease-in-out transform hover:scale-[1.005] focus-within:scale-[1.005] focus-within:ring-blue-300">
          <ChatWindow
            messages={messages}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            handleClarifySelection={handleClarifySelection}
            isLoading={isLoading}
            error={error}
            messagesEndRef={messagesEndRef}
            isClarifying={isClarifying}
            clarifyOptions={clarifyOptions}
            isClarifyingData={isClarifyingData}
            dataClarifyOptions={dataClarifyOptions}
            handleDataClarifySelection={handleDataClarifySelection}
          />
        </div>

        {/* Right Pane: Visualization */}
        <div className="flex flex-col w-full md:w-1/2 bg-white rounded-xl shadow-2xl p-4 ring-1 ring-blue-100 transition-all duration-300 ease-in-out transform hover:scale-[1.005] focus-within:scale-[1.005] focus-within:ring-blue-300">
          <VisualizationPane visualizationHistory={visualizationHistory} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 p-4 mt-auto shadow-inner">
        <div className="container mx-auto text-center text-sm">
          © {new Date().getFullYear()} Multi-AI Agent Financial Analysis. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 