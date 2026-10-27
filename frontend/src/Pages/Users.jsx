import { useEffect, useMemo, useState } from "react";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import { useNotification } from "../context/NotificationContext";
import styles from "./Users.module.scss";
const permissions = [
  ["can_manage_applications", "Заявки"],
  ["can_review_submissions", "Проверка домашних"],
  ["can_edit_content", "Редактирование курса"],
  ["can_view_progress", "Прогресс учеников"],
];
const roleLabels = {
  student: "Студент",
  user: "Студент",
  curator: "Куратор",
  admin: "Админ",
};
function normalizeCourses(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.courses)) return data.courses;
  return [];
}
function Users({ currentUser }) {
  const { addNotification } = useNotification();
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [grants, setGrants] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [grantForm, setGrantForm] = useState({
    can_manage_applications: true,
    can_review_submissions: true,
    can_edit_content: false,
    can_view_progress: true,
  });
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, coursesRes, grantsRes] = await Promise.all([
        axios.get(`${API_URL}/?action=getUsers`, { withCredentials: true }),
        axios.get(`${API_URL}/?action=getCourses`, { withCredentials: true }),
        axios.get(`${API_URL}/?action=getStaffPermissions`, {
          withCredentials: true,
        }),
      ]);
      setUsers(usersRes.data.items || []);
      setCourses(normalizeCourses(coursesRes.data));
      setGrants(grantsRes.data.items || []);
    } catch {
      addNotification("Не удалось загрузить пользователей", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const role = user.role === "user" ? "student" : user.role;
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const haystack =
        `${user.login || ""} ${user.first_name || ""} ${user.last_name || ""} ${user.email || ""}`.toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [users, query, roleFilter]);
  const selectedUser = users.find(
    (user) => String(user.id_user) === String(selectedUserId),
  );
  const selectedCourse = courses.find(
    (course) => String(course.id_course) === String(selectedCourseId),
  );
  const userGrants = useMemo(() => {
    if (!selectedUserId) return [];
    return grants.filter(
      (grant) => String(grant.id_user) === String(selectedUserId),
    );
  }, [grants, selectedUserId]);
  const saveGrant = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !selectedCourseId) {
      addNotification("Выберите пользователя и курс", "error");
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/?action=saveStaffPermissions`,
        {
          id_user: Number(selectedUserId),
          id_course: Number(selectedCourseId),
          ...grantForm,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Доступ куратора сохранен", "success");
        fetchData();
      } else {
        addNotification(
          response.data.message || "Не удалось сохранить доступ",
          "error",
        );
      }
    } catch {
      addNotification("Ошибка сервера при сохранении доступа", "error");
    }
  };
  const deleteUser = async (user) => {
    const label = user.login || user.email || `#${user.id_user}`;
    if (
      !window.confirm(
        `Удалить пользователя "${label}"? Его заявки, доступы, прогресс и домашние задания будут удалены.`,
      )
    ) {
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/?action=deleteUser`,
        {
          id_user: user.id_user,
        },
        { withCredentials: true },
      );
      if (response.data.success) {
        addNotification("Пользователь удалён", "success");
        if (String(selectedUserId) === String(user.id_user)) {
          setSelectedUserId("");
          setSelectedCourseId("");
        }
        fetchData();
      } else {
        addNotification(
          response.data.message || "Не удалось удалить пользователя",
          "error",
        );
      }
    } catch {
      addNotification("Ошибка сервера при удалении пользователя", "error");
    }
  };
  if (loading) return <Loader />;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Админка</span>
          <h1>Кураторы и доступы</h1>
          <p>
            Назначайте кураторов на курсы и выдавайте точные права для заявок,
            домашних заданий и прогресса.
          </p>
        </div>
        <div className={styles.metrics}>
          <div>
            <strong>{users.length}</strong>
            <span>пользователей</span>
          </div>
          <div>
            <strong>{grants.length}</strong>
            <span>назначений</span>
          </div>
          <div>
            <strong>{courses.length}</strong>
            <span>курсов</span>
          </div>
        </div>
      </header>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.toolbar}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени или email"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
            >
              <option value="all">Все роли</option>
              <option value="student">Студенты</option>
              <option value="curator">Кураторы</option>
              <option value="admin">Админы</option>
            </select>
          </div>

          <div className={styles.usersList}>
            {filteredUsers.map((user) => {
              const role = user.role === "user" ? "student" : user.role;
              return (
                <article
                  key={user.id_user}
                  className={`${styles.userCard} ${String(selectedUserId) === String(user.id_user) ? styles.active : ""}`}
                  onClick={() => setSelectedUserId(String(user.id_user))}
                >
                  <div className={styles.avatar}>
                    {(user.login || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className={styles.userMain}>
                    <strong>
                      {user.first_name || user.login || "Пользователь"}
                    </strong>
                    <span>{user.email || "email не указан"}</span>
                  </div>
                  <span className={styles.rolePill}>
                    {roleLabels[role] || role}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteUserBtn}
                    disabled={String(currentUser?.id) === String(user.id_user)}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteUser(user);
                    }}
                  >
                    Удалить
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={styles.panel}>
          <span className={styles.eyebrow}>Доступ</span>
          <h2>Назначение куратора</h2>
          <form onSubmit={saveGrant} className={styles.grantForm}>
            <label>
              Пользователь
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">Выберите пользователя</option>
                {users.map((user) => (
                  <option key={user.id_user} value={user.id_user}>
                    {user.login} · {roleLabels[user.role] || user.role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Курс
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
              >
                <option value="">Выберите курс</option>
                {courses.map((course) => (
                  <option key={course.id_course} value={course.id_course}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.checkGrid}>
              {permissions.map(([key, label]) => (
                <label key={key} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={Boolean(grantForm[key])}
                    onChange={(event) =>
                      setGrantForm((prev) => ({
                        ...prev,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <button type="submit">Сохранить доступ</button>
          </form>

          <div className={styles.selection}>
            <strong>
              {selectedUser ? selectedUser.login : "Пользователь не выбран"}
            </strong>
            <span>
              {selectedCourse ? selectedCourse.title : "Курс не выбран"}
            </span>
          </div>

          <div className={styles.grantsList}>
            <h3>Текущие назначения</h3>
            {userGrants.length === 0 && (
              <p>У выбранного пользователя пока нет назначений.</p>
            )}
            {userGrants.map((grant) => (
              <div
                key={`${grant.id_user}-${grant.id_course}`}
                className={styles.grantItem}
              >
                <strong>{grant.course_title}</strong>
                <span>
                  {permissions
                    .filter(([key]) => Number(grant[key]) === 1)
                    .map(([, label]) => label)
                    .join(" · ") || "Без прав"}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
export default Users;
