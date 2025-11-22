export interface BriefAnalysis {
  keyRequirements: string[];
  designStyles: string[];
  potentialChallenges: string[];
  summary: string;
  rooms: string[];
}

export interface MaterialSuggestion {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface ImageAnalysis {
    architecturalStyle: string;
    keyFeatures: string[];
    colorPalette: string[];
    potentialMaterials: string[];
}

export interface BillOfQuantitiesItem {
  item: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
}

export interface BillOfQuantitiesCategory {
  category: string;
  items: BillOfQuantitiesItem[];
}