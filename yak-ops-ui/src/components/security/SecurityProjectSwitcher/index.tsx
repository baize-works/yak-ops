import { useSecurityProject } from "@/contexts/SecurityProjectContext";
import { Dropdown, Empty } from "antd";
import { ChevronDown } from "lucide-react";

export default function SecurityProjectSwitcher() {
  const { projects, currentProject, selectProject } = useSecurityProject();
  if (!projects.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可用项目" className="m-0 px-3" />;
  }

  return (
    <Dropdown
      menu={{
        selectable: true,
        selectedKeys: currentProject ? [String(currentProject.id)] : [],
        items: projects.map((project) => ({
          key: String(project.id),
          label: project.projectName,
          onClick: () => selectProject(project),
        })),
      }}
    >
      <button type="button" className="flex items-center gap-1 border-0 bg-transparent px-2 text-sm">
        <span>{currentProject?.projectName}</span><ChevronDown className="h-3 w-3" />
      </button>
    </Dropdown>
  );
}

