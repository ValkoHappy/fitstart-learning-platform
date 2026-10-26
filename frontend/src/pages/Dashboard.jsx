import { useState, useEffect } from "react";
import { applicationService } from "../services/applicationService";
import "./Dashboard.css";

function Dashboard({ user, onLogout }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    comment: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await applicationService.getApplications();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await applicationService.createApplication(formData.comment);
      setSuccess("Заявка успешно подана!");
      setFormData({ comment: "" });
      setShowForm(false);
      loadApplications();
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка при подаче заявки");
    }
  };

  const hasPendingApplication = applications.some(
    (app) => app.status === "pending",
  );

  const getStatusText = (status) => {
    const statusMap = {
      pending: "Ожидает рассмотрения",
      approved: "Одобрена",
      rejected: "Отклонена",
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status status-${status}`;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Личный кабинет</h1>
        <div className="header-actions">
          <span className="user-info">Пользователь: {user.login}</span>
          <button onClick={onLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-section">
          <h2>Запись на курс "Как стать тренером"</h2>

          {hasPendingApplication ? (
            <div className="info-message">
              У вас уже есть заявка на рассмотрении. Дождитесь решения
              администратора.
            </div>
          ) : (
            <>
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="create-button"
                >
                  Подать заявку
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="application-form">
                  <div className="form-group">
                    <label htmlFor="comment">Комментарий (необязательно)</label>
                    <textarea
                      id="comment"
                      name="comment"
                      value={formData.comment}
                      onChange={(e) => setFormData({ comment: e.target.value })}
                      rows="4"
                      placeholder="Добавьте комментарий к заявке..."
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}
                  <div className="form-actions">
                    <button type="submit" className="submit-button">
                      Отправить заявку
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setError("");
                        setSuccess("");
                      }}
                      className="cancel-button"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Мои заявки</h2>
          {loading ? (
            <div className="loading">Загрузка...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">У вас пока нет заявок</div>
          ) : (
            <div className="applications-list">
              {applications.map((app) => (
                <div key={app.id} className="application-card">
                  <div className="application-header">
                    <span className="application-id">Заявка #{app.id}</span>
                    <span className={getStatusClass(app.status)}>
                      {getStatusText(app.status)}
                    </span>
                  </div>
                  <div className="application-body">
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

export default Dashboard;
