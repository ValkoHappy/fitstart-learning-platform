import assert from "node:assert/strict";
import test from "node:test";
import {
  getQuizOptionState,
  prepareQuizQuestionsForStudent,
} from "./quizPresentation.js";
test("quiz option correctness is hidden before review", () => {
  const state = getQuizOptionState({
    correct: true,
    selected: false,
    showReview: false,
  });
  assert.equal(state.revealCorrect, false);
  assert.equal(state.revealWrong, false);
});
test("quiz option correctness is revealed after review", () => {
  const state = getQuizOptionState({
    correct: true,
    selected: false,
    showReview: true,
  });
  assert.equal(state.revealCorrect, true);
});
test("student quiz presentation does not keep the first correct option first when possible", () => {
  const questions = prepareQuizQuestionsForStudent(
    [
      {
        id_question: 1,
        question: "Question",
        options: [
          { id_option: 1, option_text: "Correct", is_correct: 1 },
          { id_option: 2, option_text: "Wrong A", is_correct: 0 },
          { id_option: 3, option_text: "Wrong B", is_correct: 0 },
        ],
      },
    ],
    "lesson-1",
  );
  assert.equal(Number(questions[0].options[0].is_correct), 0);
});
