import type { WorkflowNodeType } from '../../types';

const mapping: Record<string, WorkflowNodeType> = {
  llm: 'LLM',
  condition: 'CONDITION',
  code: 'CODE',
  template: 'TEMPLATE',
  variable: 'VARIABLE',
};

describe('pointer placement mapping', () => {
  it('maps common canvas library entries to supported node types', () => {
    expect(mapping).toEqual({
      llm: 'LLM',
      condition: 'CONDITION',
      code: 'CODE',
      template: 'TEMPLATE',
      variable: 'VARIABLE',
    });
  });
});
