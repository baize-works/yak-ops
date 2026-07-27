import { chooseSecurityProject } from "./SecurityProjectContext";

const projects: API.ProjectBrief[] = [
  { id: 1, projectCode: "one", projectName: "One" },
  { id: 2, projectCode: "two", projectName: "Two" },
];

describe("chooseSecurityProject", () => {
  it("restores an accessible project", () => expect(chooseSecurityProject(projects, "2")).toBe(projects[1]));
  it("falls back when the saved project was removed", () => expect(chooseSecurityProject(projects, "99")).toBe(projects[0]));
  it("supports users without projects", () => expect(chooseSecurityProject([], "2")).toBeUndefined());
});

