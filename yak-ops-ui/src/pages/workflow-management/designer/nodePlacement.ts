import type { WorkflowNodeType } from '../types';

export const CANVAS_LIBRARY_NODE_TYPE: Record<string, WorkflowNodeType> = {
  llm: 'LLM',
  'knowledge-retrieval': 'KNOWLEDGE',
  'direct-answer': 'END',
  agent: 'LLM',
  'question-classifier': 'QUESTION_CLASSIFIER',
  condition: 'CONDITION',
  'human-intervention': 'NOOP',
  iteration: 'ITERATION',
  loop: 'ITERATION',
  code: 'CODE',
  template: 'TEMPLATE',
  'variable-aggregator': 'VARIABLE',
  'variable-tool': 'VARIABLE',
  'input-tool': 'TEMPLATE',
};

export const resolveCanvasLibraryNodeType = (key: string) =>
  CANVAS_LIBRARY_NODE_TYPE[key];
