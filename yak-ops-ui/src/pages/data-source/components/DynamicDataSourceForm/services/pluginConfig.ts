import { API_SUCCESS_CODE } from '@/services/http/response';
import HttpUtils from '@/utils/HttpUtils';

import type {
  CommonApiResponse,
  DynamicFormSchemaResponse,
} from '../../../types';

export async function fetchPluginConfig(
  pluginType: string,
): Promise<CommonApiResponse<DynamicFormSchemaResponse>> {
  const query = new URLSearchParams({ pluginType }).toString();
  return HttpUtils.get<DynamicFormSchemaResponse>(
    `/api/v1/data-source/plugin/config?${query}`,
  );
}

export async function uploadDriverJar(pluginType: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pluginType', pluginType);

  const response = await HttpUtils.postForm<unknown>(
    '/api/v1/data-source/plugin/driver/upload',
    formData,
  );
  if (response?.code !== API_SUCCESS_CODE) {
    throw new Error(response?.message || response?.msg || '驱动包上传失败');
  }
  return response?.data;
}
