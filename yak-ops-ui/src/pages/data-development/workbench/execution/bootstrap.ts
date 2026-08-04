import { BUILTIN_EXECUTION_RESULT_DEFINITIONS } from './definitions';
import {
  executionResultDefinitionRegistry,
  executionResultRendererRegistry,
} from './registry';
import JsonExecutionResultRenderer from './renderers/JsonExecutionResultRenderer';
import NotebookExecutionResultRenderer from './renderers/NotebookExecutionResultRenderer';
import PipelineExecutionResultRenderer from './renderers/PipelineExecutionResultRenderer';
import TableExecutionResultRenderer from './renderers/TableExecutionResultRenderer';
import TerminalExecutionResultRenderer from './renderers/TerminalExecutionResultRenderer';
import TextExecutionResultRenderer from './renderers/TextExecutionResultRenderer';

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
  executionResultRendererRegistry.register(
    'terminal-result',
    TerminalExecutionResultRenderer,
  );
  executionResultRendererRegistry.register(
    'notebook-result',
    NotebookExecutionResultRenderer,
  );
  executionResultRendererRegistry.register(
    'pipeline-result',
    PipelineExecutionResultRenderer,
  );
  executionResultRendererRegistry.register(
    'text-result',
    TextExecutionResultRenderer,
  );
};
