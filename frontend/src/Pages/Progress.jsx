import { useEffect, useMemo, useState } from "react";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import styles from "./Progress.module.scss";
function Progress() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  useEffect(() => {
    axios
      .get(`${API_URL}/?action=getProgressOverview`, { withCredentials: true })
      .then((response) => setItems(response.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const percent = Number(item.progress_percent || 0);
      const matchesText =
        !needle ||
        `${item.login || ""} ${item.first_name || ""} ${item.last_name || ""} ${item.email || ""} ${item.course_title || ""}`
          .toLowerCase()
          .includes(needle);
      const matchesCourse =
        courseFilter === "all" || String(item.id_course) === courseFilter;
      const matchesProgress =
        progressFilter === "all" ||
        (progressFilter === "not_started" && percent === 0) ||
        (progressFilter === "in_progress" && percent > 0 && percent < 100) ||
        (progressFilter === "completed" && percent >= 100);
      return matchesText && matchesCourse && matchesProgress;
    });
  }, [items, query, courseFilter, progressFilter]);
  const courses = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (item.id_course)
        map.set(
          String(item.id_course),
          item.course_title || `Курс ${item.id_course}`,
        );
    });
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title, "ru"),
    );
  }, [items]);
  const stats = useMemo(() => {
    const active = items.length;
    const average = active
      ? Math.round(
          items.reduce(
            (sum, item) => sum + Number(item.progress_percent || 0),
            0,
          ) / active,
        )
      : 0;
    const completed = items.filter(
      (item) => Number(item.progress_percent || 0) >= 100,
    ).length;
    return { active, average, completed };
  }, [items]);
  if (loading) return <Loader />;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Обучение</span>
          <h1>Прогресс учеников</h1>
          <p>
            Единый обзор по активным зачислениям: кто учится, где застрял и
            насколько пройдена программа.
          </p>
        </div>
        <div className={styles.stats}>
          <article>
            <strong>{stats.active}</strong>
            <span>активных доступов</span>
          </article>
          <article>
            <strong>{stats.average}%</strong>
            <span>средний прогресс</span>
          </article>
          <article>
            <strong>{stats.completed}</strong>
            <span>завершили курс</span>
          </article>
        </div>
      </header>

      <div className={styles.toolbar}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по ученику или курсу"
        />
        <select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
        >
          <option value="all">Все курсы</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <select
          value={progressFilter}
          onChange={(event) => setProgressFilter(event.target.value)}
        >
          <option value="all">Любой прогресс</option>
          <option value="not_started">Не начинали</option>
          <option value="in_progress">В процессе</option>
          <option value="completed">Завершили</option>
        </select>
      </div>

      <section className={styles.table}>
        <div className={styles.tableHead}>
          <span>Ученик</span>
          <span>Курс</span>
          <span>Прогресс</span>
          <span>Активность</span>
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>Активных зачислений пока нет.</div>
        )}

        {filtered.map((item) => {
          const name =
            [item.first_name, item.last_name].filter(Boolean).join(" ") ||
            item.login ||
            "Ученик";
          const percent = Number(item.progress_percent || 0);
          const progressTone =
            percent >= 100
              ? "completed"
              : percent > 0
                ? "inProgress"
                : "notStarted";
          return (
            <article key={item.id_enrollment} className={styles.row}>
              <div className={styles.userCell}>
                <div className={styles.avatar}>
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{name}</strong>
                  <span>{item.email || item.login}</span>
                </div>
              </div>
              <div className={styles.courseCell}>
                <strong>{item.course_title}</strong>
                <span>
                  {item.completed_lessons || 0} из {item.total_lessons || 0}{" "}
                  уроков
                </span>
              </div>
              <div className={styles.progressCell}>
                <div className={styles.progressBar}>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <strong>{percent}%</strong>
              </div>
              <div className={styles.activityCell}>
                <strong className={styles[progressTone]}>
                  {percent >= 100
                    ? "завершил"
                    : percent > 0
                      ? "учится"
                      : "не начинал"}
                </strong>
                <span>
                  {item.last_activity
                    ? new Date(item.last_activity).toLocaleDateString("ru-RU")
                    : "ещё не начинал"}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
export default Progress;
