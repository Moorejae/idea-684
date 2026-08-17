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

export interface SavedPrompt {
  id: string;
  title: string;
  original: string;
  refined: string;
  style: string;
  createdAt: string;
  tags?: string[];
}

export interface StarterTemplate {
  id: string;
  title: string;
  category: 'Coding & Architecture' | 'Agents & Logic' | 'Analytics & Data' | 'Creative & Copy' | 'Operations & Support';
  description: string;
  level: 'Beginner Draft' | 'Intermediate' | 'Complex Task';
  roughPrompt: string;
  architecturalFlaws: string[];
  engineeredHighlights: string[];
}
