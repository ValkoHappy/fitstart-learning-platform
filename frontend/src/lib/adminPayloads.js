const defaultQuizQuestion = () => ({
  question: "",
  options: [
    { option_text: "", is_correct: true },
    { option_text: "", is_correct: false },
  ],
});
export function normalizeQuizQuestion(question = {}) {
  const options = Array.isArray(question.options) ? question.options : [];
  const normalizedOptions = options.map((option, index) => ({
    option_text: String(option.option_text ?? option.text ?? ""),
    is_correct: Boolean(option.is_correct ?? option.correct ?? index === 0),
  }));
  while (normalizedOptions.length < 2) {
    normalizedOptions.push({
      option_text: "",
      is_correct: normalizedOptions.length === 0,
    });
  }
  if (!normalizedOptions.some((option) => option.is_correct)) {
    normalizedOptions[0].is_correct = true;
  }
  const normalized = {
    question: String(question.question ?? ""),
    options: normalizedOptions.map((option, index) => ({
      option_text: option.option_text,
      is_correct: option.is_correct,
    })),
  };
  if (question.id_question) {
    normalized.id_question = question.id_question;
  }
  normalized.options = normalized.options.map((option, index) => {
    const source = options[index] || {};
    return source.id_option
      ? { ...option, id_option: source.id_option }
      : option;
  });
  return normalized;
}
export function parseQuizContent(content) {
  if (!content) {
    return [defaultQuizQuestion()];
  }
  try {
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      return [defaultQuizQuestion()];
    }
    return questions.map(normalizeQuizQuestion);
  } catch {
    return [defaultQuizQuestion()];
  }
}
export function buildLessonPayload(lesson) {
  const type = lesson.type || "text";
  const completionPolicy =
    {
      text: "manual",
      video: "manual",
      task: "review",
      quiz: "quiz",
      done: "manual",
    }[type] || "manual";
  const questions =
    type === "quiz"
      ? (lesson.questions || parseQuizContent(lesson.content)).map(
          normalizeQuizQuestion,
        )
      : [];
  return {
    ...(lesson.id_lesson ? { id_lesson: lesson.id_lesson } : {}),
    module_id: Number(lesson.module_id),
    title: lesson.title || "",
    type,
    content: type === "quiz" ? JSON.stringify(questions) : lesson.content || "",
    duration: lesson.duration || "",
    video_provider:
      type === "video" ? lesson.video_provider || "external" : null,
    video_ref: type === "video" ? lesson.video_ref || "" : null,
    pass_score: type === "quiz" ? Number(lesson.pass_score || 70) : null,
    completion_policy: lesson.completion_policy || completionPolicy,
  };
}
