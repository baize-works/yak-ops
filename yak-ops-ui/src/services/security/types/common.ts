export type SecurityApiResponse<T> = import('@/services/http/response').ApiResponse<T>;

/** Headers are opt-in because only endpoints confirmed in the contract may receive project context. */
export type SecurityProjectContext = {
  headerName: string;
  projectId: string | number;
};

