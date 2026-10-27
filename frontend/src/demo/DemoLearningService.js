import { demoCourses } from "./courses";
import { getLessonAccessState } from "../lib/learningRules";
export class DemoLearningService {
  constructor(store) {
    this.store = store;
  }
  course(id) {
    return demoCourses.find((course) => course.id_course === Number(id));
  }
  modules(id) {
    return structuredClone(this.course(id)?.modules || []).map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        ...this.store.lesson(lesson.id_lesson),
      })),
    }));
  }
  summary(course) {
    const lessons = this.modules(course.id_course).flatMap(
      (module) => module.lessons,
    );
    const { modules, ...summary } = course;
    return {
      ...summary,
      has_access: Boolean(this.store.user()),
      application: null,
      progress: Math.round(
        (lessons.filter((lesson) => lesson.completed).length / lessons.length) *
          100,
      ),
    };
  }
  lesson(id) {
    for (const course of demoCourses) {
      const lesson = course.modules
        .flatMap((module) => module.lessons)
        .find((item) => item.id_lesson === Number(id));
      if (lesson) return { course, lesson };
    }
    throw new Error("Урок не найден");
  }
  requireAccess(id) {
    if (!this.store.user()) throw new Error("Нужна авторизация");
    const { course, lesson } = this.lesson(id);
    if (!getLessonAccessState(this.modules(course.id_course), id).unlocked)
      throw new Error("Сначала завершите предыдущий урок");
    return lesson;
  }
  complete(id) {
    const lesson = this.requireAccess(id);
    if (["task", "quiz"].includes(lesson.type))
      throw new Error("Завершите задание или тест");
    this.store.updateLesson(id, { completed: true });
    return { success: true };
  }
  submitAssignment(data) {
    const id = Number(data.lesson_id);
    if (this.requireAccess(id).type !== "task")
      throw new Error("Это не практическое задание");
    if (
      !data.answer_text?.trim() &&
      !data.answer_link?.trim() &&
      !data.files?.length
    )
      throw new Error("Добавьте ответ на задание");
    this.store.updateLesson(id, {
      id_submission: id,
      submission_status: "submitted",
      latest_answer_text: data.answer_text || "",
      latest_answer_link: data.answer_link || "",
      submission_files: [],
      submitted_at: new Date().toISOString(),
    });
    return { success: true };
  }
  submitQuiz(data) {
    const id = Number(data.lesson_id),
      lesson = this.requireAccess(id);
    if (lesson.type !== "quiz") throw new Error("Это не тест");
    const { questions } = JSON.parse(lesson.content);
    const correct_answers = Object.fromEntries(
      questions.map((question) => [
        question.id_question,
        question.options
          .filter((option) => option.is_correct)
          .map((option) => option.id_option),
      ]),
    );
    const correctCount = questions.filter((question) => {
      const selected = data.answers?.[question.id_question] ?? [];
      const normalized = (Array.isArray(selected) ? selected : [selected])
        .map(String)
        .sort();
      return (
        JSON.stringify(normalized) ===
        JSON.stringify(correct_answers[question.id_question].map(String).sort())
      );
    }).length;
    const score = Math.round((correctCount / questions.length) * 100),
      passed = score >= lesson.pass_score;
    this.store.updateLesson(id, {
      quiz_score: score,
      quiz_passed: passed,
      quiz_answers_json: JSON.stringify(data.answers || {}),
      completed: passed,
    });
    return {
      success: true,
      score,
      passed,
      pass_score: lesson.pass_score,
      answers: data.answers,
      correct_answers,
    };
  }
}
