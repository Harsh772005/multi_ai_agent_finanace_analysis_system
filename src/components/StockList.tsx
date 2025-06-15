import React from 'react';
import { StockData } from '@/lib/langgraph';

interface StockListProps {
  data: StockData[];
}

const StockList: React.FC<StockListProps> = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Data List</h3>
      <ul className="divide-y divide-gray-200">
        {data.map((item, index) => (
          <li key={index} className="py-3 flex justify-between items-center">
            <span className="font-medium text-gray-900">{item.symbol}</span>
            <span className="text-gray-900">Price: ${item.price.toFixed(2)}</span>
            <span className="text-gray-700">Volume: {item.volume.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StockList; 