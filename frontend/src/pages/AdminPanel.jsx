import { useState, useEffect } from "react";
import { applicationService } from "../services/applicationService";
import "./AdminPanel.css";

function AdminPanel({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadApplications();
  }, [searchTerm, statusFilter]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await applicationService.getApplications(
        searchTerm,
        statusFilter,
      );
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdating(applicationId);
    try {
      await applicationService.updateApplicationStatus(
        applicationId,
        newStatus,
      );
      loadApplications();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.response?.data?.error || "Ошибка при изменении статуса");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Ожидает",
      approved: "Одобрена",
      rejected: "Отклонена",
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status status-${status}`;
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Панель администратора</h1>
        <div className="header-actions">
          <span className="user-info">Администратор: {user.login}</span>
          <button onClick={onLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>

      <main className="admin-content">
        <div className="admin-section">
          <h2>Заявки</h2>

          <div className="filters">
            <div className="filter-group">
              <label htmlFor="search">Поиск</label>
              <input
                type="text"
                id="search"
                placeholder="Поиск по логину, email, курсу или комментарию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="status">Статус</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="">Все</option>
                <option value="pending">Ожидают</option>
                <option value="approved">Одобренные</option>
                <option value="rejected">Отклоненные</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">Заявки не найдены</div>
          ) : (
            <div className="applications-list">
              {applications.map((app) => (
                <div key={app.id} className="application-card">
                  <div className="application-header">
                    <div>
                      <span className="application-id">Заявка #{app.id}</span>
                      <span className={getStatusClass(app.status)}>
                        {getStatusText(app.status)}
                      </span>
                    </div>
                  </div>
                  <div className="application-body">
                    <p>
                      <strong>Пользователь:</strong> {app.login || "N/A"}
                    </p>
                    <p>
                      <strong>Email:</strong> {app.email || "N/A"}
                    </p>
                    <p>
                      <strong>Курс:</strong> {app.course_name}
                    </p>
                    {app.comment && (
                      <p>
                        <strong>Комментарий:</strong> {app.comment}
                      </p>
                    )}
                    <p className="application-date">
                      Подана: {new Date(app.created_at).toLocaleString("ru-RU")}
                    </p>
                    {app.updated_at !== app.created_at && (
                      <p className="application-date">
                        Обновлена:{" "}
                        {new Date(app.updated_at).toLocaleString("ru-RU")}
                      </p>
                    )}
                  </div>
                  <div className="application-actions">
                    {app.status !== "approved" && (
                      <button
                        onClick={() => handleStatusChange(app.id, "approved")}
                        disabled={updating === app.id}
                        className="approve-button"
                      >
                        {updating === app.id ? "Обработка..." : "Одобрить"}
                      </button>
                    )}
                    {app.status !== "rejected" && (
                      <button
                        onClick={() => handleStatusChange(app.id, "rejected")}
                        disabled={updating === app.id}
                        className="reject-button"
                      >
                        {updating === app.id ? "Обработка..." : "Отказать"}
                      </button>
                    )}
                    {app.status === "approved" && (
                      <span className="status-badge approved">Одобрена</span>
                    )}
                    {app.status === "rejected" && (
                      <span className="status-badge rejected">Отклонена</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPanel;
