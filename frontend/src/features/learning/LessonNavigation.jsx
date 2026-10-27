import styles from "../../Pages/LessonViewer.module.scss";
import {
  flattenLessons,
  getLessonAccessState,
  getLessonLockReason,
} from "../../lib/learningRules";
export default function LessonNavigation({
  sidebarOpen,
  navigate,
  courseId,
  course,
  modules,
  lessonId,
  handleLessonChange,
}) {
  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
      <div className={styles.sidebarHeader}>
        <button
          className={styles.backLink}
          onClick={() => navigate(`/course/${courseId}`)}
        >
          ←
        </button>
        <div>
          <span>Курс</span>
          <h3>{course?.title}</h3>
        </div>
      </div>
      <div className={styles.modulesList}>
        {modules.map((module, moduleIndex) => (
          <div key={module.id_module} className={styles.moduleGroup}>
            <div className={styles.moduleHeader}>
              Модуль {moduleIndex + 1} · {module.title}
            </div>
            {(module.lessons || []).map((lesson, lessonIndex) => {
              const access = getLessonAccessState(modules, lesson.id_lesson);
              const lessonIcon = lesson.completed
                ? "✓"
                : access.unlocked
                  ? String(lessonIndex + 1).padStart(2, "0")
                  : "••";
              const lockReason = access.unlocked
                ? ""
                : getLessonLockReason(access);
              return (
                <button
                  type="button"
                  key={lesson.id_lesson}
                  className={`${styles.lessonItem} ${Number(lesson.id_lesson) === Number(lessonId) ? styles.active : ""} ${lesson.completed ? styles.completed : ""}`}
                  onClick={() => handleLessonChange(lesson.id_lesson)}
                >
                  <span className={styles.lessonIcon}>{lessonIcon}</span>
                  <span className={styles.lessonTitle}>
                    {lesson.title}
                    {lockReason && <small>{lockReason}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
