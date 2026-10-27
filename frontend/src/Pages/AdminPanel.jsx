import { useEffect, useMemo, useState } from "react";
import axios from "../services/apiClient";
import styles from "./AdminPanel.module.scss";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import { useNotification } from "../context/NotificationContext";
const statusLabels = {
  1: "Новая",
  2: "В обработке",
  3: "Одобрена",
  4: "Отклонена",
};
const statusClass = {
  1: "new",
  2: "review",
  3: "approved",
  4: "rejected",
};
function AdminPanel() {
  const { addNotification } = useNotification();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [sortOption, setSortOption] = useState("created_at-DESC");
  const [statusFilter, setStatusFilter] = useState("1");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [newStatus, setNewStatus] = useState("1");
  const itemsPerPage = 12;
  const fetchApplications = async (page = currentPage) => {
    setIsLoading(true);
    try {
      const [sortField, sortOrder] = sortOption.split("-");
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const endpoint = searchValue.trim()
        ? `${API_URL}/?action=searchApplications&value=${encodeURIComponent(searchValue)}&page=${page}&limit=${itemsPerPage}&sort=${sortField}&order=${sortOrder}${statusParam}`
        : `${API_URL}/?action=getAllApplications&page=${page}&limit=${itemsPerPage}&sort=${sortField}&order=${sortOrder}${statusParam}`;
      const response = await axios.get(endpoint, { withCredentials: true });
      setApplications(
        response.data.items ||
          (Array.isArray(response.data) ? response.data : []),
      );
      setTotalPages(response.data.pages || 1);
    } catch {
      setApplications([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchApplications(currentPage);
  }, [currentPage, sortOption, statusFilter]);
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const waiting = applications.filter(
      (item) => Number(item.id_status) === 1,
    ).length;
    const inWork = applications.filter(
      (item) => Number(item.id_status) === 2,
    ).length;
    const approvedToday = applications.filter(
      (item) =>
        Number(item.id_status) === 3 &&
        item.updated_at &&
        new Date(item.updated_at).toDateString() === today,
    ).length;
    return { waiting, inWork, approvedToday };
  }, [applications]);
  const openStatusModal = (application) => {
    setSelectedApp(application);
    setNewStatus(String(application.id_status || 1));
  };
  const updateStatus = async () => {
    if (!selectedApp) return;
    try {
      const response = await axios.post(
        `${API_URL}/?action=updateApplicationStatus`,
        {
          id_application: selectedApp.id_application,
          id_status: Number(newStatus),
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Статус заявки обновлён", "success");
        setSelectedApp(null);
        fetchApplications(currentPage);
      } else {
        addNotification(
          response.data.message || "Не удалось обновить статус",
          "error",
        );
      }
    } catch {
      addNotification("Ошибка сервера при обновлении статуса", "error");
    }
  };
  const deleteApplication = async (application) => {
    const label =
      application.full_name ||
      application.email ||
      `#${application.id_application}`;
    if (
      !window.confirm(
        `Удалить заявку "${label}"? Если по ней был открыт доступ, он будет отозван.`,
      )
    ) {
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/?action=deleteApplication`,
        {
          id_application: application.id_application,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Заявка удалена", "success");
        fetchApplications(currentPage);
      } else {
        addNotification(
          response.data.message || "Не удалось удалить заявку",
          "error",
        );
      }
    } catch {
      addNotification("Ошибка сервера при удалении заявки", "error");
    }
  };
  const search = () => {
    setCurrentPage(1);
    fetchApplications(1);
  };
  return (
    <div className={styles.adminPanel}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Админка</span>
          <h1>Заявки на обучение</h1>
          <p>
            Очередь заявок с поиском, фильтрами и быстрым одобрением доступа к
            курсу.
          </p>
        </div>
        <div className={styles.stats}>
          <article>
            <strong>{stats.waiting}</strong>
            <span>новые</span>
          </article>
          <article>
            <strong>{stats.inWork}</strong>
            <span>в работе</span>
          </article>
          <article>
            <strong>{stats.approvedToday}</strong>
            <span>одобрены сегодня</span>
          </article>
        </div>
      </header>

      <div className={styles.searchBar}>
        <input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Поиск по имени, email или телефону"
        />
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Все статусы</option>
          <option value="1">Новые</option>
          <option value="2">В обработке</option>
          <option value="3">Одобренные</option>
          <option value="4">Отклонённые</option>
        </select>
        <select
          value={sortOption}
          onChange={(event) => {
            setSortOption(event.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="created_at-DESC">{"Новые сначала"}</option>
          <option value="created_at-ASC">{"Старые сначала"}</option>
          <option value="id_status-ASC">{"По статусу"}</option>
        </select>
        <button onClick={search}>Найти</button>
      </div>

      {isLoading ? (
        <Loader />
      ) : applications.length === 0 ? (
        <div className={styles.empty}>Заявок не найдено.</div>
      ) : (
        <div className={styles.list}>
          {applications.map((application) => (
            <article key={application.id_application} className={styles.card}>
              <div className={styles.cardMain}>
                <div className={styles.avatar}>
                  {(application.full_name || application.email || "?")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className={styles.cardTop}>
                    <h2>{application.full_name || "Пользователь"}</h2>
                    <span>#{application.id_application}</span>
                  </div>
                  <p>{application.course_title || "Курс не указан"}</p>
                  <div className={styles.meta}>
                    {application.email && <span>{application.email}</span>}
                    {application.phone && <span>{application.phone}</span>}
                    <span>
                      {application.created_at
                        ? new Date(application.created_at).toLocaleDateString(
                            "ru-RU",
                          )
                        : "дата не указана"}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                <b
                  className={
                    styles[statusClass[application.id_status] || "unknown"]
                  }
                >
                  {application.status_name ||
                    statusLabels[application.id_status] ||
                    "Статус"}
                </b>
                <button onClick={() => openStatusModal(application)}>
                  Изменить
                </button>
                <button
                  className={styles.dangerBtn}
                  onClick={() => deleteApplication(application)}
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            ←
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}

      {selectedApp && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedApp(null)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.eyebrow}>
              Заявка #{selectedApp.id_application}
            </span>
            <h3>Изменить статус</h3>
            <p>
              {selectedApp.full_name} · {selectedApp.course_title}
            </p>
            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value)}
            >
              <option value="1">Новая</option>
              <option value="2">В обработке</option>
              <option value="3">Одобрена</option>
              <option value="4">Отклонена</option>
            </select>
            <div className={styles.modalActions}>
              <button onClick={() => setSelectedApp(null)}>Отмена</button>
              <button onClick={updateStatus}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminPanel;
