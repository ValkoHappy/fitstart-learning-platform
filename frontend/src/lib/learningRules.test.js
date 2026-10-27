import test from "node:test";
import assert from "node:assert/strict";
import {
  flattenLessons,
  getLessonAccessState,
  getLessonLockReason,
  getNextAvailableLesson,
  isLessonCompleted,
  isLessonProgressSatisfied,
} from "./learningRules.js";
const modules = [
  {
    id_module: 1,
    title: "Start",
    lessons: [
      { id_lesson: 10, type: "text", completed: true },
      { id_lesson: 11, type: "quiz", quiz_passed: false, completed: false },
    ],
  },
  {
    id_module: 2,
    title: "Practice",
    lessons: [
      {
        id_lesson: 12,
        type: "task",
        submission_status: "accepted",
        completed: false,
      },
      { id_lesson: 13, type: "video", completed: false },
    ],
  },
];
test("flattenLessons keeps course order across modules", () => {
  assert.deepEqual(
    flattenLessons(modules).map((lesson) => lesson.id_lesson),
    [10, 11, 12, 13],
  );
});
test("lesson access opens the first lesson and locks after incomplete quiz", () => {
  assert.equal(getLessonAccessState(modules, 10).unlocked, true);
  assert.equal(getLessonAccessState(modules, 11).unlocked, true);
  assert.equal(getLessonAccessState(modules, 12).unlocked, false);
});
test("task is completed only after accepted review", () => {
  assert.equal(
    isLessonCompleted({ type: "task", submission_status: "submitted" }),
    false,
  );
  assert.equal(
    isLessonCompleted({ type: "task", submission_status: "accepted" }),
    true,
  );
});
test("submitted task opens the next lesson before curator accepts it", () => {
  const taskModules = [
    {
      id_module: 1,
      title: "Practice",
      lessons: [
        { id_lesson: 20, type: "task", submission_status: "submitted" },
        { id_lesson: 21, type: "text", completed: false },
      ],
    },
  ];
  assert.equal(isLessonCompleted(taskModules[0].lessons[0]), false);
  assert.equal(isLessonProgressSatisfied(taskModules[0].lessons[0]), true);
  assert.equal(getLessonAccessState(taskModules, 21).unlocked, true);
});
test("next available lesson points to the first incomplete unlocked lesson", () => {
  assert.equal(getNextAvailableLesson(modules).id_lesson, 11);
});
test("lock reason explains the blocking lesson type", () => {
  const access = getLessonAccessState(modules, 12);
  assert.match(getLessonLockReason(access), /тест/);
});
