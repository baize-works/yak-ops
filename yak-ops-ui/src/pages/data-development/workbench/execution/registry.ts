import type {
  ExecutionResultDefinition,
  ExecutionResultRendererComponent,
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
      throw new Error(`Execution panel registry item not found: ${key}`);
    }
    return value;
  }
}

export const executionResultDefinitionRegistry =
  new KeyedRegistry<ExecutionResultDefinition>();

export const executionResultRendererRegistry =
  new KeyedRegistry<ExecutionResultRendererComponent>();
