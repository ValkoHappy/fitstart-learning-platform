export function flattenLessons(modules = []) {
  return modules.flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      ...lesson,
      module_id: module.id_module,
      module_title: module.title,
    })),
  );
}
export function isLessonCompleted(lesson = {}) {
  if (lesson.type === "task") {
    return lesson.submission_status === "accepted";
  }
  if (lesson.type === "quiz") {
    return Boolean(lesson.quiz_passed || lesson.completed);
  }
  return Boolean(lesson.completed);
}
export function isLessonProgressSatisfied(lesson = {}) {
  if (lesson.type === "task") {
    return ["submitted", "review", "accepted"].includes(
      lesson.submission_status,
    );
  }
  return isLessonCompleted(lesson);
}
export function getLessonAccessState(modules = [], lessonId) {
  const lessons = flattenLessons(modules);
  const targetIndex = lessons.findIndex(
    (lesson) => Number(lesson.id_lesson) === Number(lessonId),
  );
  if (targetIndex === -1) {
    return { unlocked: false, reason: "not_found" };
  }
  if (targetIndex === 0) {
    return { unlocked: true, reason: "first_lesson" };
  }
  const previousLesson = lessons[targetIndex - 1];
  const unlocked = isLessonProgressSatisfied(previousLesson);
  return {
    unlocked,
    reason: unlocked ? "previous_completed" : "previous_required",
    previousLesson,
  };
}
export function getLessonLockReason(accessState = {}) {
  if (accessState.unlocked) return "";
  if (accessState.reason === "not_found") return "Урок не найден в программе.";
  const previous = accessState.previousLesson || {};
  if (previous.type === "quiz") {
    return `Сначала пройдите тест "${previous.title || "предыдущий тест"}" на проходной балл.`;
  }
  if (previous.type === "task") {
    if (
      previous.submission_status === "submitted" ||
      previous.submission_status === "review"
    ) {
      return "Дождитесь проверки домашнего задания куратором.";
    }
    if (previous.submission_status === "needs_revision") {
      return "Исправьте домашнее задание и отправьте его повторно.";
    }
    return `Сначала сдайте домашнее задание "${previous.title || "предыдущего урока"}".`;
  }
  return `Сначала завершите урок "${previous.title || "предыдущий урок"}".`;
}
export function getNextAvailableLesson(modules = []) {
  const lessons = flattenLessons(modules);
  return (
    lessons.find((lesson) => {
      const access = getLessonAccessState(modules, lesson.id_lesson);
      return access.unlocked && !isLessonProgressSatisfied(lesson);
    }) ||
    lessons[0] ||
    null
  );
}
