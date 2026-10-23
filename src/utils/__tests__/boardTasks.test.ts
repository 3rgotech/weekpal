import { describe, expect, it } from "@jest/globals";
import { mergeTaskChanges } from "../boardTasks";
import Task, { SomedayTask, WeeklyTask } from "../../data/task";

const WEEK = "2026w43";
const isBacklogTask = (task: Task) => task.taskType === "someday" && task.belongsToProject;

const titles = (tasks: Task[]) => tasks.map((task) => task.title);

describe("the board's tasks after a change", () => {
    it("takes a task sent to another week off this one straight away", () => {
        const plumber = new WeeklyTask({ title: "Ring the plumber", weekCode: WEEK, dayOfWeek: "3" });
        const dentist = new WeeklyTask({ title: "Book the dentist", weekCode: WEEK, dayOfWeek: "3" });
        const moved = new WeeklyTask({ ...plumber, weekCode: "2026w44" });

        expect(titles(mergeTaskChanges([plumber, dentist], [moved], WEEK, isBacklogTask))).toEqual(["Book the dentist"]);
    });

    it("replaces a task that changed within the week", () => {
        const plumber = new WeeklyTask({ title: "Ring the plumber", weekCode: WEEK, dayOfWeek: "3" });
        const moved = new WeeklyTask({ ...plumber, dayOfWeek: "5" });

        const result = mergeTaskChanges([plumber], [moved], WEEK, isBacklogTask);

        expect(result).toHaveLength(1);
        expect((result[0] as WeeklyTask).dayOfWeek).toBe("5");
    });

    it("adds a task that arrives in this week or in Some day, and not one from elsewhere", () => {
        const arriving = new WeeklyTask({ title: "Arriving", weekCode: WEEK, dayOfWeek: "1" });
        const someday = new SomedayTask({ title: "Flip mattress" });
        const elsewhere = new WeeklyTask({ title: "Elsewhere", weekCode: "2026w40", dayOfWeek: "1" });

        expect(titles(mergeTaskChanges([], [arriving, someday, elsewhere], WEEK, isBacklogTask)))
            .toEqual(["Arriving", "Flip mattress"]);
    });

    it("hands a task filed into a project over to the drawer", () => {
        const idea = new SomedayTask({ title: "Flip mattress" });
        const filed = new SomedayTask({ ...idea, projectId: "p1" });

        expect(mergeTaskChanges([idea], [filed], WEEK, isBacklogTask)).toEqual([]);
    });
});
