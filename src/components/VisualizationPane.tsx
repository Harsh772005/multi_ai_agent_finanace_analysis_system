"use client";

import React from 'react';
import { AgentResponse, FormatType, StockData, VisualizationHistoryItem } from '@/lib/langgraph';
import DataTable from './DataTable';
import StockList from './StockList';
import StockChart from './StockChart';

interface VisualizationPaneProps {
  visualizationHistory: VisualizationHistoryItem[];
}

const VisualizationPane: React.FC<VisualizationPaneProps> = ({ visualizationHistory }) => {
  if (!visualizationHistory || visualizationHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white/80 rounded-lg shadow-inner p-4 text-center">
        <p className="text-lg">Your financial data visualizations will appear here.</p>
        <p className="text-sm mt-2">Ask me about stock data, and specify if you want a table, chart, or list!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 p-2 custom-scrollbar">
      {visualizationHistory.map((vizItem, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-4 ring-1 ring-gray-100 flex-shrink-0">
          <div className="text-sm text-gray-500 mb-2">{new Date(vizItem.timestamp).toLocaleString()}</div>
          <div className="text-lg font-semibold mb-2">{vizItem.content || `Visualization (${vizItem.format})`}</div>
          {
            (() => {
              switch (vizItem.format) {
                case 'table':
                  return vizItem.data ? <DataTable data={vizItem.data} /> : <p className="text-red-500">No data for table.</p>;
                case 'chart':
                  return vizItem.data ? <StockChart data={vizItem.data} /> : <p className="text-red-500">No data for chart.</p>;
                case 'list':
                  return vizItem.data ? <StockList data={vizItem.data} /> : <p className="text-red-500">No data for list.</p>;
                default:
                  return <p className="text-red-500">Unknown visualization format.</p>;
              }
            })()
          }
        </div>
      ))}
    </div>
  );
};

export default VisualizationPane; 