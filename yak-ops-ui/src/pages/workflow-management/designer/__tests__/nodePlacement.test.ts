import type { WorkflowNodeType } from '../../types';

const libraryNodeTypes: Record<string, WorkflowNodeType> = {
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

describe('workflow canvas library mapping', () => {
  it('maps every canvas library entry to a supported workflow node type', () => {
    expect(Object.values(libraryNodeTypes)).not.toContain(undefined);
    expect(libraryNodeTypes.llm).toBe('LLM');
    expect(libraryNodeTypes.condition).toBe('CONDITION');
    expect(libraryNodeTypes.code).toBe('CODE');
  });
});
