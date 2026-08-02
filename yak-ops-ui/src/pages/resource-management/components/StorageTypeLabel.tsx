import { Cloud, Database, HardDrive } from 'lucide-react';

import type { ResourceStorageType } from '../types';

interface StorageTypeLabelProps {
  type?: ResourceStorageType | null;
  name?: string;
}

export const getResourceStorageLabel = (
  type?: ResourceStorageType | null,
) => {
  switch (String(type || '').toUpperCase()) {
    case 'LOCAL':
      return '本地存储';
    case 'MINIO':
      return 'MinIO';
    case 'HDFS':
      return 'HDFS';
    default:
      return String(type || '-');
  }
};

const storageIcon = (type?: ResourceStorageType | null) => {
  switch (String(type || '').toUpperCase()) {
    case 'LOCAL':
      return HardDrive;
    case 'HDFS':
      return Database;
    default:
      return Cloud;
  }
};

const StorageTypeLabel = ({ type, name }: StorageTypeLabelProps) => {
  const Icon = storageIcon(type);

  return (
    <span className="resource-storage-cell">
      <Icon size={14} />
      {name || getResourceStorageLabel(type)}
    </span>
  );
};

export default StorageTypeLabel;
