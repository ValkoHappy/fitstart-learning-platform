import styles from "../../Pages/CourseBuilder.module.scss";
export default function QuizEditor({
  newLesson,
  setNewLesson,
  removeQuestion,
  updateQuestion,
  updateOption,
  removeOption,
  addOption,
  addQuestion,
}) {
  return (
    <div className={styles.quizBuilder}>
      <label className={styles.inlineLabel}>
        Проходной балл, %
        <input
          type="number"
          min="1"
          max="100"
          value={newLesson.pass_score}
          onChange={(e) =>
            setNewLesson({ ...newLesson, pass_score: e.target.value })
          }
        />
      </label>
      <p className={styles.quizHint}>
        Можно отметить несколько правильных вариантов ответа.
      </p>
      {newLesson.questions.map((question, questionIndex) => (
        <div key={questionIndex} className={styles.quizQuestion}>
          <div className={styles.quizQuestionHeader}>
            <strong>Вопрос {questionIndex + 1}</strong>
            <button type="button" onClick={() => removeQuestion(questionIndex)}>
              Удалить
            </button>
          </div>
          <input
            type="text"
            placeholder="Текст вопроса"
            value={question.question}
            onChange={(e) =>
              updateQuestion(questionIndex, { question: e.target.value })
            }
          />
          <div className={styles.optionsList}>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className={styles.optionRow}>
                <input
                  type="checkbox"
                  checked={Boolean(option.is_correct)}
                  onChange={(e) =>
                    updateOption(questionIndex, optionIndex, {
                      is_correct: e.target.checked,
                    })
                  }
                  aria-label="Правильный ответ"
                />
                <input
                  type="text"
                  placeholder={`Вариант ${optionIndex + 1}`}
                  value={option.option_text}
                  onChange={(e) =>
                    updateOption(questionIndex, optionIndex, {
                      option_text: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeOption(questionIndex, optionIndex)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => addOption(questionIndex)}
          >
            Добавить вариант
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.secondaryBtn}
        onClick={addQuestion}
      >
        Добавить вопрос
      </button>
    </div>
  );
}
