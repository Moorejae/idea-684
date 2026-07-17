export interface ClarifyingQuestion {
  id: string;
  question: string;
  context: string;
  options?: string[];
  answer?: string;
}

export interface PromptEvaluation {
  criteria: string;
  rating: 'excellent' | 'good' | 'needs-improvement';
  feedback: string;
}

export interface RefinedPromptStyle {
  id: 'standard' | 'xml' | 'persona' | 'sequential';
  name: string;
  description: string;
  sampleText: string;
}

export interface AnalysisResult {
  originalPrompt: string;
  refinedPrompt: string; // Draft refined prompt
  evaluation: PromptEvaluation[];
  clarifyingQuestions: ClarifyingQuestion[];
  strengths: string[];
  gaps: string[];
}

export interface GuidebookSection {
  id: string;
  title: string;
  provider: 'google' | 'anthropic' | 'openai' | 'universal';
  description: string;
  keyPrinciples: {
    title: string;
    description: string;
    example: string;
  }[];
  proTip: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  original: string;
  refined: string;
  style: string;
  createdAt: string;
}
