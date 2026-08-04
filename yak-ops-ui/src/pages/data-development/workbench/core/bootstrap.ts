import { registerExecutionPanelExtensions } from '../execution/bootstrap';
import { BUILTIN_NODE_PLUGINS } from '../plugins';
import CodeResourceRenderer from '../renderers/CodeResourceRenderer';
import IntegrationRenderer from '../renderers/IntegrationRenderer';
import NotebookRenderer from '../renderers/NotebookRenderer';
import SchemaFormRenderer from '../renderers/SchemaFormRenderer';
import { BUILTIN_ACTIONS } from './actions';
import { BUILTIN_COMMANDS } from './commands';
import {
  actionRegistry,
  commandRegistry,
  nodePluginRegistry,
  rendererRegistry,
} from './registry';

let registered = false;

export const registerWorkbenchExtensions = () => {
  if (registered) return;
  registered = true;

  BUILTIN_NODE_PLUGINS.forEach((plugin) =>
    nodePluginRegistry.register(plugin.type, plugin),
  );

  rendererRegistry.register('code', CodeResourceRenderer);
  rendererRegistry.register('schema-form', SchemaFormRenderer);
  rendererRegistry.register('notebook', NotebookRenderer);
  rendererRegistry.register('integration', IntegrationRenderer);

  BUILTIN_ACTIONS.forEach((action) =>
    actionRegistry.register(action.id, action),
  );

  BUILTIN_COMMANDS.forEach((command) =>
    commandRegistry.register(command.id, command),
  );

  registerExecutionPanelExtensions();
};
