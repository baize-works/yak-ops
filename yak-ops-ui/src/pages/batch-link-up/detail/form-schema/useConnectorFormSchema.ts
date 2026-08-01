import { useEffect, useState } from 'react';

import { isApiSuccess, responseMessage } from '../model';
import { connectorFormApi } from './service';
import type { ConnectorFormSchema, ConnectorRole } from './types';

export default function useConnectorFormSchema(
  connectorId: string,
  role: ConnectorRole,
) {
  const [schema, setSchema] = useState<ConnectorFormSchema>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!connectorId) {
      setSchema(undefined);
      setLoading(false);
      setError('');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    connectorFormApi
      .schema(connectorId, role)
      .then((response) => {
        if (!active) return;
        if (!isApiSuccess(response) || !response.data) {
          setSchema(undefined);
          setError(responseMessage(response, '获取 Connector Form Schema 失败'));
          return;
        }
        setSchema(response.data);
      })
      .catch((reason: any) => {
        if (!active) return;
        setSchema(undefined);
        setError(reason?.message || '获取 Connector Form Schema 失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [connectorId, role]);

  return { schema, loading, error };
}
