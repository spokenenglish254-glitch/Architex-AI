
import React, { useState } from 'react';
import { suggestMaterials } from '../services/geminiService';
import type { MaterialSuggestion } from '../types';
import { Card, CardHeader } from './Card';
import { Loader } from './Loader';
import { MaterialIcon } from './icons/MaterialIcon';

const MaterialSuggester: React.FC = () => {
  const [criteria, setCriteria] = useState<string>('exterior cladding for a modern home, eco-friendly and durable');
  const [suggestions, setSuggestions] = useState<MaterialSuggestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!criteria.trim()) {
      setError('Please enter some criteria for material suggestions.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await suggestMaterials(criteria);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const FeatureList: React.FC<{ items: string[]; positive?: boolean }> = ({ items, positive = true }) => (
    <ul className="space-y-1 mt-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start">
          <svg className={`flex-shrink-0 h-5 w-5 mr-2 ${positive ? 'text-green-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {positive 
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            }
          </svg>
          <span className="text-slate-600 dark:text-slate-300 text-sm">{item}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader 
        title="Material Suggester"
        description="Describe your needs (e.g., 'low-cost flooring') to get AI-powered material ideas."
        icon={<MaterialIcon />}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="e.g., sustainable roofing, modern interior walls"
          className="flex-grow p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
          disabled={loading}
        />
        <button
          onClick={handleSuggest}
          disabled={loading || !criteria.trim()}
          className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          {loading ? 'Thinking...' : 'Get Ideas'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
      
      {loading && <Loader text="Searching for materials with Gemini Flash..."/>}

      {suggestions.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold mb-4">Material Suggestions</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((mat, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-primary-700 dark:text-primary-300">{mat.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">{mat.description}</p>
                <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-200">Pros:</h5>
                <FeatureList items={mat.pros} positive={true} />
                <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-200 mt-3">Cons:</h5>
                <FeatureList items={mat.cons} positive={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MaterialSuggester;
