import { assetUrl } from "./lib/assetUrl";
import { useState, useEffect } from "react";
import {
  Link,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "./services/apiClient";
import Sidebar from "./Components/Sidebar/Sidebar";
import ScrollTopButton from "./Components/ScrollTopButton/ScrollTopButton";
import Courses from "./Pages/Courses";
import Course from "./Pages/Course";
import CourseBuilder from "./Pages/CourseBuilder";
import Login from "./Pages/Login";
import LessonViewer from "./Pages/LessonViewer";
import Applications from "./Pages/Applications";
import AdminPanel from "./Pages/AdminPanel";
import Landing from "./Pages/Landing";
import StudentDashboard from "./Pages/StudentDashboard";
import ReviewQueue from "./Pages/ReviewQueue";
import Users from "./Pages/Users";
import Progress from "./Pages/Progress";
import { API_URL } from "./config/api";
import { NotificationProvider } from "./context/NotificationContext";
function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("guest");
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/?action=check_auth`, {
        withCredentials: true,
      });
      if (response.data.success && response.data.authenticated) {
        setUser(response.data.user);
        setUserRole(response.data.user.role || "user");
      } else {
        setUser(null);
        setUserRole("guest");
      }
    } catch (error) {
      console.error("Ошибка проверки авторизации:", error);
      setUser(null);
      setUserRole("guest");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    checkAuth();
  }, []);
  const updateUser = (userData) => {
    setUser(userData);
    if (userData) {
      setUserRole(userData.role || "user");
    } else {
      setUserRole("guest");
    }
  };
  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_URL}/?action=logout`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setUserRole("guest");
      navigate("/");
    }
  };
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
          background: "#1a1a1a",
          color: "#fff",
        }}
      >
        Загрузка...
      </div>
    );
  }
  return (
    <NotificationProvider>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={updateUser} user={user} />}
        />
        <Route
          path="/"
          element={
            <Landing user={user} userRole={userRole} onLogout={handleLogout} />
          }
        />
        <Route
          path="/course/:courseId/lesson/:lessonId"
          element={user ? <LessonViewer /> : <Navigate to="/login" replace />}
        />

        <Route
          element={
            <div className="app-layout">
              <div className="mobile-header">
                <Link
                  to="/"
                  className="mobile-brand"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mobile-brand-mark">
                    <img
                      src={assetUrl("/brand/logo.svg")}
                      alt=""
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mobile-brand-text">
                    <strong>
                      Фит<span>Старт</span>
                    </strong>
                    <small>онлайн-курсы</small>
                  </span>
                </Link>
                <button
                  className="menu-btn"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Открыть меню"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                </button>
              </div>

              <Sidebar
                user={user}
                userRole={userRole}
                onLogout={handleLogout}
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
              />

              {mobileMenuOpen && (
                <div
                  className="sidebar-overlay"
                  onClick={() => setMobileMenuOpen(false)}
                ></div>
              )}

              <div className="main-area">
                <div key={location.pathname} className="route-shell">
                  <Outlet />
                </div>
              </div>
            </div>
          }
        >
          <Route
            path="/courses"
            element={<Courses user={user} userRole={userRole} />}
          />
          <Route
            path="/cabinet"
            element={
              user ? (
                <StudentDashboard user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/course/:id" element={<Course user={user} />} />
          <Route
            path="/course-builder/:id"
            element={
              userRole === "admin" || userRole === "curator" ? (
                <CourseBuilder userRole={userRole} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/applications"
            element={
              user ? (
                <Applications user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              userRole === "admin" || userRole === "curator" ? (
                <AdminPanel user={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/review"
            element={
              userRole === "admin" || userRole === "curator" ? (
                <ReviewQueue />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/progress"
            element={
              userRole === "admin" || userRole === "curator" ? (
                <Progress />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/users"
            element={
              userRole === "admin" ? (
                <Users currentUser={user} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ScrollTopButton />
    </NotificationProvider>
  );
}
export default App;
