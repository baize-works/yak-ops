import type { WorkflowNodeType } from '../../types';

const placementTypes: WorkflowNodeType[] = [
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

describe('pointer placement types', () => {
  it('keeps the canvas library compatible with workflow node types', () => {
    expect(placementTypes).toHaveLength(10);
  });
});
