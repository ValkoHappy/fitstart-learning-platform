import styles from "../../Pages/CourseBuilder.module.scss";
import OptimizedImage from "../../Components/OptimizedImage";
export default function CourseMetaForm({
  handleSaveCourseMeta,
  courseMeta,
  setCourseMeta,
  courseImageInputRef,
  handleCourseImageChange,
  courseImagePreview,
  course,
  isSavingCourse,
}) {
  return (
    <form className={styles.courseMetaPanel} onSubmit={handleSaveCourseMeta}>
      <div className={styles.courseMetaFields}>
        <div className={styles.panelTitle}>
          <span className={styles.kicker}>Настройки курса</span>
          <h2>Обложка, описание и доступ</h2>
        </div>

        <label>
          Название курса
          <input
            type="text"
            value={courseMeta.title}
            onChange={(e) =>
              setCourseMeta({ ...courseMeta, title: e.target.value })
            }
            required
          />
        </label>

        <label>
          Описание для лендинга и каталога
          <textarea
            rows="4"
            value={courseMeta.description}
            onChange={(e) =>
              setCourseMeta({ ...courseMeta, description: e.target.value })
            }
          />
        </label>

        <div className={styles.metaRow}>
          <label>
            Тип доступа
            <select
              value={courseMeta.access_type}
              onChange={(e) =>
                setCourseMeta({ ...courseMeta, access_type: e.target.value })
              }
            >
              <option value="application">По заявке</option>
              <option value="free">Свободный доступ</option>
              <option value="paid_later">Оплата позже</option>
            </select>
          </label>

          <div className={styles.filePickerLabel}>
            <span className={styles.filePickerTitle}>Новая обложка</span>
            <input
              ref={courseImageInputRef}
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={handleCourseImageChange}
            />
            <button
              type="button"
              className={styles.filePickerButton}
              onClick={() => courseImageInputRef.current?.click()}
            >
              Выберите файл
            </button>
            <span className={styles.fileName}>
              {courseMeta.image_file?.name || "Файл не выбран"}
            </span>
          </div>
        </div>
      </div>

      <aside className={styles.courseMetaPreview}>
        <div className={styles.coverPreview}>
          {courseImagePreview || course?.image_path ? (
            <OptimizedImage
              src={courseImagePreview || course.image_path}
              alt={courseMeta.title || course?.title || "Обложка курса"}
            />
          ) : (
            <span>ST</span>
          )}
        </div>
        <div>
          <strong>{courseMeta.title || "Название курса"}</strong>
          <p>
            {courseMeta.description ||
              "Краткое описание появится в карточке курса и на странице курса."}
          </p>
        </div>
        <button
          type="submit"
          className={styles.saveCourseBtn}
          disabled={isSavingCourse}
        >
          {isSavingCourse ? "Сохраняем..." : "Сохранить настройки"}
        </button>
      </aside>
    </form>
  );
}
