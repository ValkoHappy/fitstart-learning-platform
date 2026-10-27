import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import ConfirmModal from "../Components/UI/ConfirmModal";
import styles from "./ReviewQueue.module.scss";
const statusLabels = {
  submitted: "Новая сдача",
  review: "На проверке",
};
const formatFileSize = (size) => {
  const bytes = Number(size || 0);
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};
function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [pendingReview, setPendingReview] = useState(null);
  const fetchQueue = () => {
    setIsLoading(true);
    axios
      .get(`${API_URL}/?action=getReviewQueue`, { withCredentials: true })
      .then((response) => setItems(response.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  };
  useEffect(() => {
    fetchQueue();
  }, []);
  const review = async (submissionId, status) => {
    await axios.post(
      `${API_URL}/?action=reviewSubmission`,
      {
        submission_id: submissionId,
        status,
        comment: comments[submissionId] || "",
      },
      { withCredentials: true },
    );
    setComments((prev) => ({ ...prev, [submissionId]: "" }));
    fetchQueue();
  };
  const openReviewConfirm = (item, status) => {
    setPendingReview({
      submissionId: item.id_submission,
      lessonTitle: item.lesson_title,
      status,
    });
  };
  const confirmReview = () => {
    if (!pendingReview) return;
    review(pendingReview.submissionId, pendingReview.status);
    setPendingReview(null);
  };
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p>Проверка домашних заданий</p>
          <h1>Очередь куратора</h1>
          <span>
            Работы учеников, которые ждут принятия или возврата на доработку.
          </span>
        </div>
        <strong>{items.length}</strong>
      </div>
      <div className={styles.list}>
        {isLoading && (
          <div className={styles.empty}>Загружаем очередь проверки...</div>
        )}
        {!isLoading && items.length === 0 && (
          <div className={styles.empty}>
            <p>Работ на проверку пока нет.</p>
            <div className={styles.emptyActions}>
              <Link to="/progress">Посмотреть прогресс</Link>
              <Link to="/courses">Курсы с домашками</Link>
              <Link to="/users">Права кураторов</Link>
            </div>
          </div>
        )}
        {items.map((item) => (
          <article key={item.id_submission} className={styles.card}>
            <div className={styles.cardTop}>
              <span>{item.course_title}</span>
              <small>#{item.id_submission}</small>
            </div>
            <h2>{item.lesson_title}</h2>
            <div className={styles.meta}>
              <strong>
                {item.student_login || item.student_email || "Ученик"}
              </strong>
              <span>
                {item.submitted_at
                  ? new Date(item.submitted_at).toLocaleDateString("ru-RU")
                  : "новая сдача"}
              </span>
              <b>{statusLabels[item.status] || item.status}</b>
            </div>
            {item.answer_text && (
              <p className={styles.answer}>{item.answer_text}</p>
            )}
            {item.answer_link && (
              <a href={item.answer_link} target="_blank" rel="noreferrer">
                {item.answer_link}
              </a>
            )}
            {item.files?.length > 0 && (
              <div className={styles.files}>
                <span>Файлы</span>
                {item.files.map((file) => (
                  <a
                    key={`${item.id_submission}-${file.file_path}`}
                    href={file.file_path}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {file.original_name}
                    {file.file_size ? (
                      <small>{formatFileSize(file.file_size)}</small>
                    ) : null}
                  </a>
                ))}
              </div>
            )}
            <textarea
              value={comments[item.id_submission] || ""}
              onChange={(event) =>
                setComments((prev) => ({
                  ...prev,
                  [item.id_submission]: event.target.value,
                }))
              }
              placeholder="Комментарий к проверке"
              rows={3}
            />
            <div className={styles.actions}>
              <button onClick={() => openReviewConfirm(item, "accepted")}>
                Принять
              </button>
              <button onClick={() => openReviewConfirm(item, "needs_revision")}>
                На доработку
              </button>
            </div>
          </article>
        ))}
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingReview)}
        onClose={() => setPendingReview(null)}
        onConfirm={confirmReview}
        title={
          pendingReview?.status === "accepted"
            ? "Принять работу?"
            : "Вернуть на доработку?"
        }
        message={`Урок: ${pendingReview?.lessonTitle || ""}. Действие будет применено сразу после подтверждения.`}
        confirmText={
          pendingReview?.status === "accepted" ? "Принять" : "Вернуть"
        }
        type={pendingReview?.status === "accepted" ? "success" : "danger"}
      />
    </div>
  );
}
export default ReviewQueue;
