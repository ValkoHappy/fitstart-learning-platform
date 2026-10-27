import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "../services/apiClient";
import styles from "./Course.module.scss";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import {
  getLessonAccessState,
  getLessonLockReason,
} from "../lib/learningRules";
import { useNotification } from "../context/NotificationContext";
import { formatPhoneInput } from "../lib/phoneMask";
const typeLabels = {
  text: "Лекция",
  video: "Видео",
  task: "Домашка",
  quiz: "Тест",
  done: "Действие",
};
const RUSSIAN_FULL_NAME_PATTERN =
  /^[\u0410-\u042F\u0430-\u044F\u0401\u0451]+(?:[ -][\u0410-\u042F\u0430-\u044F\u0401\u0451]+)*$/;
function Course({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [courseRes, contentRes] = await Promise.all([
        axios.get(`${API_URL}/?action=getCourse&id=${id}`, {
          withCredentials: true,
        }),
        axios.get(`${API_URL}/?action=getCourseContent&id=${id}`, {
          withCredentials: true,
        }),
      ]);
      if (courseRes.data.success) {
        setCourse(courseRes.data);
      } else {
        setError(courseRes.data.message || "Курс не найден");
      }
      if (contentRes.data.success) {
        setModules(contentRes.data.modules || []);
      }
    } catch {
      setError("Не удалось загрузить курс");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [id]);
  const totals = useMemo(() => {
    const lessons = modules.flatMap((module) => module.lessons || []);
    const completed = lessons.filter((lesson) => lesson.completed).length;
    return {
      lessons: lessons.length,
      modules: modules.length,
      completed,
      progress: lessons.length
        ? Math.round((completed / lessons.length) * 100)
        : 0,
    };
  }, [modules]);
  const openLesson = (lesson) => {
    if (!course?.has_access && !user) {
      navigate("/login");
      return;
    }
    navigate(`/course/${id}/lesson/${lesson.id_lesson}`);
  };
  const hasActiveApplication =
    !course?.has_access &&
    [1, 2, 3].includes(Number(course?.application?.id_status));
  const firstLessonId = modules[0]?.lessons?.[0]?.id_lesson;
  const submitApplication = async () => {
    const payload = {
      full_name:
        [user?.last_name, user?.first_name].filter(Boolean).join(" ") ||
        user?.login ||
        "",
      email: user?.email || "",
      phone: formatPhoneInput(user?.phone || ""),
      comment: "",
    };
    const fullName = payload.full_name.trim();
    if (!RUSSIAN_FULL_NAME_PATTERN.test(fullName)) {
      addNotification("ФИО должно быть только на русском языке", "error");
      return;
    }
    if (!payload.email.trim()) {
      addNotification("Email обязателен", "error");
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/?action=createApplication`,
        {
          id_course: Number(id),
          ...payload,
          full_name: fullName,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Заявка отправлена", "success");
        setCourse((prev) => ({
          ...prev,
          application: {
            id_application: response.data.application_id,
            id_status: 1,
            status_name: "Ожидает проверки",
          },
        }));
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
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <h3>Ошибка доступа</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate("/courses")}
            className={styles.backBtn}
          >
            Вернуться к курсам
          </button>
        </div>
      </div>
    );
  }
  if (!course) return null;
  return (
    <div className={styles.course}>
      <header className={styles.hero}>
        <div>
          <button
            onClick={() => navigate("/courses")}
            className={styles.backBtn}
          >
            ← Все курсы
          </button>
          <span className={styles.eyebrow}>
            {course.access_type === "free"
              ? "Свободный доступ"
              : "Доступ по заявке"}
          </span>
          <h1>{course.title}</h1>
          <p>{course.description || "Описание курса скоро появится."}</p>
          <div className={styles.heroActions}>
            {course.has_access ? (
              firstLessonId ? (
                <Link
                  to={`/course/${id}/lesson/${firstLessonId}`}
                  className={styles.primaryBtn}
                >
                  Начать обучение
                </Link>
              ) : (
                <button type="button" className={styles.secondaryBtn} disabled>
                  Уроки скоро появятся
                </button>
              )
            ) : hasActiveApplication ? (
              <Link to="/applications" className={styles.secondaryBtn}>
                Заявка отправлена
              </Link>
            ) : user ? (
              <button
                type="button"
                onClick={submitApplication}
                className={styles.primaryBtn}
              >
                Подать заявку
              </button>
            ) : (
              <Link to="/login" className={styles.primaryBtn}>
                Войти и подать заявку
              </Link>
            )}
          </div>
        </div>
        <aside className={styles.summary}>
          <article>
            <strong>{totals.modules}</strong>
            <span>модулей</span>
          </article>
          <article>
            <strong>{totals.lessons}</strong>
            <span>уроков</span>
          </article>
          <article>
            <strong>{totals.progress}%</strong>
            <span>прогресс</span>
          </article>
        </aside>
      </header>

      {user && course.has_access && (
        <section className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span>Прогресс курса</span>
            <span>
              {totals.completed} из {totals.lessons}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${totals.progress}%` }}
            />
          </div>
        </section>
      )}

      <section className={styles.modules}>
        {modules.map((module, moduleIndex) => (
          <article
            key={module.id_module || moduleIndex}
            className={styles.module}
          >
            <div className={styles.moduleHeader}>
              <div>
                <span>Модуль {moduleIndex + 1}</span>
                <h3>{module.title}</h3>
              </div>
              <strong>{module.lessons?.length || 0} уроков</strong>
            </div>
            <div className={styles.lessons}>
              {(module.lessons || []).map((lesson, lessonIndex) => {
                const access = getLessonAccessState(modules, lesson.id_lesson);
                const locked = course.has_access && !access.unlocked;
                const lessonIcon = lesson.completed
                  ? "✓"
                  : locked
                    ? "••"
                    : String(lessonIndex + 1).padStart(2, "0");
                const lockReason = locked ? getLessonLockReason(access) : "";
                return (
                  <button
                    type="button"
                    key={lesson.id_lesson}
                    className={`${styles.lesson} ${lesson.completed ? styles.completed : ""} ${locked ? styles.locked : ""}`}
                    onClick={() => openLesson(lesson)}
                  >
                    <span className={styles.lessonIcon}>{lessonIcon}</span>
                    <span className={styles.lessonContent}>
                      <strong>{lesson.title}</strong>
                      <small>
                        {lockReason ||
                          `${typeLabels[lesson.type] || "Урок"}${lesson.duration ? ` · ${lesson.duration}` : ""}`}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
export default Course;
