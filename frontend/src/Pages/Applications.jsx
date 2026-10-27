import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../services/apiClient";
import styles from "./Applications.module.scss";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
const statusTone = {
  1: "new",
  2: "review",
  3: "approved",
  4: "rejected",
};
function Applications() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState("created_at-DESC");
  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const [sortField, sortOrder] = sortOption.split("-");
      const response = await axios.get(
        `${API_URL}/?action=getApplications&sort=${sortField}&order=${sortOrder}`,
        {
          withCredentials: true,
        },
      );
      setApplications(Array.isArray(response.data) ? response.data : []);
    } catch {
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchApplications();
  }, [sortOption]);
  const stats = useMemo(
    () => ({
      total: applications.length,
      approved: applications.filter((item) => Number(item.id_status) === 3)
        .length,
      waiting: applications.filter((item) =>
        [1, 2].includes(Number(item.id_status)),
      ).length,
    }),
    [applications],
  );
  const formatDate = (dateString) => {
    if (!dateString) return "Дата не указана";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  if (isLoading) return <Loader />;
  return (
    <div className={styles.applications}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Заявки</span>
          <h1>Мои заявки на курсы</h1>
          <p>
            Здесь видны все отправленные заявки, их статус и контактные данные,
            с которыми заявка ушла на проверку.
          </p>
        </div>
        <div className={styles.stats}>
          <article>
            <strong>{stats.total}</strong>
            <span>всего</span>
          </article>
          <article>
            <strong>{stats.waiting}</strong>
            <span>в ожидании</span>
          </article>
          <article>
            <strong>{stats.approved}</strong>
            <span>одобрено</span>
          </article>
        </div>
      </header>

      <div className={styles.toolbar}>
        <select
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value)}
        >
          <option value="created_at-DESC">{"Новые сначала"}</option>
          <option value="created_at-ASC">{"Старые сначала"}</option>
          <option value="id_status-ASC">{"По статусу"}</option>
        </select>
        <Link to="/courses">Выбрать курс</Link>
      </div>

      {applications.length === 0 ? (
        <div className={styles.empty}>
          <h2>Заявок пока нет</h2>
          <p>Откройте каталог, выберите курс и отправьте заявку на доступ.</p>
          <Link to="/courses">Перейти к курсам</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {applications.map((app) => (
            <article key={app.id_application} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span>#{app.id_application}</span>
                  <h3>{app.course_title || "Курс"}</h3>
                </div>
                <b className={styles[statusTone[app.id_status] || "unknown"]}>
                  {app.status_name || "Неизвестный статус"}
                </b>
              </div>
              <div className={styles.cardBody}>
                <p>
                  <strong>Подана:</strong> {formatDate(app.created_at)}
                </p>
                {app.full_name && (
                  <p>
                    <strong>ФИО:</strong> {app.full_name}
                  </p>
                )}
                {app.email && (
                  <p>
                    <strong>Email:</strong> {app.email}
                  </p>
                )}
                {app.phone && (
                  <p>
                    <strong>Телефон:</strong> {app.phone}
                  </p>
                )}
              </div>
              {Number(app.id_status) === 3 && (
                <Link
                  className={styles.openCourse}
                  to={`/course/${app.id_course}`}
                >
                  Открыть курс
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export default Applications;
