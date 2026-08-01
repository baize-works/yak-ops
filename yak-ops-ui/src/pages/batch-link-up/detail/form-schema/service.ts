import type { ApiResponse } from '@/services/http/response';
import HttpUtils from '@/utils/HttpUtils';

import type {
  ConnectorActionResult,
  ConnectorFormSchema,
  ConnectorFormValues,
  ConnectorRole,
  ConnectorValidationResult,
} from './types';

const PREFIX = '/api/v1/job/batch-control/connectors';

export const connectorFormApi = {
  schema: (
    connectorId: string,
    role: ConnectorRole,
  ): Promise<ApiResponse<ConnectorFormSchema>> =>
    HttpUtils.get(
      `${PREFIX}/${encodeURIComponent(connectorId)}/form-schema?role=${encodeURIComponent(role)}`,
    ),

  action: (
    action: string,
    payload: {
      dataSourceId: string | number;
      connectorId: string;
      role: ConnectorRole;
      fieldKey?: string;
      keyword?: string;
      matchMode?: string;
      values: ConnectorFormValues;
    },
  ): Promise<ApiResponse<ConnectorActionResult>> =>
    HttpUtils.post(
      `${PREFIX}/actions/${encodeURIComponent(action)}`,
      payload,
    ),

  validate: (
    connectorId: string,
    role: ConnectorRole,
    values: ConnectorFormValues,
    context: Record<string, unknown> = {},
  ): Promise<ApiResponse<ConnectorValidationResult>> =>
    HttpUtils.post(
      `${PREFIX}/${encodeURIComponent(connectorId)}/form-schema/validate?role=${encodeURIComponent(role)}`,
      { values, context },
    ),
};
