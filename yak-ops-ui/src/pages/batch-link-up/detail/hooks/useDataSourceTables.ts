import { useEffect, useState } from 'react';

import { dataSourceCatalogApi } from '@/pages/data-source/service';

const normalizeTableNames = (data: any): string[] => {
  const values = Array.isArray(data)
    ? data
    : Array.isArray(data?.bizData)
      ? data.bizData
      : Array.isArray(data?.records)
        ? data.records
        : [];

  return Array.from(
    new Set(
      values
        .map((item: any) =>
          typeof item === 'string'
            ? item
            : item?.tableName ||
              item?.name ||
              item?.label ||
              item?.value,
        )
        .filter(Boolean)
        .map(String),
    ),
  );
};

export default function useDataSourceTables(dataSourceId: string) {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dataSourceId) {
      setTables([]);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);

    dataSourceCatalogApi
      .listTable(dataSourceId)
      .then((response) => {
        if (!active) return;
        setTables(normalizeTableNames(response?.data));
      })
      .catch(() => {
        if (active) {
          setTables([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dataSourceId]);

  return {
    tables,
    loading,
  };
}
