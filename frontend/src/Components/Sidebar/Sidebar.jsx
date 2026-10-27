import { assetUrl } from "../../lib/assetUrl";
import { Link, useLocation } from "react-router-dom";
import styles from "./Sidebar.module.scss";
const roleLabels = {
  admin: "Администратор",
  curator: "Куратор",
  student: "Студент",
  user: "Студент",
  guest: "Гость",
};
const mainLinks = [
  { to: "/", label: "Главная", icon: "home" },
  { to: "/courses", label: "Курсы", icon: "courses" },
];
const studentLinks = [
  { to: "/cabinet", label: "Кабинет", icon: "cabinet" },
  { to: "/applications", label: "Мои заявки", icon: "applications" },
];
const staffLinks = [
  { to: "/admin", label: "Заявки", icon: "applications" },
  { to: "/review", label: "Проверка", icon: "review" },
  { to: "/progress", label: "Прогресс", icon: "progress" },
];
const adminLinks = [{ to: "/users", label: "Пользователи", icon: "users" }];
function Icon({ name }) {
  const icons = {
    home: (
      <>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    courses: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M8 7h8" />
        <path d="M8 11h7" />
      </>
    ),
    cabinet: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <path d="M8 17h8" />
      </>
    ),
    applications: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h5" />
        <path d="M10 17h6" />
      </>
    ),
    review: (
      <>
        <path d="M9 11l2 2 4-5" />
        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H5l-2 2v-7.5A8.5 8.5 0 1 1 21 12Z" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-3 3 2 5-7" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name] || icons.home}
    </svg>
  );
}
function NavLink({ item, active, onClose }) {
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={`${styles.navItem} ${active ? styles.active : ""}`}
    >
      <span className={styles.navIcon}>
        <Icon name={item.icon} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}
function Sidebar({ user, userRole, onLogout, isOpen, onClose }) {
  const location = useLocation();
  const role = userRole || "guest";
  const isGuest = !user;
  const isAdmin = role === "admin";
  const isStaff = isAdmin || role === "curator";
  const displayName = user?.first_name || user?.login || "Гость";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <button
        className={styles.mobileClose}
        onClick={onClose}
        aria-label="Закрыть меню"
      >
        ×
      </button>

      <Link to="/" onClick={onClose} className={styles.brand}>
        <span className={styles.brandMark}>
          <img src={assetUrl("/brand/logo.svg")} alt="" aria-hidden="true" />
        </span>
        <span>
          <strong>ФитСтарт</strong>
          <small>Онлайн-курсы</small>
        </span>
      </Link>

      <div className={styles.profile}>
        <div className={styles.avatarCircle}>{initials}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>
            {isGuest ? "Просмотр" : roleLabels[role] || "Студент"}
          </span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.sectionTitle}>Навигация</span>
          {mainLinks.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              active={isActive(item.to)}
              onClose={onClose}
            />
          ))}
        </div>

        {!isGuest && !isStaff && (
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>Обучение</span>
            {studentLinks.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={isActive(item.to)}
                onClose={onClose}
              />
            ))}
          </div>
        )}

        {isStaff && (
          <div className={styles.navSection}>
            <span className={styles.sectionTitle}>Рабочая зона</span>
            {staffLinks.map((item) => (
              <NavLink
                key={item.to}
                item={item}
                active={isActive(item.to)}
                onClose={onClose}
              />
            ))}
            {isAdmin &&
              adminLinks.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  active={isActive(item.to)}
                  onClose={onClose}
                />
              ))}
          </div>
        )}
      </nav>

      <div className={styles.footer}>
        {isGuest ? (
          <Link to="/login" onClick={onClose} className={styles.loginBtn}>
            Войти
          </Link>
        ) : (
          <button className={styles.logoutBtn} onClick={onLogout}>
            Выйти
          </button>
        )}
      </div>
    </aside>
  );
}
export default Sidebar;
