import { useModel } from "@umijs/max";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";

const STORAGE_KEY = "yak-security.current-project-id";
export const SECURITY_SESSION_EXPIRED_EVENT = "yak-security:session-expired";

export const chooseSecurityProject = (
  projects: API.ProjectBrief[],
  persistedId: string | null,
): API.ProjectBrief | undefined =>
  projects.find((project) => String(project.id) === persistedId) ?? projects[0];

type SecurityProjectValue = {
  projects: API.ProjectBrief[];
  currentProject?: API.ProjectBrief;
  selectProject: (project: API.ProjectBrief) => void;
  clearProject: () => void;
};

const SecurityProjectContext = createContext<SecurityProjectValue | undefined>(undefined);

export function SecurityProjectProvider({ children }: { children: ReactNode }) {
  const { initialState, setInitialState } = useModel("@@initialState");
  const projects = initialState?.currentUser?.projectList ?? [];
  const currentProject = initialState?.securityProject as API.ProjectBrief | undefined;

  const selectProject = (project: API.ProjectBrief) => {
    if (!projects.some((candidate) => candidate.id === project.id)) return;
    localStorage.setItem(STORAGE_KEY, String(project.id));
    setInitialState((state) => ({ ...state, currentProject: project, securityProject: project }));
  };

  const clearProject = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInitialState((state) => ({ ...state, currentProject: undefined, securityProject: undefined }));
  };

  useEffect(() => {
    const selected = chooseSecurityProject(projects, localStorage.getItem(STORAGE_KEY));
    if (selected) {
      if (selected.id !== currentProject?.id) selectProject(selected);
    } else if (currentProject) {
      clearProject();
    }
  }, [currentProject?.id, projects]);

  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem(STORAGE_KEY);
      setInitialState((state) => ({
        ...state,
        currentUser: undefined,
        currentProject: undefined,
        securityProject: undefined,
      }));
    };
    window.addEventListener(SECURITY_SESSION_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(SECURITY_SESSION_EXPIRED_EVENT, clearSession);
  }, [setInitialState]);

  const value = useMemo(
    () => ({ projects, currentProject, selectProject, clearProject }),
    [projects, currentProject],
  );
  return <SecurityProjectContext.Provider value={value}>{children}</SecurityProjectContext.Provider>;
}

export const useSecurityProject = () => {
  const value = useContext(SecurityProjectContext);
  if (!value) throw new Error("useSecurityProject must be used within SecurityProjectProvider");
  return value;
};

