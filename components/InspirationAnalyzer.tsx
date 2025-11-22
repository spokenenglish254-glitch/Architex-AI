
import React, { useState, useCallback } from 'react';
import { analyzeImage, redesignImage } from '../services/geminiService';
import type { ImageAnalysis } from '../types';
import { Card, CardHeader } from './Card';
import { Loader } from './Loader';
import { ImageIcon } from './icons/ImageIcon';
import { MagicIcon } from './icons/MagicIcon';

const InspirationAnalyzer: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Redesign State
  const [showRedesign, setShowRedesign] = useState<boolean>(false);
  const [redesignPrompt, setRedesignPrompt] = useState<string>('');
  const [isRedesigning, setIsRedesigning] = useState<boolean>(false);
  const [redesignedImageUrl, setRedesignedImageUrl] = useState<string | null>(null);
  const [redesignError, setRedesignError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1000 * 1024 * 1024) { // 1000MB limit
          setError('Image size should not exceed 1000MB.');
          return;
      }
      setError(null);
      setImageFile(file);
      setAnalysis(null);
      setRedesignedImageUrl(null);
      setShowRedesign(false);
      setRedesignPrompt('');
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImageBase64(base64String);
        setPreviewUrl(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError('Please select an image to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    // Reset redesign state when analyzing a new image or re-analyzing
    setRedesignedImageUrl(null);
    setShowRedesign(false);
    
    try {
      if (imageFile) {
        const result = await analyzeImage(imageBase64, imageFile.type);
        setAnalysis(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRedesign = async () => {
      if (!imageBase64 || !redesignPrompt.trim()) {
          setRedesignError("Please provide instructions for the redesign.");
          return;
      }
      setIsRedesigning(true);
      setRedesignError(null);
      setRedesignedImageUrl(null);

      try {
          // Default to jpeg if file type unknown, though it should be known from imageFile
          const mimeType = imageFile?.type || 'image/jpeg';
          const resultUrl = await redesignImage(imageBase64, mimeType, redesignPrompt);
          setRedesignedImageUrl(resultUrl);
      } catch (err) {
          setRedesignError(err instanceof Error ? err.message : 'An unknown error occurred during redesign.');
      } finally {
          setIsRedesigning(false);
      }
  };

  const AnalysisSection: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
    <div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item, index) => 
            <li key={index} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-1 rounded-full">{item}</li>
        )}
      </ul>
    </div>
  );

  return (
    <Card>
       <CardHeader 
        title="Inspiration Analyzer"
        description="Upload an image of a building or interior to identify its style, features, and palette."
        icon={<ImageIcon />}
      />

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <label htmlFor="image-upload" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Upload Image (Max 1000MB)
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            disabled={loading}
          />
          {previewUrl && (
            <div className="mt-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-2">
              <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-contain rounded" />
            </div>
          )}
          <button
            onClick={handleAnalyze}
            disabled={loading || !imageBase64}
            className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {loading ? 'Analyzing...' : 'Analyze Image'}
          </button>
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>

        <div className="min-h-[200px]">
          {loading && <Loader text="Analyzing image with Gemini Flash..."/>}
          {analysis && !loading && (
            <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Architectural Style</h3>
                <p className="text-primary-600 dark:text-primary-300 font-bold text-xl">{analysis.architecturalStyle}</p>
              </div>
               <AnalysisSection title="Key Features" items={analysis.keyFeatures} />
               <AnalysisSection title="Color Palette" items={analysis.colorPalette} />
               <AnalysisSection title="Potential Materials" items={analysis.potentialMaterials} />
               
               {/* Redesign Trigger */}
               <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                   {!showRedesign ? (
                       <button 
                         onClick={() => setShowRedesign(true)}
                         className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-medium"
                       >
                           <MagicIcon />
                           <span>Redesign this Area</span>
                       </button>
                   ) : (
                       <div className="space-y-4 animate-fadeIn">
                           <div className="flex items-center justify-between">
                               <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                   <MagicIcon /> Redesign
                               </h4>
                               <button onClick={() => setShowRedesign(false)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                           </div>
                           
                           <p className="text-sm text-slate-500 dark:text-slate-400">
                               Describe how you want to change the style, materials, or atmosphere while keeping the structure similar.
                           </p>
                           
                           <textarea 
                               value={redesignPrompt}
                               onChange={(e) => setRedesignPrompt(e.target.value)}
                               placeholder="e.g., 'Change to a minimalist Scandinavian style with light oak wood and white walls' or 'Make it look like a cyberpunk office'"
                               className="w-full h-24 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-sm"
                           />
                           
                           <button
                                onClick={handleRedesign}
                                disabled={isRedesigning || !redesignPrompt.trim()}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors font-medium"
                           >
                               {isRedesigning ? 'Generating Design...' : 'Generate Redesign'}
                           </button>
                           
                           {isRedesigning && <Loader text="Redesigning space with Gemini..." />}
                           
                           {redesignError && (
                               <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">{redesignError}</p>
                           )}
                           
                           {redesignedImageUrl && (
                               <div className="mt-4 space-y-2">
                                   <p className="font-medium text-slate-700 dark:text-slate-300">Redesigned Result:</p>
                                   <div className="border-2 border-indigo-200 dark:border-indigo-900 rounded-lg overflow-hidden">
                                       <img src={redesignedImageUrl} alt="Redesigned space" className="w-full h-auto" />
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
               </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default InspirationAnalyzer;
