import styles from "../../Pages/CourseBuilder.module.scss";
export default function CourseStructure({
  setShowAddModule,
  showAddModule,
  handleCreateModule,
  newModuleTitle,
  setNewModuleTitle,
  setDropTargetModuleId,
  modules,
  activeModuleId,
  draggedModule,
  dropTargetModuleId,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  setActiveModuleId,
  toggleModule,
  collapsedModules,
  onHandleMouseDown,
  onHandleMouseUp,
  editingModuleId,
  handleUpdateModule,
  editingModuleTitle,
  setEditingModuleTitle,
  cancelEditModule,
  startEditModule,
  requestDeleteModule,
  setNewLesson,
  emptyLesson,
  setActiveLessonId,
  setShowAddLesson,
  setDropTargetLessonId,
  draggedLesson,
  dropTargetLessonId,
  openEditLesson,
  handleLessonDragStart,
  handleLessonDragOver,
  handleLessonDrop,
  getIcon,
}) {
  return (
    <div className={styles.structurePanel}>
      <h3>
        Структура курса
        <button
          className={styles.addBtn}
          onClick={() => setShowAddModule(true)}
          title="Добавить модуль"
        >
          +
        </button>
      </h3>

      {showAddModule && (
        <form
          onSubmit={handleCreateModule}
          className={styles.form}
          style={{ marginBottom: "1rem" }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Название модуля"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            required
          />
          <div className={styles.moduleFormBtns}>
            <button type="submit" className={styles.moduleSubmitBtn}>
              OK
            </button>
            <button
              type="button"
              onClick={() => setShowAddModule(false)}
              className={styles.moduleCancelBtn}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div
        className={styles.moduleList}
        onMouseLeave={() => setDropTargetModuleId(null)}
      >
        {modules.map((module) => (
          <div
            key={module.id_module}
            className={`
                                    ${styles.moduleItem}
                                    ${activeModuleId === module.id_module ? styles.active : ""}
                                    ${draggedModule?.id_module === module.id_module ? styles.dragged : ""}
                                    ${dropTargetModuleId === module.id_module ? styles.dropTarget : ""}
                                `}
            draggable
            onDragStart={(e) => handleDragStart(e, module)}
            onDragOver={(e) => handleDragOver(e, module)}
            onDrop={(e) => handleDrop(e, module)}
            onDragEnd={handleDragEnd}
          >
            <div
              className={styles.moduleHeader}
              onClick={() => setActiveModuleId(module.id_module)}
            >
              <div className={styles.moduleHeaderMain}>
                <div
                  onClick={(e) => toggleModule(e, module.id_module)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    opacity: 0.7,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: collapsedModules[module.id_module]
                        ? "rotate(-90deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                <span
                  className={styles.dragHandle}
                  title="Перетащить модуль"
                  onMouseDown={onHandleMouseDown}
                  onMouseUp={onHandleMouseUp}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="9" cy="12" r="1" />
                    <circle cx="9" cy="5" r="1" />
                    <circle cx="9" cy="19" r="1" />
                    <circle cx="15" cy="12" r="1" />
                    <circle cx="15" cy="5" r="1" />
                    <circle cx="15" cy="19" r="1" />
                  </svg>
                </span>
                {editingModuleId === module.id_module ? (
                  <form
                    className={styles.moduleTitleForm}
                    onSubmit={(e) => handleUpdateModule(e, module.id_module)}
                  >
                    <input
                      autoFocus
                      value={editingModuleTitle}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingModuleTitle(e.target.value)}
                    />
                    <button type="submit">Сохранить</button>
                    <button type="button" onClick={cancelEditModule}>
                      Отмена
                    </button>
                  </form>
                ) : (
                  <span className={styles.moduleTitle}>{module.title}</span>
                )}
              </div>

              <div className={styles.moduleActions}>
                <button
                  className={styles.iconBtn}
                  type="button"
                  onClick={(e) => startEditModule(e, module)}
                  title="Переименовать модуль"
                >
                  ✎
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.dangerIconBtn}`}
                  type="button"
                  onClick={(e) => requestDeleteModule(e, module)}
                  title="Удалить модуль"
                >
                  ×
                </button>
                <button
                  className={styles.addBtn}
                  style={{ width: 24, height: 24, fontSize: "1rem" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModuleId(module.id_module);
                    setNewLesson(emptyLesson());
                    setActiveLessonId(null);
                    setShowAddLesson(true);
                  }}
                  title="Добавить урок"
                  type="button"
                >
                  +
                </button>
              </div>
            </div>

            {!collapsedModules[module.id_module] && (
              <div
                className={styles.lessonList}
                onMouseLeave={() => setDropTargetLessonId(null)}
              >
                {module.lessons &&
                  module.lessons.map((lesson) => (
                    <div
                      key={lesson.id_lesson}
                      className={`
                                                    ${styles.lessonItem}
                                                    ${draggedLesson?.lesson.id_lesson === lesson.id_lesson ? styles.dragged : ""}
                                                    ${dropTargetLessonId === lesson.id_lesson ? styles.dropTarget : ""}
                                                `}
                      onClick={() => openEditLesson(lesson)}
                      draggable
                      onDragStart={(e) =>
                        handleLessonDragStart(e, lesson, module)
                      }
                      onDragOver={(e) => handleLessonDragOver(e, lesson)}
                      onDrop={(e) => handleLessonDrop(e, lesson, module)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={styles.lessonIcon}>
                        {getIcon(lesson.type)}
                      </div>
                      <div className={styles.lessonContent}>
                        <div className={styles.lessonTitle}>{lesson.title}</div>
                        <div className={styles.lessonMeta}>
                          <span>
                            {lesson.type === "text" && "Статья"}
                            {lesson.type === "video" && "Видео"}
                            {lesson.type === "task" && "Задание"}
                            {lesson.type === "quiz" && "Тест"}
                            {lesson.type === "done" && "Выполнено"}
                          </span>
                          {lesson.duration && (
                            <>
                              <span>•</span>
                              <span>{lesson.duration}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={styles.dragHandle}
                        style={{ marginLeft: "auto", fontSize: "1.2rem" }}
                        title="Перетащить урок"
                        onMouseDown={onHandleMouseDown}
                        onMouseUp={onHandleMouseUp}
                      >
                        ⋮⋮
                      </span>
                    </div>
                  ))}
                {module.lessons?.length === 0 && (
                  <div
                    style={{
                      padding: "0.5rem",
                      fontSize: "0.8rem",
                      opacity: 0.5,
                    }}
                  >
                    Нет уроков
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
