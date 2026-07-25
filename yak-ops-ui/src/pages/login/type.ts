import HttpUtils from '@/utils/HttpUtils';


export const apiPrefix = "/api/v1"

export const loginApi = {

  login: (data: any): Promise<{ code: number; data: any; message?: string }> => {
    return HttpUtils.post(`${apiPrefix}/login`, data);
  },

  googleLogin: (params: { credential: string }) => {
    return HttpUtils.post("/api/v1/auth/google/login", params);
  },
};
