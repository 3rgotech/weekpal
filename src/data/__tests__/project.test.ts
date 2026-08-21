import { describe, expect, it } from "@jest/globals";
import Project from "../project";
import { SomedayTask, WeeklyTask } from "../task";

describe("Project", () => {
  it("mints a uuid so a project created offline can be sent as-is", () => {
    expect(new Project({ name: "Kitchen refit" }).id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("reads and writes the API's snake_case shape", () => {
    const project = Project.createFromApiData({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      name: "Kitchen refit",
      category_id: "01931c8f-7a2e-7c31-9f11-000000000001",
    })!;

    expect(project.categoryId).toBe("01931c8f-7a2e-7c31-9f11-000000000001");
    expect(project.toApiPayload()).toEqual({
      id: "01931c8f-7a2e-7c31-9f11-9c3a1b2d4e5f",
      name: "Kitchen refit",
      category_id: "01931c8f-7a2e-7c31-9f11-000000000001",
    });
  });

  it("refuses a payload with no id rather than inventing one", () => {
    // A minted id here would be a *different* project from the one the server sent.
    expect(Project.createFromApiData({ name: "No id" })).toBeNull();
  });
});

describe("a task's project and its schedule are independent", () => {
  // API-CONTRACT.md §4b: `project_id` is not part of the location discriminator. A task can be
  // in a project *and* scheduled — that is the normal case, pulling work out of a backlog.
  it("keeps the project when a task is scheduled to a day", () => {
    const task = new WeeklyTask({
      title: "Measure the units",
      weekCode: "2026w30",
      dayOfWeek: "2",
      projectId: "01931c8f-7a2e-7c31-9f11-000000000009",
    });

    expect(task.toApiPayload().project_id).toBe("01931c8f-7a2e-7c31-9f11-000000000009");
    expect(task.toApiPayload().week_number).toBe("2026w30");
  });

  it("distinguishes a backlog task from a true someday task by its project alone", () => {
    const backlog = new SomedayTask({ title: "Order doors", projectId: "p-1" });
    const someday = new SomedayTask({ title: "Learn the cello" });

    expect(backlog.toApiPayload().week_number).toBeNull();
    expect(someday.toApiPayload().week_number).toBeNull();
    // Same bucket on the wire; only `project_id` tells them apart.
    expect(backlog.projectId).toBe("p-1");
    expect(someday.projectId).toBeNull();
  });
});

describe("Task.belongsToProject", () => {
  /**
   * Two places depend on this and must not drift: the board's "Some day" list hides backlog
   * tasks, and the week reconcile must not delete them. The week payload deliberately omits
   * project backlogs, so treating "absent from the response" as "deleted" would wipe every
   * cached backlog task the moment any week was opened.
   */
  it("is true for a task in a project with no week", () => {
    expect(new SomedayTask({ title: "Order doors", projectId: "p-1" }).belongsToProject).toBe(true);
  });

  it("is false for a true someday task", () => {
    expect(new SomedayTask({ title: "Learn the cello" }).belongsToProject).toBe(false);
  });

  it("is true for a scheduled project task, which is not in the backlog", () => {
    // Pulling work out of a backlog into a day keeps its project. Both call sites read this on
    // weekless rows only, where "belongs to a project" and "is in the backlog" coincide.
    const scheduled = new WeeklyTask({
      title: "Measure the units",
      weekCode: "2026w30",
      dayOfWeek: "2",
      projectId: "p-1",
    });

    expect(scheduled.belongsToProject).toBe(true);
  });
});
