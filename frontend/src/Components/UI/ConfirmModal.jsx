import styles from "./ConfirmModal.module.scss";
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Удалить",
  type = "danger",
}) => {
  if (!isOpen) return null;
  const isSuccess = type === "success";
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${isSuccess ? styles.modalSuccess : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`${styles.icon} ${isSuccess ? styles.iconSuccess : ""}`}
        >
          {isSuccess ? "✓" : "!"}
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.buttons}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            className={`${styles.confirmBtn} ${isSuccess ? styles.btnSuccess : ""}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmModal;
