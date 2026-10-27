function hashString(value) {
  return String(value)
    .split("")
    .reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    }, 0);
}
function optionSortValue(option, index, seed) {
  return Math.abs(
    hashString(
      `${seed}:${option.id_option ?? option.option_text ?? index}:${index}`,
    ),
  );
}
function isCorrectOption(option) {
  return Number(option?.is_correct) === 1 || option?.correct === true;
}
export function prepareQuizQuestionsForStudent(questions, seed = "") {
  return (questions || []).map((question, questionIndex) => {
    const options = [...(question.options || [])].sort((a, b) => {
      return (
        optionSortValue(
          a,
          0,
          `${seed}:${question.id_question ?? questionIndex}`,
        ) -
        optionSortValue(
          b,
          0,
          `${seed}:${question.id_question ?? questionIndex}`,
        )
      );
    });
    if (options.length > 1 && isCorrectOption(options[0])) {
      const firstWrongIndex = options.findIndex(
        (option) => !isCorrectOption(option),
      );
      if (firstWrongIndex > 0) {
        [options[0], options[firstWrongIndex]] = [
          options[firstWrongIndex],
          options[0],
        ];
      }
    }
    return { ...question, options };
  });
}
export function getQuizOptionState({ correct, selected, showReview }) {
  return {
    revealCorrect: Boolean(showReview && correct),
    revealWrong: Boolean(showReview && selected && !correct),
  };
}
