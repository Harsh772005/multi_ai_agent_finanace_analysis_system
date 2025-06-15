import React from 'react';

const DataRenderer: React.FC<{ data: any; format?: string }> = ({ data, format }) => {
  if (!data) return null;
  if (format === 'list') {
    return (
      <ul className="bg-gray-50 p-4 rounded text-black shadow-md">
        {data.map((row: any, i: number) => (
          <li key={i} className="mb-1">
            <b>{row.month}:</b> Revenue ${row.revenue}, Expenses ${row.expenses}
          </li>
        ))}
      </ul>
    );
  }
  if (format === 'chart') {
    // Simple bar chart using divs
    const max = Math.max(...data.map((d: any) => Math.max(d.revenue, d.expenses)));
    return (
      <div className="bg-gray-50 p-4 rounded text-black shadow-md">
        <div className="mb-2 font-bold">Monthly Revenue & Expenses</div>
        {data.map((row: any, i: number) => (
          <div key={i} className="flex items-center mb-1">
            <span className="w-12 inline-block">{row.month}</span>
            <div className="flex-1 flex gap-2">
              <div
                className="bg-green-400 h-4 rounded"
                style={{ width: `${(row.revenue / max) * 100}%`, minWidth: 10 }}
                title={`Revenue: $${row.revenue}`}
              />
              <div
                className="bg-red-400 h-4 rounded"
                style={{ width: `${(row.expenses / max) * 100}%`, minWidth: 10 }}
                title={`Expenses: $${row.expenses}`}
              />
            </div>
            <span className="ml-2 text-xs">${row.revenue} / ${row.expenses}</span>
          </div>
        ))}
      </div>
    );
  }
  // Default: table
  return (
    <table className="min-w-[300px] bg-gray-50 rounded text-black shadow-md">
      <thead>
        <tr>
          <th className="px-2 py-1 text-left font-bold">Month</th>
          <th className="px-2 py-1 text-left font-bold">Revenue</th>
          <th className="px-2 py-1 text-left font-bold">Expenses</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i} className="border-t border-gray-200">
            <td className="px-2 py-1 font-medium">{row.month}</td>
            <td className="px-2 py-1">${row.revenue}</td>
            <td className="px-2 py-1">${row.expenses}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DataRenderer; 