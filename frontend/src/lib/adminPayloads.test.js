import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLessonPayload,
  normalizeQuizQuestion,
  parseQuizContent,
} from "./adminPayloads.js";
test("buildLessonPayload maps lesson type to completion policy and video fields", () => {
  assert.deepEqual(
    buildLessonPayload({
      module_id: 4,
      title: "Video intro",
      type: "video",
      duration: "12 min",
      video_provider: "vimeo",
      video_ref: "https://player.vimeo.com/video/1",
    }),
    {
      module_id: 4,
      title: "Video intro",
      type: "video",
      content: "",
      duration: "12 min",
      video_provider: "vimeo",
      video_ref: "https://player.vimeo.com/video/1",
      pass_score: null,
      completion_policy: "manual",
    },
  );
});
test("buildLessonPayload serializes quiz questions and pass score", () => {
  const payload = buildLessonPayload({
    module_id: 2,
    title: "Quiz",
    type: "quiz",
    pass_score: "80",
    questions: [
      {
        question: "2 + 2?",
        options: [
          { option_text: "3", is_correct: false },
          { option_text: "4", is_correct: true },
        ],
      },
    ],
  });
  assert.equal(payload.completion_policy, "quiz");
  assert.equal(payload.pass_score, 80);
  assert.deepEqual(JSON.parse(payload.content), [
    {
      question: "2 + 2?",
      options: [
        { option_text: "3", is_correct: false },
        { option_text: "4", is_correct: true },
      ],
    },
  ]);
});
test("normalizeQuizQuestion keeps at least two options and one correct answer", () => {
  const question = normalizeQuizQuestion({
    question: "Ready?",
    options: [{ option_text: "yes" }],
  });
  assert.equal(question.options.length, 2);
  assert.equal(question.options[0].is_correct, true);
});
test("normalizeQuizQuestion preserves several correct options", () => {
  const question = normalizeQuizQuestion({
    question: "Pick all",
    options: [
      { option_text: "A", is_correct: true },
      { option_text: "B", is_correct: true },
      { option_text: "C", is_correct: false },
    ],
  });
  assert.deepEqual(
    question.options.map((option) => option.is_correct),
    [true, true, false],
  );
});
test("parseQuizContent returns editable defaults for empty content", () => {
  const questions = parseQuizContent("");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].options.length, 2);
});
