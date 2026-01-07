export interface TakoSearchConfig {
  apiKey?: string;
  sourceIndexes?: ("tako" | "web" | "connected_data")[];
  searchEffort?: "fast" | "deep" | "auto";
  outputSettings?: {
    knowledgeCardSettings?: {
      imageDarkMode?: boolean;
    };
  };
  countryCode?: string;
  locale?: string;
}

export interface TakoSource {
  source_name: string;
  url: string;
}

export interface TakoVisualizationData {
  data: any[];
  viz_config: Record<string, any>;
}

export interface TakoKnowledgeCard {
  card_id: string;
  title: string;
  description: string;
  webpage_url: string;
  image_url: string;
  sources: TakoSource[];
  visualization_data: TakoVisualizationData;
}

export interface TakoSearchResponse {
  outputs: {
    knowledge_cards: TakoKnowledgeCard[];
    answer: string;
  };
  request_id: string;
}
