import { assetUrl } from "../lib/assetUrl";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "../services/apiClient";
import styles from "./Login.module.scss";
import { API_URL } from "../config/api";
import {
  formatPhoneInput,
  PHONE_INPUT_PATTERN,
  PHONE_INPUT_PLACEHOLDER,
} from "../lib/phoneMask";
const emptyForm = {
  login: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
};
const RUSSIAN_NAME_PATTERN = /^[А-Яа-яЁё]+(?:[ -][А-Яа-яЁё]+)*$/u;
const RUSSIAN_NAME_INPUT_PATTERN = "[А-Яа-яЁё]+([ -][А-Яа-яЁё]+)*";
const MIN_PASSWORD_LENGTH = 8;
const sanitizeName = (value) =>
  value
    .replace(/[^А-Яа-яЁё -]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/-{2,}/g, "-");
function MenuIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}
function Login({ onLogin, user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordRepeat, setResetPasswordRepeat] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const pageMode = searchParams.get("mode") || "";
  const isForgotMode = pageMode === "forgot";
  useEffect(() => {
    if (user) {
      navigate("/cabinet", { replace: true });
    }
  }, [navigate, user]);
  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  const pageCopy = useMemo(() => {
    if (isForgotMode) {
      if (resetCodeSent) {
        return {
          eyebrow: "Восстановление доступа",
          title: "Введите код и задайте новый пароль",
          description:
            "Мы отправили код на вашу почту. Введите его вместе с новым паролем, чтобы снова войти в кабинет.",
          cardEyebrow: "Код из письма",
          cardTitle: "Смена пароля",
        };
      }
      return {
        eyebrow: "Восстановление доступа",
        title: "Отправим код на вашу почту",
        description:
          "Введите email, который использовался при регистрации. Если аккаунт найден, мы отправим одноразовый код для смены пароля.",
        cardEyebrow: "Письмо с кодом",
        cardTitle: "Восстановление пароля",
      };
    }
    if (isLogin) {
      return {
        eyebrow: "Личный кабинет",
        title: "Вернитесь к обучению и продолжайте курс",
        description:
          "В кабинете будут ваши курсы, открытые уроки, тесты, домашние задания и статусы заявок. После регистрации можно подать заявку на программу или сразу начать бесплатный курс.",
        cardEyebrow: "Вход",
        cardTitle: "Авторизация",
      };
    }
    return {
      eyebrow: "Личный кабинет",
      title: "Зарегистрируйтесь, чтобы выбрать курс",
      description:
        "В кабинете будут ваши курсы, открытые уроки, тесты, домашние задания и статусы заявок. После регистрации можно подать заявку на программу или сразу начать бесплатный курс.",
      cardEyebrow: "Новый аккаунт",
      cardTitle: "Регистрация",
    };
  }, [isForgotMode, isLogin, resetCodeSent]);
  const updateField = (field, value) => {
    const nextValue =
      field === "first_name" || field === "last_name"
        ? sanitizeName(value)
        : field === "phone"
          ? formatPhoneInput(value)
          : value;
    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };
  const clearAuxState = () => {
    setError("");
    setSuccessMessage("");
    setResetPassword("");
    setResetPasswordRepeat("");
    setResetCode("");
    setResetEmail("");
    setResetCodeSent(false);
  };
  const closeMenu = () => setMenuOpen(false);
  const openLoginMode = () => {
    setSearchParams({});
    setIsLogin(true);
    closeMenu();
    clearAuxState();
  };
  const openRegisterMode = () => {
    setSearchParams({});
    setIsLogin(false);
    closeMenu();
    clearAuxState();
  };
  const openForgotMode = () => {
    setSearchParams({ mode: "forgot" });
    closeMenu();
    clearAuxState();
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    try {
      if (isForgotMode) {
        const email = (resetEmail || formData.email).trim();
        if (!resetCodeSent) {
          const response = await axios.post(
            `${API_URL}/?action=requestPasswordReset`,
            { email },
            {
              withCredentials: true,
              headers: { "Content-Type": "application/json" },
            },
          );
          if (response.data.success) {
            setSuccessMessage(
              response.data.message ||
                "Если аккаунт найден, код восстановления уже отправлен на почту.",
            );
            setResetEmail(email);
            setResetCodeSent(true);
          } else {
            setError(
              response.data.message ||
                "Не удалось отправить код восстановления.",
            );
          }
          return;
        }
        if (resetCode.trim() === "") {
          setError("Введите код из письма.");
          return;
        }
        if (resetPassword.length < MIN_PASSWORD_LENGTH) {
          setError(
            `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов.`,
          );
          return;
        }
        if (resetPassword !== resetPasswordRepeat) {
          setError("Пароли не совпадают.");
          return;
        }
        const response = await axios.post(
          `${API_URL}/?action=resetPassword`,
          { email, code: resetCode.trim(), password: resetPassword },
          {
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
          },
        );
        if (response.data.success) {
          setSuccessMessage(
            response.data.message ||
              "Пароль успешно обновлён. Теперь можно войти.",
          );
          setResetPassword("");
          setResetPasswordRepeat("");
          setResetCode("");
          setResetEmail("");
          setResetCodeSent(false);
          setSearchParams({});
          setIsLogin(true);
        } else {
          setError(response.data.message || "Не удалось обновить пароль.");
        }
        return;
      }
      const action = isLogin ? "login" : "register";
      const payload = isLogin
        ? { login: formData.login.trim(), password: formData.password }
        : {
            ...formData,
            login: formData.login.trim(),
            email: formData.email.trim(),
          };
      if (
        !isLogin &&
        (!RUSSIAN_NAME_PATTERN.test(formData.first_name.trim()) ||
          !RUSSIAN_NAME_PATTERN.test(formData.last_name.trim()))
      ) {
        setError("Имя и фамилия должны быть только на русском языке.");
        return;
      }
      if (!isLogin && formData.password.length < MIN_PASSWORD_LENGTH) {
        setError(
          `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов.`,
        );
        return;
      }
      const response = await axios.post(
        `${API_URL}/?action=${action}`,
        payload,
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        },
      );
      if (response.data.success) {
        if (isLogin) {
          onLogin(response.data.user);
          navigate("/cabinet", { replace: true });
          return;
        }
        setIsLogin(true);
        setFormData((prev) => ({
          ...emptyForm,
          login: prev.login,
        }));
        setSuccessMessage(
          response.data.message ||
            "Регистрация завершена. Теперь войдите в аккаунт.",
        );
      } else {
        setError(
          response.data.message ||
            "Не удалось выполнить вход. Проверьте данные.",
        );
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Сервер не ответил. Проверьте, что backend запущен.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className={styles.loginPage}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <span className={styles.brandMark}>
            <img src={assetUrl("/brand/logo.svg")} alt="" aria-hidden="true" />
          </span>
          <span className={styles.brandText}>
            Фит<span>Старт</span>
          </span>
        </Link>

        <button
          type="button"
          className={styles.burger}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          <Link to="/" onClick={closeMenu}>
            Главная
          </Link>
          <Link to="/courses" onClick={closeMenu}>
            Курсы
          </Link>
          <button
            type="button"
            onClick={openLoginMode}
            className={isLogin && !isForgotMode ? styles.active : ""}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={openRegisterMode}
            className={!isLogin && !isForgotMode ? styles.active : ""}
          >
            Регистрация
          </button>
        </nav>
      </header>
      {menuOpen && (
        <button
          type="button"
          className={styles.mobileMenuBackdrop}
          aria-label="Закрыть меню"
          onClick={closeMenu}
        />
      )}

      <main className={styles.shell}>
        <section className={styles.copy}>
          <span>{pageCopy.eyebrow}</span>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.description}</p>
        </section>

        <section className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <span>{pageCopy.cardEyebrow}</span>
            <h2>{pageCopy.cardTitle}</h2>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {successMessage && (
            <div className={styles.success}>{successMessage}</div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {isForgotMode ? (
              <>
                {!resetCodeSent ? (
                  <label>
                    Email
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      Код из письма
                      <input
                        required
                        value={resetCode}
                        onChange={(event) =>
                          setResetCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                      />
                    </label>

                    <label>
                      Новый пароль
                      <input
                        required
                        type="password"
                        value={resetPassword}
                        onChange={(event) =>
                          setResetPassword(event.target.value)
                        }
                        placeholder="Минимум 8 символов"
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                      />
                    </label>

                    <label>
                      Повторите пароль
                      <input
                        required
                        type="password"
                        value={resetPasswordRepeat}
                        onChange={(event) =>
                          setResetPasswordRepeat(event.target.value)
                        }
                        placeholder="Повторите новый пароль"
                        autoComplete="new-password"
                        minLength={MIN_PASSWORD_LENGTH}
                      />
                    </label>
                  </>
                )}
              </>
            ) : (
              <>
                <label>
                  Логин
                  <input
                    required
                    value={formData.login}
                    onChange={(event) =>
                      updateField("login", event.target.value)
                    }
                    placeholder="Введите логин"
                    autoComplete="username"
                  />
                </label>

                <label>
                  Пароль
                  <input
                    required
                    type="password"
                    value={formData.password}
                    onChange={(event) =>
                      updateField("password", event.target.value)
                    }
                    placeholder={
                      isLogin ? "Введите пароль" : "Минимум 8 символов"
                    }
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
                  />
                </label>

                {!isLogin && (
                  <>
                    <div className={styles.nameRow}>
                      <label>
                        Фамилия
                        <input
                          required
                          value={formData.last_name}
                          onChange={(event) =>
                            updateField("last_name", event.target.value)
                          }
                          placeholder="Иванов"
                          inputMode="text"
                          pattern={RUSSIAN_NAME_INPUT_PATTERN}
                          title="Только русские буквы, пробел или дефис"
                        />
                      </label>

                      <label>
                        Имя
                        <input
                          required
                          value={formData.first_name}
                          onChange={(event) =>
                            updateField("first_name", event.target.value)
                          }
                          placeholder="Иван"
                          inputMode="text"
                          pattern={RUSSIAN_NAME_INPUT_PATTERN}
                          title="Только русские буквы, пробел или дефис"
                        />
                      </label>
                    </div>

                    <label>
                      Email
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder="email@example.com"
                        autoComplete="email"
                      />
                    </label>

                    <label>
                      Телефон
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        placeholder={PHONE_INPUT_PLACEHOLDER}
                        inputMode="tel"
                        pattern={PHONE_INPUT_PATTERN}
                        title="Введите номер в формате +7 (999) 123-45-67"
                        maxLength={18}
                      />
                    </label>
                  </>
                )}
              </>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Отправляем..."
                : isForgotMode
                  ? resetCodeSent
                    ? "Сохранить новый пароль"
                    : "Отправить код"
                  : isLogin
                    ? "Войти"
                    : "Зарегистрироваться"}
            </button>
          </form>

          {!isForgotMode && isLogin && (
            <button
              type="button"
              className={styles.helperLink}
              onClick={openForgotMode}
            >
              Забыли пароль?
            </button>
          )}

          {isForgotMode ? (
            <button
              type="button"
              className={styles.switchBtn}
              onClick={openLoginMode}
            >
              Вернуться ко входу
            </button>
          ) : (
            <button
              type="button"
              className={styles.switchBtn}
              onClick={isLogin ? openRegisterMode : openLoginMode}
            >
              {isLogin
                ? "Нет аккаунта? Зарегистрироваться"
                : "Уже есть аккаунт? Войти"}
            </button>
          )}

          {!isForgotMode && !isLogin && (
            <button
              type="button"
              className={styles.helperLink}
              onClick={openForgotMode}
            >
              Восстановить пароль по email
            </button>
          )}
        </section>

        <section className={styles.preview} aria-label="Этапы обучения">
          <article>
            <strong>01</strong>
            <span>Заявка на курс</span>
          </article>
          <article>
            <strong>02</strong>
            <span>Одобрение доступа</span>
          </article>
          <article>
            <strong>03</strong>
            <span>Уроки, тесты, домашки</span>
          </article>
        </section>
      </main>
    </div>
  );
}
export default Login;
