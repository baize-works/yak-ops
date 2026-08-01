import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isApiSuccess } from '../model';
import { connectorFormApi } from './service';
import type {
  ConnectorActionOption,
  ConnectorFormField,
  ConnectorFormSchema,
  ConnectorFormValues,
} from './types';

interface CacheEntry {
  expiresAt: number;
  options: ConnectorActionOption[];
}

const optionCache = new Map<string, CacheEntry>();

const hasValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (!Array.isArray(value) || value.length > 0) &&
  (typeof value !== 'string' || value.trim().length > 0);

export default function useRemoteOptions(
  schema: ConnectorFormSchema,
  field: ConnectorFormField,
  dataSourceId: string,
  values: ConnectorFormValues,
) {
  const [options, setOptions] = useState<ConnectorActionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const requestIdRef = useRef(0);
  const source = field.optionSource;

  const requestValues = useMemo(() => {
    const keys = source?.requestValueKeys || [];
    if (keys.length === 0) return values;
    return Object.fromEntries(
      keys
        .filter((key) => hasValue(values[key]))
        .map((key) => [key, values[key]]),
    );
  }, [source?.requestValueKeys, values]);

  const ready = useMemo(() => {
    if (!source || !dataSourceId) return false;
    if (source.action !== 'LIST_COLUMNS') return true;
    return Object.values(requestValues).some(hasValue);
  }, [dataSourceId, requestValues, source]);

  const cacheKey = useMemo(
    () =>
      JSON.stringify({
        action: source?.action,
        connectorId: schema.connectorId,
        role: schema.role,
        fieldKey: field.key,
        dataSourceId,
        keyword,
        values: requestValues,
      }),
    [dataSourceId, field.key, keyword, requestValues, schema.connectorId, schema.role, source?.action],
  );

  const load = useCallback(async () => {
    if (!source || !ready) {
      requestIdRef.current += 1;
      setOptions([]);
      setLoading(false);
      return;
    }

    const cached = optionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setOptions(cached.options);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const response = await connectorFormApi.action(source.action, {
        dataSourceId,
        connectorId: schema.connectorId,
        role: schema.role,
        fieldKey: field.key,
        keyword,
        values: requestValues,
      });
      if (requestId !== requestIdRef.current) return;
      const next = isApiSuccess(response) ? response.data?.options || [] : [];
      optionCache.set(cacheKey, {
        options: next,
        expiresAt: Date.now() + Math.max(1000, source.cacheTtlMillis || 30000),
      });
      setOptions(next);
    } catch {
      if (requestId === requestIdRef.current) setOptions([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [cacheKey, dataSourceId, field.key, keyword, ready, requestValues, schema.connectorId, schema.role, source]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), keyword ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [keyword, load]);

  return {
    options,
    loading,
    ready,
    onSearch: source?.searchable ? setKeyword : undefined,
  };
}
