import React from 'react';
import { X, AlertCircle } from 'lucide-react';

export const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, type = "button", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-azuri-600 text-white hover:bg-azuri-700 shadow-md shadow-azuri-200",
    secondary: "bg-white text-azuri-600 border border-azuri-100 hover:bg-azuri-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    google: "bg-gray-900 text-white border border-gray-900 hover:bg-gray-800"
  };

  return (
    <button onClick={onClick} type={type} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
    {children}
  </div>
);

export const Input = ({ label, error, onChange, ...props }) => {
  const handleChange = (e) => {
    if (e.target.value && e.target.value.length > 0) {
      e.target.value = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
    }
    onChange && onChange(e);
  };

  return (
    <div className="flex flex-col gap-1 mb-3">
      {label && <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>}
      <input
        className={`w-full p-3 rounded-lg border focus:ring-2 outline-none transition-all text-sm disabled:bg-gray-50 disabled:text-gray-500 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-200 focus:border-azuri-500 focus:ring-azuri-100'}`}
        onChange={handleChange}
        autoCapitalize="sentences"
        spellCheck={true}
        {...props}
      />
      {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {error}</span>}
    </div>
  );
};

export const Modal = ({ title, onClose, children }) => (
  <div
    className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 relative"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
        <h3 className="font-bold text-lg text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  </div>
);

export const DataTable = ({ columns, data, onDelete, onRowClick }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-gray-100">
          {columns.map((col, i) => (
            <th key={i} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase bg-gray-50 first:rounded-l-lg last:rounded-r-lg">
              {col.header}
            </th>
          ))}
          <th className="py-3 px-4 bg-gray-50 rounded-r-lg"></th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1} className="py-8 text-center text-gray-400 text-sm">
              Nenhum registro encontrado.
            </td>
          </tr>
        ) : (
          data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-b border-gray-50 hover:bg-azuri-50/50 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, i) => (
                <td key={i} className="py-3 px-4 text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
              <td className="py-3 px-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete && onDelete(row.id);
                  }}
                  className="text-red-400 hover:text-red-600 transition-colors p-2"
                >
                  <X size={18} />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);