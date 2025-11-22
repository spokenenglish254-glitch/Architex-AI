import React, { useState } from 'react';
import { generateBillOfQuantities } from '../services/geminiService';
import type { BillOfQuantitiesCategory } from '../types';
import { Card, CardHeader } from './Card';
import { Loader } from './Loader';
import { BillOfQuantitiesIcon } from './icons/BillOfQuantitiesIcon';

const exampleBrief = 'Design a modern, sustainable, two-story single-family home in a temperate climate. It should have 3 bedrooms, 2.5 bathrooms, an open-concept living area, large windows for natural light, and a rooftop garden. The total area is approximately 200 square meters. The budget is moderate, and the clients value low-maintenance materials.';

const currencies = [ 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'PKR' ];

const BillOfQuantities: React.FC = () => {
  const [brief, setBrief] = useState<string>(exampleBrief);
  const [currency, setCurrency] = useState<string>('USD');
  const [boq, setBoq] = useState<BillOfQuantitiesCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!brief.trim()) {
      setError('Please enter a project brief to generate a Bill of Quantities.');
      return;
    }
    setLoading(true);
    setError(null);
    setBoq([]);
    try {
      const result = await generateBillOfQuantities(brief, currency);
      setBoq(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = boq.reduce((total, category) => {
    return total + category.items.reduce((categoryTotal, item) => {
      return categoryTotal + item.estimatedCost;
    }, 0);
  }, 0);

  return (
    <Card>
      <CardHeader 
        title="Bill of Quantities (BoQ) Generator"
        description="Provide a project brief to generate an estimated bill of quantities, including items, quantities, and costs."
        icon={<BillOfQuantitiesIcon />}
      />

      <div className="space-y-4">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Enter project brief here..."
          className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
          disabled={loading}
        />
        <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
                <label htmlFor="currency-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                </label>
                <select
                    id="currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={loading}
                    className="w-full sm:w-auto h-12 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                >
                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <button
                onClick={handleGenerate}
                disabled={loading || !brief.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-md flex-grow sm:flex-grow-0"
            >
                {loading ? 'Generating...' : 'Generate BoQ'}
            </button>
        </div>
      </div>

      {error && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
      
      {loading && <Loader text="Generating Bill of Quantities with Gemini Pro..." />}

      {boq.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold mb-4">Estimated Bill of Quantities</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-6 py-3">Item</th>
                  <th scope="col" className="px-6 py-3">Description</th>
                  <th scope="col" className="px-6 py-3 text-right">Quantity</th>
                  <th scope="col" className="px-6 py-3">Unit</th>
                  <th scope="col" className="px-6 py-3 text-right">Estimated Cost ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {boq.map((category, catIndex) => (
                  <React.Fragment key={catIndex}>
                    <tr className="bg-slate-200 dark:bg-slate-800">
                      <td colSpan={5} className="px-6 py-3 font-bold text-slate-800 dark:text-slate-100">{category.category}</td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="bg-white border-b dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{item.item}</td>
                        <td className="px-6 py-4">{item.description}</td>
                        <td className="px-6 py-4 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4">{item.unit}</td>
                        <td className="px-6 py-4 text-right font-mono">
                           {item.estimatedCost.toLocaleString(undefined, { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex justify-between items-center">
            <span className="text-lg font-bold text-primary-800 dark:text-primary-200">Total Estimated Cost</span>
            <span className="text-2xl font-bold font-mono text-primary-900 dark:text-primary-100">
              {totalCost.toLocaleString(undefined, { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BillOfQuantities;