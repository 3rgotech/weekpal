import { describe, expect, it } from "@jest/globals";
import Task from "../task";

describe("Task", () => {
  it("can be created", () => {
    const task = new Task({ title: "Test", id: 123 });
    expect(task.title).toBe("Test");
    expect(task.id).toBe(123);
    expect(task.serverId).toBeUndefined();
  });

  it("can be created with a server id", () => {
    const task = new Task({ title: "Test", id: 123, serverId: 456 });
    expect(task.id).toBe(123);
    expect(task.serverId).toBe(456);
  });

  it("can be created with a category", () => {
    const task = new Task({
      title: "Test",
      categoryId: 789,
    });
    expect(task.categoryId).toBe(789);
  });
});
