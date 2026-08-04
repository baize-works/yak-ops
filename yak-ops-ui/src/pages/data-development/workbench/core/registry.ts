import type {
  NodePluginDefinition,
  ResourceRendererComponent,
  WorkbenchActionContext,
  WorkbenchActionDefinition,
  WorkbenchCommandDefinition,
} from './types';

class KeyedRegistry<T> {
  private readonly values = new Map<string, T>();

  register(key: string, value: T) {
    this.values.set(key, value);
  }

  get(key: string): T | undefined {
    return this.values.get(key);
  }

  require(key: string): T {
    const value = this.values.get(key);
    if (!value) {
      throw new Error(`Workbench registry item not found: ${key}`);
    }
    return value;
  }

  list(): T[] {
    return Array.from(this.values.values());
  }
}

class CommandRegistry extends KeyedRegistry<WorkbenchCommandDefinition> {
  async execute(commandId: string, context: WorkbenchActionContext) {
    const command = this.require(commandId);
    await command.execute(context);
  }
}

export const nodePluginRegistry = new KeyedRegistry<NodePluginDefinition>();
export const rendererRegistry = new KeyedRegistry<ResourceRendererComponent>();
export const actionRegistry = new KeyedRegistry<WorkbenchActionDefinition>();
export const commandRegistry = new CommandRegistry();
