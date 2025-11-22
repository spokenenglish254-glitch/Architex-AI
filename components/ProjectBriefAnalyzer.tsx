import React, { useState, useCallback } from 'react';
import { analyzeBrief, generate3dModelImage, generateFloorPlanDiagram, generateElectricalDiagram } from '../services/geminiService';
import { Card, CardHeader } from './Card';
import { Loader } from './Loader';
import type { BriefAnalysis } from '../types';
import { BuildingIcon } from './icons/BuildingIcon';
import { CubeIcon } from './icons/CubeIcon';
import { FrontViewIcon } from './icons/FrontViewIcon';
import { SideViewIcon } from './icons/SideViewIcon';
import { RearViewIcon } from './icons/RearViewIcon';
import { InteriorViewIcon } from './icons/InteriorViewIcon';
import { FloorPlanIcon } from './icons/FloorPlanIcon';
import { ElectricalIcon } from './icons/ElectricalIcon';

interface ViewState {
  loading: boolean;
  imageUrl: string | null;
  error: string | null;
}

type ExteriorViewType = 'front' | 'side' | 'rear';

const initialExteriorViewsState: Record<ExteriorViewType, ViewState> = {
  front: { loading: false, imageUrl: null, error: null },
  side: { loading: false, imageUrl: null, error: null },
  rear: { loading: false, imageUrl: null, error: null },
};


const exampleBriefs = [
  {
    title: 'Modern Family Home',
    brief: 'Design a modern, sustainable, two-story single-family home in a temperate climate. It should have 3 bedrooms, 2.5 bathrooms, an open-concept living area, large windows for natural light, and a rooftop garden. The budget is moderate, and the clients value low-maintenance materials.'
  },
  {
    title: 'Urban Cafe',
    brief: 'Create a design for a small, trendy cafe in a bustling urban neighborhood. The space is long and narrow. It needs a coffee bar, seating for about 20 people, and a small kitchen. The aesthetic should be industrial-chic with exposed brick, warm lighting, and some greenery.'
  },
  {
    title: 'Coastal Retreat',
    brief: 'Conceptualize a luxury coastal retreat home perched on a cliff overlooking the ocean. The design must maximize views with floor-to-ceiling glass walls. Features should include an infinity pool, an expansive deck, 4 master suites, and use natural materials like stone and wood to blend with the environment.'
  }
];

const languages = [
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
  'Arabic', 'Russian', 'Portuguese', 'Hindi', 'Urdu'
];

