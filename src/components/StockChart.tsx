import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockData } from '@/lib/langgraph';

interface StockChartProps {
  data: StockData[];
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md w-full h-80">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Data Chart (Price)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5, right: 30, left: 20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="symbol" tick={{ fill: '#4a5568' }} />
          <YAxis tick={{ fill: '#4a5568' }} />
          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} labelStyle={{ color: '#2d3748' }} />
          <Legend />
          <Bar dataKey="price" fill="#8884d8" name="Price" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart; 