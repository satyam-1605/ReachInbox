import React from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  className = '',
}: TableProps<T>): React.ReactElement {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <table className="w-full text-left text-sm text-gray-700">
        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-6 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIdx) => (
            <tr
              key={keyExtractor(row, rowIdx)}
              className="hover:bg-gray-50/80 transition-colors"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                  {col.render
                    ? col.render(row, rowIdx)
                    : col.accessor
                    ? String(row[col.accessor] ?? '-')
                    : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
