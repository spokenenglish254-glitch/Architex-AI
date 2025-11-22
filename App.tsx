import React, { useState, useCallback } from 'react';
import ProjectBriefAnalyzer from './components/ProjectBriefAnalyzer';
import BillOfQuantities from './components/BillOfQuantities';
import MaterialSuggester from './components/MaterialSuggester';
import InspirationAnalyzer from './components/InspirationAnalyzer';
import LiveAssistant from './components/LiveAssistant';
import { BuildingIcon } from './components/icons/BuildingIcon';
import { BillOfQuantitiesIcon } from './components/icons/BillOfQuantitiesIcon';
import { MaterialIcon } from './components/icons/MaterialIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { LiveIcon } from './components/icons/LiveIcon';

type Tab = 'brief' | 'boq' | 'materials' | 'inspiration' | 'live';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('brief');

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'brief':
        return <ProjectBriefAnalyzer />;
      case 'boq':
        return <BillOfQuantities />;
      case 'materials':
        return <MaterialSuggester />;
      case 'inspiration':
        return <InspirationAnalyzer />;
      case 'live':
        return <LiveAssistant />;
      default:
        return null;
    }
  }, [activeTab]);

  const TabButton = ({ tabName, label, icon }: { tabName: Tab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
        activeTab === tabName
          ? 'bg-primary-600 text-white shadow-md'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-primary-600">
              Architex <span className="text-slate-500">AI</span>
            </h1>
            <p className="hidden sm:block text-slate-500 dark:text-slate-400">
              Your AI Assistant for Architectural Design
            </p>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-1/4 xl:w-1/5">
            <nav className="flex lg:flex-col gap-2 p-2 bg-white dark:bg-slate-800/50 rounded-xl shadow-sm">
              <TabButton tabName="brief" label="Brief Analyzer" icon={<BuildingIcon />} />
              <TabButton tabName="boq" label="Bill of Quantities" icon={<BillOfQuantitiesIcon />} />
              <TabButton tabName="materials" label="Material Suggester" icon={<MaterialIcon />} />
              <TabButton tabName="inspiration" label="Inspiration Analyzer" icon={<ImageIcon />} />
              <TabButton tabName="live" label="Live Assistant" icon={<LiveIcon />} />
            </nav>
          </aside>

          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Powered by Gemini API. Built for modern architectural workflows.</p>
      </footer>
    </div>
  );
};

export default App;