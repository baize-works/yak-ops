import { BUILTIN_EXECUTION_RESULT_DEFINITIONS } from './definitions';
import {
  executionResultDefinitionRegistry,
  executionResultRendererRegistry,
} from './registry';
import JsonExecutionResultRenderer from './renderers/JsonExecutionResultRenderer';
import TableExecutionResultRenderer from './renderers/TableExecutionResultRenderer';

let registered = false;

export const registerExecutionPanelExtensions = () => {
  if (registered) return;
  registered = true;

  BUILTIN_EXECUTION_RESULT_DEFINITIONS.forEach((definition) =>
    executionResultDefinitionRegistry.register(
      definition.resourceType,
      definition,
    ),
  );

  executionResultRendererRegistry.register(
    'table-result',
    TableExecutionResultRenderer,
  );
  executionResultRendererRegistry.register(
    'json-result',
    JsonExecutionResultRenderer,
  );
};