const ProjectBriefAnalyzer: React.FC = () => {
  const [brief, setBrief] = useState<string>(exampleBriefs[0].brief);
  const [language, setLanguage] = useState<string>('English');
  const [analysis, setAnalysis] = useState<BriefAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for 3D model generation
  const [isGeneratingModel, setIsGeneratingModel] = useState<boolean>(false);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [exteriorViews, setExteriorViews] = useState(initialExteriorViewsState);
  const [interiorViews, setInteriorViews] = useState<Record<string, ViewState>>({});
  
  // State for diagram generation
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState<boolean>(false);
  const [diagramImageUrl, setDiagramImageUrl] = useState<string | null>(null);
  const [diagramError, setDiagramError] = useState<string | null>(null);
  
  // State for electrical diagram generation
  const [isGeneratingElectrical, setIsGeneratingElectrical] = useState<boolean>(false);
  const [electricalImageUrl, setElectricalImageUrl] = useState<string | null>(null);
  const [electricalError, setElectricalError] = useState<string | null>(null);


  const handleAnalyze = async () => {
    if (!brief.trim()) {
      setError('Please enter a project brief to analyze.');
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setModelImageUrl(null);
    setModelError(null);
    setExteriorViews(initialExteriorViewsState);
    setInteriorViews({});
    setDiagramImageUrl(null);
    setDiagramError(null);
    setElectricalImageUrl(null);
    setElectricalError(null);
    try {
      const result = await analyzeBrief(brief, language);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateModel = useCallback(async () => {
    if (!analysis) return;

    setIsGeneratingModel(true);
    setModelError(null);
    setModelImageUrl(null);

    try {
      const prompt = `Cinematic, photorealistic 3D architectural render of a ${analysis.designStyles.join(' / ')} building, inspired by the following brief: "${analysis.summary}". Key features to include are: ${analysis.keyRequirements.join(', ')}. The scene should be set during a beautiful sunset with warm, golden hour lighting, casting soft shadows. The environment should complement the building style, for example a lush forest for a rustic cabin or a manicured garden for a modern villa. Focus on hyper-realistic materials and textures. High resolution, 8k, professional architectural photography style.`;
      const imageUrl = await generate3dModelImage(prompt);
      setModelImageUrl(imageUrl);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'An unknown error occurred while generating the model.');
    } finally {
      setIsGeneratingModel(false);
    }
  }, [analysis]);
  
  const handleGenerateExteriorView = useCallback(async (viewType: ExteriorViewType) => {
    if (!analysis) return;

    setExteriorViews(prev => ({
        ...prev,
        [viewType]: { loading: true, imageUrl: null, error: null }
    }));

    let viewPrompt = '';
    const basePrompt = `Cinematic, photorealistic 3D architectural render of a building based on this brief: "${analysis.summary}". Key requirements are ${analysis.keyRequirements.join(', ')}. The architectural style is ${analysis.designStyles.join(' / ')}. Use hyper-realistic materials and textures, high resolution, 8k.`;

    switch (viewType) {
        case 'front':
            viewPrompt = `Front elevation view. ${basePrompt} The camera is positioned directly in front of the main entrance, eye-level. The lighting should be bright daylight.`;
            break;
        case 'side':
            viewPrompt = `Side elevation view (choose the most interesting side). ${basePrompt} The lighting should highlight the form and materials of the building.`;
            break;
        case 'rear':
            viewPrompt = `Rear elevation view. ${basePrompt} Show any backyard features like a patio or garden. The lighting should be soft afternoon light.`;
            break;
    }

    try {
        const imageUrl = await generate3dModelImage(viewPrompt);
        setExteriorViews(prev => ({
            ...prev,
            [viewType]: { ...prev[viewType], loading: false, imageUrl: imageUrl }
        }));
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setExteriorViews(prev => ({
            ...prev,
            [viewType]: { ...prev[viewType], loading: false, error: errorMessage }
        }));
    }
  }, [analysis]);

  const handleGenerateInteriorView = useCallback(async (roomName: string) => {
    if (!analysis) return;

    setInteriorViews(prev => ({
        ...prev,
        [roomName]: { loading: true, imageUrl: null, error: null }
    }));

    const prompt = `Cinematic, photorealistic 3D architectural render of an interior view of the ${roomName} of a building. The building brief is: "${analysis.summary}". Key requirements are ${analysis.keyRequirements.join(', ')}. The architectural style is ${analysis.designStyles.join(' / ')}. Focus on the interplay of light and shadow from large windows. The mood should be cozy and inviting. Use hyper-realistic materials and textures, high resolution, 8k.`;
    
    try {
        const imageUrl = await generate3dModelImage(prompt);
        // FIX: Spreading `prev[roomName]` would cause a runtime error on first generation for a room
        // as it would be undefined. Instead, we create a new complete state object.
        setInteriorViews(prev => ({
            ...prev,
            [roomName]: { loading: false, imageUrl: imageUrl, error: null }
        }));
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        // FIX: Spreading `prev[roomName]` would cause a runtime error on first generation for a room
        // as it would be undefined. Instead, we create a new complete state object.
        setInteriorViews(prev => ({
            ...prev,
            [roomName]: { loading: false, imageUrl: null, error: errorMessage }
        }));
    }
  }, [analysis]);

  const handleGenerateDiagram = useCallback(async () => {
    if (!analysis) return;
    setIsGeneratingDiagram(true);
    setDiagramError(null);
    setDiagramImageUrl(null);
    try {
      const prompt = `Create a professional, to-scale architectural floor plan. This must be a clean, black and white 2D line drawing. The primary focus is on displaying CLEAR and ACCURATE dimensions in SI units (meters). Include dimension lines for every wall, room, door, and window. All dimension numbers must be clearly labeled with 'm' for meters. Label each room with its function (e.g., 'Living Room', 'Bedroom 1'). The layout should be based on this summary: "${analysis.summary}" and must include these key features: ${analysis.keyRequirements.join(', ')}. Do not add furniture, colors, or textures. The final image should resemble a real architectural blueprint with a strong emphasis on precise measurements and dimension callouts with their SI units.`;
      const imageUrl = await generateFloorPlanDiagram(prompt);
      setDiagramImageUrl(imageUrl);
    } catch (err) {
      setDiagramError(err instanceof Error ? err.message : 'An unknown error occurred while generating the diagram.');
    } finally {
      setIsGeneratingDiagram(false);
    }
  }, [analysis]);
  
  const handleGenerateElectricalDiagram = useCallback(async () => {
    if (!analysis || !diagramImageUrl) return;
    setIsGeneratingElectrical(true);
    setElectricalError(null);
    setElectricalImageUrl(null);
    try {
      const dataUrlParts = diagramImageUrl.split(',');
      if (dataUrlParts.length < 2) {
        throw new Error("Invalid floor plan image data URL.");
      }
      const metaPart = dataUrlParts[0];
      const base64Data = dataUrlParts[1];
      const mimeTypeMatch = metaPart.match(/:(.*?);/);
       if (!mimeTypeMatch || !mimeTypeMatch[1]) {
          throw new Error("Could not determine mime type from floor plan image.");
      }
      const mimeType = mimeTypeMatch[1];

      const prompt = `You are an expert electrical engineer. Using the provided architectural floor plan image as a base, add a complete and detailed electrical wiring diagram overlay. DO NOT alter the existing floor plan. The electrical plan is the primary focus and must be of blueprint quality. It must include the following detailed elements:

1.  **Complete Symbol Set & Legend**:
    *   Use standard, distinct symbols for ALL electrical components.
    *   A comprehensive legend/key MUST be included on the side of the drawing, clearly explaining every symbol used. This includes:
        *   General Purpose Outlets (Duplex Receptacle)
        *   GFCI Outlets (for kitchens, bathrooms, exterior)
        *   Special Purpose Outlets (e.g., for stove, dryer - 240V)
        *   Switches (Single-pole, Three-way, Dimmer)
        *   Light Fixtures (Ceiling-mounted, Wall-mounted/sconce, Recessed/pot light)
        *   Main Circuit Breaker Panel location.
        *   Smoke/CO Detectors.

2.  **Logical Component Placement**:
    *   Place switches near the entry doorways of rooms.
    *   Place general outlets along walls according to common residential standards (e.g., approximately every 3-4 meters).
    *   Place GFCI outlets in all required locations like kitchens (countertops), bathrooms, and any outdoor areas.
    *   Strategically place lighting fixtures to illuminate each space appropriately.

3.  **Clear Wiring Paths & Circuiting**:
    *   Show clear, curved lines (arc wiring) to indicate which switch controls which light(s).
    *   Illustrate wiring paths connecting outlets in sequence for each circuit.
    *   Group rooms into logical circuits. For example, show a dedicated circuit for the kitchen appliances.
    *   All circuit runs should originate from the main breaker panel symbol.

4.  **Visual Clarity**:
    *   The provided architectural floor plan is the base.
    *   All new electrical symbols and wiring paths MUST be drawn on top of it in a single, vibrant, contrasting color (e.g., bright blue or red) to make them stand out clearly.

The final image must be the original floor plan with your electrical diagram professionally overlaid.`;
      const imageUrl = await generateElectricalDiagram(prompt, base64Data, mimeType);
      setElectricalImageUrl(imageUrl);
    } catch (err) {
      setElectricalError(err instanceof Error ? err.message : 'An unknown error occurred while generating the electrical diagram.');
    } finally {
      setIsGeneratingElectrical(false);
    }
  }, [analysis, diagramImageUrl]);


  const AnalysisSection: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
    <div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</h3>
      <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
  
  const ViewButton: React.FC<{
      onClick: () => void;
      disabled: boolean;
      icon: React.ReactNode;
      label: string;
  }> = ({ onClick, disabled, icon, label }) => (
      <button
          onClick={onClick}
          disabled={disabled}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
      >
          {icon}
          <span>{label}</span>
      </button>
  );

  return (
    <Card>
      <CardHeader 
        title="Project Brief Analyzer"
        description="Paste your client's brief to extract key requirements, styles, and potential challenges."
        icon={<BuildingIcon />}
      />
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Start with an example brief:
            </label>
            <div className="flex flex-wrap gap-2">
              {exampleBriefs.map((example) => (
                <button
                  key={example.title}
                  onClick={() => setBrief(example.brief)}
                  disabled={loading}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                    brief === example.brief
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {example.title}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="language-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Response Language
            </label>
            <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={loading}
                className="w-full h-10 p-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            >
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Enter project brief here..."
          className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
          disabled={loading}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !brief.trim()}
          className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-md"
        >
          {loading ? 'Analyzing...' : 'Analyze Brief'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
      
      {loading && <Loader text="Analyzing brief with Gemini Pro..."/>}

      {analysis && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">AI Summary</h3>
            <p className="text-slate-600 dark:text-slate-300">{analysis.summary}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <AnalysisSection title="Key Requirements" items={analysis.keyRequirements} />
            <AnalysisSection title="Suggested Design Styles" items={analysis.designStyles} />
          </div>
          <AnalysisSection title="Potential Challenges" items={analysis.potentialChallenges} />

          {/* New 3D Model Section */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4 mb-4">
                 <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-lg p-3">
                    <CubeIcon />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">3D Concept Model</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Generate a visual concept based on the analysis.</p>
                </div>
            </div>
            
            {!modelImageUrl && !isGeneratingModel && (
                <button
                    onClick={handleGenerateModel}
                    disabled={isGeneratingModel}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                    <CubeIcon/>
                    <span>Generate 3D Concept</span>
                </button>
            )}
            
            {modelError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{modelError}</p>}
            
            {isGeneratingModel && <Loader text="Generating 3D model with Imagen..." />}
            
            {modelImageUrl && (
                <div className="mt-4">
                    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
                        <img src={modelImageUrl} alt="Generated 3D model concept" className="w-full h-auto object-contain rounded-md" />
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Additional Views</h4>
                      
                      <div>
                        <h5 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Exterior Views</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <ViewButton onClick={() => handleGenerateExteriorView('front')} disabled={exteriorViews.front.loading} icon={<FrontViewIcon />} label="Front"/>
                            <ViewButton onClick={() => handleGenerateExteriorView('side')} disabled={exteriorViews.side.loading} icon={<SideViewIcon />} label="Side"/>
                            <ViewButton onClick={() => handleGenerateExteriorView('rear')} disabled={exteriorViews.rear.loading} icon={<RearViewIcon />} label="Rear"/>
                        </div>
                      </div>
                      
                      {analysis.rooms && analysis.rooms.length > 0 && (
                        <div className="mt-4">
                            <h5 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Interior Views</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                {analysis.rooms.map(room => (
                                    <ViewButton 
                                        key={room}
                                        onClick={() => handleGenerateInteriorView(room)} 
                                        disabled={interiorViews[room]?.loading} 
                                        icon={<InteriorViewIcon />} 
                                        label={room}
                                    />
                                ))}
                            </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(exteriorViews) as ExteriorViewType[]).map((viewType) => {
                          const view = exteriorViews[viewType];
                          if (!view.loading && !view.imageUrl && !view.error) return null;
                          
                          return (
                            <div key={viewType} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                              <h5 className="font-semibold text-slate-600 dark:text-slate-300 capitalize mb-2">{viewType} View</h5>
                              {view.loading && <Loader text="Generating..." />}
                              {view.error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-2 rounded-md">{view.error}</p>}
                              {view.imageUrl && <img src={view.imageUrl} alt={`${viewType} view`} className="w-full h-auto object-contain rounded-md" />}
                            </div>
                          );
                        })}
                        {Object.entries(interiorViews).map(([roomName, view]: [string, ViewState]) => {
                            if (!view.loading && !view.imageUrl && !view.error) return null;
                          
                            return (
                              <div key={roomName} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h5 className="font-semibold text-slate-600 dark:text-slate-300 capitalize mb-2">{roomName}</h5>
                                {view.loading && <Loader text="Generating..." />}
                                {view.error && <p className="text-sm text-red-500 bg-red-100 dark:bg-red-900/50 p-2 rounded-md">{view.error}</p>}
                                {view.imageUrl && <img src={view.imageUrl} alt={`${roomName} interior view`} className="w-full h-auto object-contain rounded-md" />}
                              </div>
                            );
                        })}
                      </div>
                    </div>

                    {/* New Floor Plan Diagram Section */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-lg p-3">
                                <FloorPlanIcon />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Floor Plan Diagram</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Generate a 2D floor plan and electrical diagrams for a clear layout overview.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {!diagramImageUrl && !isGeneratingDiagram && (
                                <button
                                    onClick={handleGenerateDiagram}
                                    disabled={isGeneratingDiagram}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-slate-400 transition-colors shadow-md"
                                >
                                    <FloorPlanIcon/>
                                    <span>Generate Floor Plan</span>
                                </button>
                            )}

                            {diagramImageUrl && !isGeneratingElectrical && (
                                <button
                                    onClick={handleGenerateElectricalDiagram}
                                    disabled={isGeneratingElectrical}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-colors shadow-md"
                                >
                                    <ElectricalIcon/>
                                    <span>Generate Electrical Diagram</span>
                                </button>
                            )}
                        </div>

                        {diagramError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{diagramError}</p>}
                        
                        {isGeneratingDiagram && <Loader text="Generating floor plan with Imagen..." />}
                        
                        {diagramImageUrl && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Floor Plan</h4>
                                <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
                                    <img src={diagramImageUrl} alt="Generated floor plan diagram" className="w-full h-auto object-contain rounded-md" />
                                </div>
                            </div>
                        )}
                        
                        {electricalError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{electricalError}</p>}

                        {isGeneratingElectrical && <Loader text="Generating electrical diagram with Imagen..." />}

                        {electricalImageUrl && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Electrical Diagram</h4>
                                <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
                                    <img src={electricalImageUrl} alt="Generated electrical diagram" className="w-full h-auto object-contain rounded-md" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProjectBriefAnalyzer;