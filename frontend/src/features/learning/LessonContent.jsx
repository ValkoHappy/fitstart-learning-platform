import styles from "../../Pages/LessonViewer.module.scss";
import {
  getQuizOptionState,
  prepareQuizQuestionsForStudent,
} from "../../lib/quizPresentation";
export default function LessonContent({
  typeLabels,
  currentLesson,
  videoSrc,
  hasLessonText,
  taskStatus,
  submissionLabels,
  canSubmitTask,
  submitAssignment,
  assignmentText,
  setAssignmentText,
  assignmentLink,
  setAssignmentLink,
  setAssignmentFiles,
  assignmentFilesLabel,
  selectedAssignmentFiles,
  hasVisibleQuizResult,
  visibleQuizPassed,
  visibleQuizScore,
  visibleQuizPassScore,
  restartQuiz,
  setShowQuizHint,
  showQuizHint,
  quizPassed,
  showQuizReview,
  hasQuizAttempt,
  quizRetryMode,
  submitQuiz,
  quizData,
  getQuestionKey,
  allowsMultipleAnswers,
  getOptionValue,
  isCorrectOption,
  isSelectedOption,
  quizInputsDisabled,
  updateQuizAnswer,
  statusMessage,
  prevLesson,
  handleLessonChange,
  markCurrentLessonComplete,
  videoCompletionBlocked,
  nextLesson,
  quizLocked,
  navigate,
  courseId,
}) {
  return (
    <article className={styles.contentContainer}>
      <header className={styles.lessonContentHeader}>
        <span className={styles.typeTag}>
          {typeLabels[currentLesson.type] || "Урок"}
        </span>
        <h1>{currentLesson.title}</h1>
        {currentLesson.duration && <p>{currentLesson.duration}</p>}
      </header>

      {currentLesson.type === "video" &&
        (videoSrc ? (
          <>
            <div className={styles.videoWrapper}>
              <iframe
                src={videoSrc}
                title={currentLesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            {currentLesson.content && (
              <div className={styles.markupContent}>
                {currentLesson.content}
              </div>
            )}
          </>
        ) : (
          <div className={styles.markupContent}>
            {hasLessonText
              ? "Видео пока не добавлено. Урок можно пройти по конспекту ниже."
              : "Видео пока не добавлено. Завершение урока временно недоступно."}
          </div>
        ))}

      {currentLesson.type === "video" && !videoSrc && currentLesson.content && (
        <div className={styles.markupContent}>{currentLesson.content}</div>
      )}

      {currentLesson.type !== "video" && currentLesson.type !== "quiz" && (
        <div className={styles.markupContent}>
          {currentLesson.content || "Материал урока скоро появится."}
        </div>
      )}

      {currentLesson.type === "task" && (
        <>
          {taskStatus && (
            <div
              className={`${styles.submissionStatus} ${styles[taskStatus] || ""}`}
            >
              <div>
                <span>{submissionLabels[taskStatus] || taskStatus}</span>
                <strong>
                  {taskStatus === "accepted" &&
                    "Домашка зачтена, следующий урок открыт."}
                  {taskStatus === "needs_revision" &&
                    "Исправьте работу и отправьте новую попытку."}
                  {(taskStatus === "submitted" || taskStatus === "review") &&
                    "Куратор скоро проверит работу."}
                </strong>
              </div>
              {currentLesson.submitted_at && (
                <small>
                  Сдано:{" "}
                  {new Date(currentLesson.submitted_at).toLocaleDateString(
                    "ru-RU",
                  )}
                </small>
              )}
              {currentLesson.latest_answer_text && (
                <p>{currentLesson.latest_answer_text}</p>
              )}
              {currentLesson.latest_answer_link && (
                <a
                  href={currentLesson.latest_answer_link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {currentLesson.latest_answer_link}
                </a>
              )}
              {Array.isArray(currentLesson.submission_files) &&
                currentLesson.submission_files.length > 0 && (
                  <div className={styles.filesList}>
                    {currentLesson.submission_files.map((file) => (
                      <a
                        key={file.id_file || file.file_path}
                        href={file.file_path}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {file.original_name}
                      </a>
                    ))}
                  </div>
                )}
              {currentLesson.reviewer_comment && (
                <blockquote>
                  <b>Комментарий куратора</b>
                  {currentLesson.reviewer_comment}
                </blockquote>
              )}
            </div>
          )}

          {canSubmitTask && (
            <form className={styles.workPanel} onSubmit={submitAssignment}>
              <h3>
                {taskStatus === "needs_revision"
                  ? "Отправить новую попытку"
                  : "Сдать задание"}
              </h3>
              <textarea
                value={assignmentText}
                onChange={(event) => setAssignmentText(event.target.value)}
                rows={6}
                placeholder="Ответ или описание работы"
              />
              <input
                value={assignmentLink}
                onChange={(event) => setAssignmentLink(event.target.value)}
                placeholder="Ссылка на работу"
              />
              <label className={styles.filePicker}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={(event) => setAssignmentFiles(event.target.files)}
                />
                <span className={styles.filePickerBtn}>Выбрать файлы</span>
                <span className={styles.filePickerText}>
                  {assignmentFilesLabel}
                </span>
              </label>
              {selectedAssignmentFiles.length > 0 && (
                <div className={styles.selectedFiles}>
                  {selectedAssignmentFiles.slice(0, 5).map((file) => (
                    <span key={`${file.name}-${file.size}`}>{file.name}</span>
                  ))}
                </div>
              )}
              <small className={styles.fileHint}>
                До 5 файлов, каждый до 10 МБ. PDF, DOC, изображения, TXT, ZIP.
              </small>
              <button className={styles.completeBtn} type="submit">
                Отправить на проверку
              </button>
            </form>
          )}
        </>
      )}

      {currentLesson.type === "quiz" && (
        <>
          {hasVisibleQuizResult && (
            <div
              className={`${styles.quizResult} ${visibleQuizPassed ? styles.accepted : styles.needs_revision}`}
            >
              <span>
                {visibleQuizPassed ? "Тест пройден" : "Попробуйте еще раз"}
              </span>
              <strong>{visibleQuizScore}%</strong>
              <p>
                Проходной балл: {visibleQuizPassScore}%.
                {currentLesson.quiz_attempted_at
                  ? ` Последняя попытка: ${new Date(currentLesson.quiz_attempted_at).toLocaleDateString("ru-RU")}.`
                  : ""}
              </p>
              {!visibleQuizPassed && (
                <button
                  type="button"
                  className={styles.retryQuizBtn}
                  onClick={restartQuiz}
                >
                  Начать заново
                </button>
              )}
            </div>
          )}

          <div className={styles.quizToolbar}>
            <button
              type="button"
              className={styles.hintBtn}
              onClick={() => setShowQuizHint((prev) => !prev)}
            >
              Подсказка
            </button>
            {showQuizHint && (
              <div className={styles.hintPanel}>
                Смотрите на безопасность клиента, технику, порядок действий и
                только потом на “красивый” ответ.
              </div>
            )}
          </div>

          {!quizPassed &&
            !showQuizReview &&
            (!hasQuizAttempt || quizRetryMode) && (
              <form className={styles.workPanel} onSubmit={submitQuiz}>
                <h3>{hasQuizAttempt ? "Повторить тест" : "Тест"}</h3>
                {(quizData?.questions || []).map((question, questionIndex) => {
                  const questionKey = getQuestionKey(question, questionIndex);
                  const isMultiple = allowsMultipleAnswers(question);
                  return (
                    <div key={questionKey} className={styles.quizQuestion}>
                      <p>{question.question}</p>
                      {isMultiple && (
                        <small className={styles.quizHint}>
                          Выберите все правильные варианты.
                        </small>
                      )}
                      {(question.options || []).map((option, optionIndex) => {
                        const optionValue = getOptionValue(option, optionIndex);
                        const correct = isCorrectOption(option);
                        const selected = isSelectedOption(
                          question,
                          questionIndex,
                          option,
                          optionIndex,
                        );
                        const { revealCorrect, revealWrong } =
                          getQuizOptionState({
                            correct,
                            selected,
                            showReview: showQuizReview,
                          });
                        const optionClass = `${styles.quizOption} ${revealCorrect ? styles.optionCorrect : ""} ${revealWrong ? styles.optionWrong : ""}`;
                        return (
                          <label
                            key={option.id_option || optionIndex}
                            className={optionClass}
                          >
                            <input
                              type={isMultiple ? "checkbox" : "radio"}
                              name={`question-${questionKey}`}
                              checked={selected}
                              disabled={quizInputsDisabled}
                              onChange={(event) =>
                                updateQuizAnswer(
                                  questionKey,
                                  optionValue,
                                  isMultiple,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>{option.option_text || option}</span>
                            {revealCorrect && <em>правильно</em>}
                            {revealWrong && <em>неверно</em>}
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                {!quizInputsDisabled && (
                  <button className={styles.completeBtn} type="submit">
                    Проверить тест
                  </button>
                )}
              </form>
            )}
        </>
      )}

      {statusMessage && (
        <div className={styles.statusMessage}>{statusMessage}</div>
      )}

      <footer className={styles.footerActions}>
        <button
          className={styles.navBtn}
          onClick={() => prevLesson && handleLessonChange(prevLesson.id_lesson)}
          disabled={!prevLesson}
        >
          Назад
        </button>
        {currentLesson.type !== "task" && currentLesson.type !== "quiz" && (
          <button
            className={styles.completeBtn}
            onClick={markCurrentLessonComplete}
            disabled={videoCompletionBlocked}
          >
            {nextLesson ? "Продолжить" : "Завершить курс"}
          </button>
        )}
        {currentLesson.type === "quiz" && quizLocked && (
          <button
            className={styles.completeBtn}
            onClick={() =>
              nextLesson
                ? handleLessonChange(nextLesson.id_lesson)
                : navigate(`/course/${courseId}`)
            }
          >
            {nextLesson ? "Продолжить" : "Завершить курс"}
          </button>
        )}
        {currentLesson.type === "task" && taskStatus === "accepted" && (
          <button
            className={styles.completeBtn}
            onClick={() =>
              nextLesson
                ? handleLessonChange(nextLesson.id_lesson)
                : navigate(`/course/${courseId}`)
            }
          >
            {nextLesson ? "Продолжить" : "Завершить курс"}
          </button>
        )}
      </footer>
    </article>
  );
}
