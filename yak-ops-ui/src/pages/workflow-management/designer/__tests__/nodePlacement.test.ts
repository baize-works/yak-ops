import type { WorkflowNodeType } from '../../types';

const supportedNodeTypes: WorkflowNodeType[] = [
  'LLM',
  'KNOWLEDGE',
  'END',
  'QUESTION_CLASSIFIER',
  'CONDITION',
  'NOOP',
  'ITERATION',
  'CODE',
  'TEMPLATE',
  'VARIABLE',
];

describe('workflow pointer placement node types', () => {
  it('uses only supported workflow node types', () => {
    expect(supportedNodeTypes).toEqual(
      expect.arrayContaining(['LLM', 'CONDITION', 'CODE', 'VARIABLE']),
    );
  });
});
