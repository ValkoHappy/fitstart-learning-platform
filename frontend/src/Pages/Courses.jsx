import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../services/apiClient";
import styles from "./Courses.module.scss";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import { useNotification } from "../context/NotificationContext";
import { prepareCourseImageForUpload } from "../lib/courseImageUpload";
import { formatPhoneInput } from "../lib/phoneMask";
import OptimizedImage from "../Components/OptimizedImage";
function normalizeCourses(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
const emptyCourse = {
  title: "",
  description: "",
  access_type: "application",
  image_path: "",
  image_file: null,
};
const RUSSIAN_FULL_NAME_PATTERN =
  /^[\u0410-\u042F\u0430-\u044F\u0401\u0451]+(?:[ -][\u0410-\u042F\u0430-\u044F\u0401\u0451]+)*$/;
const accessFilters = [
  ["all", "Все"],
  ["opened", "Доступные"],
  ["application", "По заявке"],
  ["free", "Бесплатные"],
  ["pending", "Заявка отправлена"],
];
function Courses({ user, userRole }) {
  const { addNotification } = useNotification();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [searchQuery, setSearchQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const isAdmin = userRole === "admin";
  const isStaff = userRole === "admin" || userRole === "curator";
  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/?action=getCourses`, {
        withCredentials: true,
      });
      setCourses(normalizeCourses(response.data));
    } catch {
      addNotification("Не удалось загрузить курсы", "error");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchCourses();
  }, [user]);
  const stats = useMemo(() => {
    const opened = courses.filter((course) => course.has_access).length;
    const application = courses.filter(
      (course) => (course.access_type || "application") === "application",
    ).length;
    return { total: courses.length, opened, application };
  }, [courses]);
  const filteredCourses = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const haystack =
        `${course.title || ""} ${course.description || ""}`.toLowerCase();
      const hasAccess = Boolean(
        course.has_access ||
          userRole === "admin" ||
          course.access_type === "free",
      );
      const hasActiveApplication =
        !hasAccess && [1, 2, 3].includes(Number(course.application?.id_status));
      const matchesText = !needle || haystack.includes(needle);
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "opened" && hasAccess) ||
        (accessFilter === "application" &&
          (course.access_type || "application") === "application") ||
        (accessFilter === "free" && course.access_type === "free") ||
        (accessFilter === "pending" && hasActiveApplication);
      return matchesText && matchesAccess;
    });
  }, [accessFilter, courses, searchQuery, userRole]);
  const openCreateModal = () => {
    setEditingCourseId(null);
    setCourseForm(emptyCourse);
    setShowCourseModal(true);
  };
  const handleSaveCourse = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", courseForm.title);
      formData.append("description", courseForm.description);
      formData.append("access_type", courseForm.access_type || "application");
      if (courseForm.image_file) {
        const imageFile = await prepareCourseImageForUpload(
          courseForm.image_file,
        );
        formData.append("image", imageFile);
      }
      if (editingCourseId) formData.append("id", editingCourseId);
      const response = await axios.post(
        `${API_URL}/?action=${editingCourseId ? "updateCourse" : "createCourse"}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (response.data.success) {
        addNotification(
          editingCourseId ? "Курс обновлён" : "Курс создан",
          "success",
        );
        setShowCourseModal(false);
        setCourseForm(emptyCourse);
        setEditingCourseId(null);
        fetchCourses();
      } else {
        addNotification(
          response.data.message || "Не удалось сохранить курс",
          "error",
        );
      }
    } catch (error) {
      addNotification(
        error.response?.data?.message || "Ошибка сервера при сохранении курса",
        "error",
      );
    }
  };
  const handleGetAccess = (course) => {
    submitApplication(course, {
      full_name:
        [user?.last_name, user?.first_name].filter(Boolean).join(" ") ||
        user?.login ||
        "",
      email: user?.email || "",
      phone: formatPhoneInput(user?.phone || ""),
      comment: "",
    });
  };
  const submitApplication = async (targetCourse, payload) => {
    const fullName = (payload.full_name || "").trim();
    if (!RUSSIAN_FULL_NAME_PATTERN.test(fullName)) {
      addNotification(
        "\u0424\u0418\u041e \u0434\u043e\u043b\u0436\u043d\u043e \u0431\u044b\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u043d\u0430 \u0440\u0443\u0441\u0441\u043a\u043e\u043c \u044f\u0437\u044b\u043a\u0435",
        "error",
      );
      return;
    }
    if (!payload.email?.trim()) {
      addNotification("Email обязателен", "error");
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/?action=createApplication`,
        {
          id_course: targetCourse.id_course,
          ...payload,
          full_name: fullName,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Заявка отправлена", "success");
        setCourses((prev) =>
          prev.map((course) =>
            Number(course.id_course) === Number(targetCourse.id_course)
              ? {
                  ...course,
                  application: {
                    id_application: response.data.application_id,
                    id_status: 1,
                    status_name: "Ожидает проверки",
                  },
                }
              : course,
          ),
        );
        fetchCourses();
      } else {
        addNotification(
          response.data.message || "Не удалось отправить заявку",
          "error",
        );
      }
    } catch {
      addNotification("Ошибка сервера при отправке заявки", "error");
    }
  };
  if (isLoading) return <Loader />;
  return (
    <div className={styles.courses}>
      <div className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Каталог курсов</span>
          <h1>Выберите курс и начните обучение по программе</h1>
          <p>
            Курсы состоят из модулей, видео, лекций, домашних заданий, тестов и
            простых чекпоинтов. Доступ открывается после заявки или сразу для
            бесплатных программ.
          </p>
        </div>
        <div className={styles.stats}>
          <article>
            <strong>{stats.total}</strong>
            <span>курсов</span>
          </article>
          <article>
            <strong>{stats.opened}</strong>
            <span>доступно вам</span>
          </article>
          <article>
            <strong>{stats.application}</strong>
            <span>по заявке</span>
          </article>
        </div>
      </div>

      <div className={styles.headerRow}>
        <h2 className={styles.title}>Все курсы</h2>
        {isAdmin && (
          <button className={styles.createBtn} onClick={openCreateModal}>
            Добавить курс
          </button>
        )}
      </div>

      <div className={styles.catalogToolbar}>
        <label className={styles.searchField}>
          <span>Поиск</span>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Название, тема или описание"
          />
        </label>
        <div className={styles.filterChips} aria-label="Фильтр доступа">
          {accessFilters.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={accessFilter === value ? styles.activeChip : ""}
              onClick={() => setAccessFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className={styles.resultCount}>
          {filteredCourses.length} из {courses.length}
        </span>
      </div>

      <div className={styles.coursesGrid}>
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id_course}
            course={course}
            userRole={userRole}
            isStaff={isStaff}
            styles={styles}
            onAccess={handleGetAccess}
          />
        ))}
      </div>

      {courses.length === 0 && (
        <p className={styles.noCourses}>Курсы пока не добавлены.</p>
      )}

      {courses.length > 0 && filteredCourses.length === 0 && (
        <div className={styles.noCourses}>
          <h3>Ничего не найдено</h3>
          <p>Попробуйте другой запрос или сбросьте фильтр доступа.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setAccessFilter("all");
            }}
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {showCourseModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCourseModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => setShowCourseModal(false)}
            >
              ×
            </button>
            <h3>{editingCourseId ? "Редактировать курс" : "Новый курс"}</h3>
            <form className={styles.form} onSubmit={handleSaveCourse}>
              <label>
                Название
                <input
                  required
                  value={courseForm.title}
                  onChange={(event) =>
                    setCourseForm({ ...courseForm, title: event.target.value })
                  }
                />
              </label>
              <label>
                Описание
                <textarea
                  rows={5}
                  value={courseForm.description}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      description: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Тип доступа
                <select
                  value={courseForm.access_type}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      access_type: event.target.value,
                    })
                  }
                >
                  <option value="application">По заявке</option>
                  <option value="free">Свободный доступ</option>
                  <option value="paid_later">Оплата позже</option>
                </select>
              </label>
              <label>
                Обложка
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      image_file: event.target.files?.[0] || null,
                    })
                  }
                />
              </label>
              <button className={styles.submitBtn} type="submit">
                {editingCourseId ? "Сохранить" : "Создать"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function CourseCard({ course, userRole, isStaff, styles, onAccess }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasAccess = Boolean(
    course.has_access || userRole === "admin" || course.access_type === "free",
  );
  const hasActiveApplication =
    !hasAccess && [1, 2, 3].includes(Number(course.application?.id_status));
  const accessLabel =
    course.access_type === "free" ? "Свободный доступ" : "Доступ по заявке";
  return (
    <article className={styles.courseCard}>
      <div className={styles.courseImage}>
        {!imageLoaded && course.image_path && <div className="skeleton" />}
        {course.image_path ? (
          <OptimizedImage
            src={course.image_path}
            alt={course.title}
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
        ) : (
          <div className={styles.placeholderImage} />
        )}
        <span className={styles.accessBadge}>{accessLabel}</span>
      </div>

      <div className={styles.courseContent}>
        <h3 className={styles.courseTitle}>{course.title}</h3>
        <p className={styles.courseDescription}>
          {course.description || "Описание курса скоро появится."}
        </p>

        <div
          className={`${styles.progressContainer} ${!hasAccess ? styles.progressPlaceholder : ""}`}
          aria-hidden={!hasAccess}
        >
          {hasAccess ? (
            <>
              <div className={styles.progressHeader}>
                <span>{course.progress || 0}% выполнено</span>
                <span>{course.has_access ? "Открыт" : "Админ"}</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${course.progress || 0}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.progressHeader}>
                <span>0% РІС‹РїРѕР»РЅРµРЅРѕ</span>
                <span>РћС‚РєСЂС‹С‚</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} />
              </div>
            </>
          )}
        </div>

        <div className={styles.cardFooter}>
          {hasAccess ? (
            <Link
              to={`/course/${course.id_course}`}
              className={styles.openCourseBtn}
            >
              Открыть курс <span>→</span>
            </Link>
          ) : hasActiveApplication ? (
            <Link to="/applications" className={styles.pendingAccessBtn}>
              Заявка отправлена
            </Link>
          ) : userRole === "guest" ? (
            <Link to="/login" className={styles.getAccessBtn}>
              Войти и подать заявку <span>→</span>
            </Link>
          ) : (
            <button
              className={styles.getAccessBtn}
              onClick={() => onAccess(course)}
            >
              Получить доступ <span>→</span>
            </button>
          )}

          {isStaff && (
            <div className={styles.adminActions}>
              <Link
                to={`/course-builder/${course.id_course}`}
                className={styles.manageBtn}
              >
                Редактировать
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
export default Courses;
