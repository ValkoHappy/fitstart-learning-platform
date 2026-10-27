import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import { getNextAvailableLesson } from "../lib/learningRules";
import styles from "./StudentDashboard.module.scss";
import OptimizedImage from "../Components/OptimizedImage";
function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [modulesByCourse, setModulesByCourse] = useState({});
  useEffect(() => {
    axios
      .get(`${API_URL}/?action=getCourses`, { withCredentials: true })
      .then((response) => {
        const items = Array.isArray(response.data) ? response.data : [];
        setCourses(items);
        items
          .filter((course) => course.has_access)
          .forEach((course) => {
            axios
              .get(
                `${API_URL}/?action=getCourseContent&id=${course.id_course}`,
                { withCredentials: true },
              )
              .then((content) => {
                if (content.data.success) {
                  setModulesByCourse((prev) => ({
                    ...prev,
                    [course.id_course]: content.data.modules,
                  }));
                }
              });
          });
      })
      .catch(() => setCourses([]));
    axios
      .get(`${API_URL}/?action=getApplications`, { withCredentials: true })
      .then((response) =>
        setApplications(Array.isArray(response.data) ? response.data : []),
      )
      .catch(() => setApplications([]));
  }, []);
  const availableCourses = useMemo(
    () => courses.filter((course) => course.has_access),
    [courses],
  );
  const averageProgress = availableCourses.length
    ? Math.round(
        availableCourses.reduce(
          (sum, course) => sum + Number(course.progress || 0),
          0,
        ) / availableCourses.length,
      )
    : 0;
  const focusCourse = useMemo(() => {
    const active =
      availableCourses.find((course) => Number(course.progress || 0) < 100) ||
      availableCourses[0];
    if (!active) return null;
    return {
      course: active,
      nextLesson: getNextAvailableLesson(
        modulesByCourse[active.id_course] || [],
      ),
    };
  }, [availableCourses, modulesByCourse]);
  const pendingApplication = useMemo(
    () =>
      applications.find((item) => [1, 2].includes(Number(item.id_status))) ||
      applications[0],
    [applications],
  );
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>Личный кабинет</p>
          <h1>
            {user?.first_name
              ? `${user.first_name}, продолжаем обучение`
              : "Продолжаем обучение"}
          </h1>
          <span>
            Ваши курсы, ближайшие уроки, заявки и статусы проверки в одном
            месте.
          </span>
        </div>
        <div className={styles.metrics}>
          <article>
            <strong>{availableCourses.length}</strong>
            <span>курсов открыто</span>
          </article>
          <article>
            <strong>{averageProgress}%</strong>
            <span>средний прогресс</span>
          </article>
          <article>
            <strong>{applications.length}</strong>
            <span>заявок</span>
          </article>
        </div>
      </header>

      <section className={styles.nextActions} aria-label="Следующие действия">
        <article className={styles.primaryAction}>
          <span>Следующий шаг</span>
          <h2>
            {focusCourse
              ? focusCourse.course.title
              : "Выберите курс для старта"}
          </h2>
          <p>
            {focusCourse
              ? focusCourse.nextLesson
                ? `Продолжите с ближайшего доступного урока: ${focusCourse.nextLesson.title}`
                : "Откройте программу курса и выберите доступный урок."
              : "Каталог уже готов: посмотрите программу, условия доступа и отправьте заявку."}
          </p>
          <Link
            to={
              focusCourse
                ? focusCourse.nextLesson
                  ? `/course/${focusCourse.course.id_course}/lesson/${focusCourse.nextLesson.id_lesson}`
                  : `/course/${focusCourse.course.id_course}`
                : "/courses"
            }
          >
            {focusCourse ? "Продолжить обучение" : "Открыть каталог"}
          </Link>
        </article>
        <article>
          <span>Заявки</span>
          <h3>
            {pendingApplication
              ? pendingApplication.status_name ||
                `Статус ${pendingApplication.id_status}`
              : "Нет активных заявок"}
          </h3>
          <p>
            {pendingApplication
              ? pendingApplication.course_title || "Курс"
              : "Подайте заявку на курс, если доступ ещё не открыт."}
          </p>
          <Link to={pendingApplication ? "/applications" : "/courses"}>
            {pendingApplication ? "Посмотреть заявки" : "Выбрать курс"}
          </Link>
        </article>
        <article>
          <span>Каталог</span>
          <h3>Новые направления</h3>
          <p>
            Можно открыть ещё один курс или вернуться к описанию программы перед
            заявкой.
          </p>
          <Link to="/courses">Все курсы</Link>
        </article>
      </section>

      <section className={styles.grid}>
        {availableCourses.length === 0 && (
          <div className={styles.empty}>
            <h2>Доступных курсов пока нет</h2>
            <p>
              Выберите курс в каталоге и отправьте заявку. После одобрения он
              появится здесь.
            </p>
            <Link to="/courses">Перейти в каталог</Link>
          </div>
        )}

        {availableCourses.map((course) => {
          const modules = modulesByCourse[course.id_course] || [];
          const nextLesson = getNextAvailableLesson(modules);
          return (
            <article key={course.id_course} className={styles.coursePanel}>
              <div className={styles.courseCover}>
                {course.image_path ? (
                  <OptimizedImage src={course.image_path} alt={course.title} />
                ) : (
                  <div className={styles.courseCoverFallback}>
                    {String(course.title || "ST")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <span>{course.progress || 0}% пройдено</span>
                <h2>{course.title}</h2>
                <p>{course.description || "Описание курса скоро появится."}</p>
              </div>
              <div className={styles.progressBar}>
                <i style={{ width: `${course.progress || 0}%` }} />
              </div>
              <Link
                to={
                  nextLesson
                    ? `/course/${course.id_course}/lesson/${nextLesson.id_lesson}`
                    : `/course/${course.id_course}`
                }
              >
                {nextLesson ? "Продолжить обучение" : "Открыть курс"}
              </Link>
            </article>
          );
        })}
      </section>

      <section className={styles.applications}>
        <div className={styles.sectionTitle}>
          <h2>Мои заявки</h2>
          <Link to="/courses">Подать новую</Link>
        </div>
        {applications.length === 0 && (
          <p>Заявок пока нет. Выберите курс и отправьте заявку на доступ.</p>
        )}
        {applications.map((item) => (
          <div key={item.id_application} className={styles.applicationRow}>
            <div>
              <strong>{item.course_title || "Курс"}</strong>
              <span>
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString("ru-RU")
                  : "дата не указана"}
              </span>
            </div>
            <div className={styles.applicationStatus}>
              <b>{item.status_name || `Статус ${item.id_status}`}</b>
              {Number(item.id_status) === 3 && (
                <Link to={`/course/${item.id_course}`}>Открыть курс</Link>
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
export default StudentDashboard;
