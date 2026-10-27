import { createContext, useState, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "../Components/UI/Notification.module.scss";
const NotificationContext = createContext();
export const useNotification = () => useContext(NotificationContext);
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const addNotification = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);
  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  }, []);
  return (
    <NotificationContext.Provider
      value={{ addNotification, removeNotification }}
    >
      {children}
      {createPortal(
        <div className={styles.notificationContainer}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`${styles.notification} ${styles[notification.type]}`}
              onClick={() => removeNotification(notification.id)}
            >
              <div className={styles.icon}>
                {notification.type === "success" && "✓"}
                {notification.type === "error" && "!"}
                {notification.type === "info" && "i"}
              </div>
              <div className={styles.content}>
                <p className={styles.message}>{notification.message}</p>
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
};
