import styles from "../../Pages/CourseBuilder.module.scss";
import QuizEditor from "./QuizEditor";
export default function LessonEditor({
  showAddLesson,
  activeModuleId,
  activeLessonId,
  modules,
  handleCreateLesson,
  newLesson,
  setNewLesson,
  removeQuestion,
  updateQuestion,
  updateOption,
  removeOption,
  addOption,
  addQuestion,
  setShowAddLesson,
  setActiveLessonId,
  handleDeleteLesson,
}) {
  return (
    <div className={styles.editorPanel}>
      {showAddLesson && activeModuleId ? (
        <div>
          <h3>
            {activeLessonId
              ? "Редактировать урок"
              : `Новый урок в модуль: ${modules.find((m) => m.id_module === activeModuleId)?.title}`}
          </h3>
          <form onSubmit={handleCreateLesson} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Название урока</label>
              <input
                type="text"
                value={newLesson.title}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, title: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Тип урока</label>
              <select
                value={newLesson.type}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, type: e.target.value })
                }
              >
                <option value="text">Текст / Статья</option>
                <option value="video">Видео</option>
                <option value="task">Задание</option>
                <option value="quiz">Тест</option>
                <option value="done">Простое выполнение</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Длительность (например: "10 мин")</label>
              <input
                type="text"
                value={newLesson.duration}
                onChange={(e) =>
                  setNewLesson({ ...newLesson, duration: e.target.value })
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Содержимое</label>
              {(newLesson.type === "text" || newLesson.type === "done") && (
                <textarea
                  rows="10"
                  placeholder={
                    newLesson.type === "done"
                      ? "Что должен сделать ученик перед отметкой выполнения..."
                      : "Введите текст урока или HTML..."
                  }
                  value={newLesson.content}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, content: e.target.value })
                  }
                />
              )}
              {newLesson.type === "video" && (
                <div className={styles.videoFields}>
                  <select
                    value={newLesson.video_provider}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        video_provider: e.target.value,
                      })
                    }
                  >
                    <option value="external">Внешняя ссылка</option>
                    <option value="youtube">YouTube</option>
                    <option value="rutube">Rutube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="kinescope">Kinescope</option>
                  </select>
                  <input
                    type="text"
                    placeholder="ID видео, Rutube/YouTube/Vimeo ссылка или embed"
                    value={newLesson.video_ref}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        video_ref: e.target.value,
                        content: e.target.value,
                      })
                    }
                  />
                  <textarea
                    rows="4"
                    placeholder="Краткое описание видео или конспект"
                    value={newLesson.content}
                    onChange={(e) =>
                      setNewLesson({ ...newLesson, content: e.target.value })
                    }
                  />
                </div>
              )}
              {newLesson.type === "task" && (
                <textarea
                  rows="8"
                  placeholder="Описание задания, требования, формат ответа и критерии проверки..."
                  value={newLesson.content}
                  onChange={(e) =>
                    setNewLesson({ ...newLesson, content: e.target.value })
                  }
                />
              )}
              {newLesson.type === "quiz" && (
                <QuizEditor
                  newLesson={newLesson}
                  setNewLesson={setNewLesson}
                  removeQuestion={removeQuestion}
                  updateQuestion={updateQuestion}
                  updateOption={updateOption}
                  removeOption={removeOption}
                  addOption={addOption}
                  addQuestion={addQuestion}
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <button type="submit" className={styles.submitBtn}>
                {activeLessonId ? "Сохранить изменения" : "Создать урок"}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                style={{ marginTop: "1rem" }}
                onClick={() => {
                  setShowAddLesson(false);
                  setActiveLessonId(null);
                }}
              >
                Отмена
              </button>

              {activeLessonId && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  style={{ marginTop: "1rem", marginLeft: "auto" }}
                  onClick={handleDeleteLesson}
                  title="Удалить урок"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
          <h3>Выберите модуль и добавьте урок, чтобы начать редактирование</h3>
        </div>
      )}
    </div>
  );
}
