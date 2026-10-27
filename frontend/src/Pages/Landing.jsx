import { assetUrl } from "../lib/assetUrl";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import styles from "./Landing.module.scss";
import OptimizedImage from "../Components/OptimizedImage";
const heroSlides = [
  {
    src: "/landing-assets/hero-coach-biceps.png",
    alt: "Наставник ФитСтарт демонстрирует форму",
    x: "0px",
    scale: 1,
  },
  {
    src: "/landing-assets/hero-coach-side.png",
    alt: "Наставник ФитСтарт в боковой позе",
    x: "2px",
    scale: 1,
  },
  {
    src: "/landing-assets/hero-coach-front.png",
    alt: "Наставник ФитСтарт в фронтальной позе",
    x: "0px",
    scale: 1,
  },
  {
    src: "/landing-assets/hero-coach-stand.png",
    alt: "Наставник ФитСтарт в полный рост",
    x: "6px",
    scale: 1,
  },
];
const heroTopics = [
  "Анатомия и биомеханика",
  "Работа с клиентами",
  "Питание",
  "Продажи и продвижение",
];
const courseHighlights = ["программа", "модули", "заявка"];
function normalizeCourses(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
function getAccessLabel(type) {
  if (type === "free") return "Свободный доступ";
  if (type === "paid_later") return "Оплата после заявки";
  return "Доступ по заявке";
}
function scrollToSection(event) {
  event.preventDefault();
  document
    .getElementById(event.currentTarget.getAttribute("href").slice(1))
    ?.scrollIntoView({ behavior: "smooth" });
}
function SiteLogo() {
  return (
    <>
      <span className={styles.brandMark}>
        <img src={assetUrl("/brand/logo.svg")} alt="" aria-hidden="true" />
      </span>
      <span className={styles.brandText}>
        Фит<span>Старт</span>
      </span>
    </>
  );
}
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
function StepIcon({ name }) {
  const icons = {
    choose: (
      <>
        <path d="M8 3h8l4 4v14H4V3h4Z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    access: (
      <>
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M12 15v3" />
      </>
    ),
    steps: (
      <>
        <path d="M5 5h6v6H5z" />
        <path d="M13 13h6v6h-6z" />
        <path d="M11 8h3a2 2 0 0 1 2 2v3" />
        <path d="M8 11v3a2 2 0 0 0 2 2h3" />
      </>
    ),
    review: (
      <>
        <path d="M9 11l2 2 4-5" />
        <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H5l-2 2v-7.5A8.5 8.5 0 1 1 21 12Z" />
      </>
    ),
  };
  return (
    <span className={styles.stepIcon}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {icons[name]}
      </svg>
    </span>
  );
}
function FactIcon({ name }) {
  const icons = {
    anatomy: (
      <>
        <path d="M12 3v18" />
        <path d="M8 7h8" />
        <path d="M7 12h10" />
        <path d="M9 17h6" />
      </>
    ),
    homework: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h5" />
        <path d="M15 15l1.5 1.5L20 13" />
      </>
    ),
    curator: (
      <>
        <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M5 21a7 7 0 0 1 14 0" />
        <path d="M17 4l2 2 3-3" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
function Landing({ user, userRole, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const navigate = useNavigate();
  const activeHeroIndex = activeHeroSlide % heroSlides.length;
  useEffect(() => {
    axios
      .get(`${API_URL}/?action=getCourses`, { withCredentials: true })
      .then((response) =>
        setCourses(normalizeCourses(response.data).slice(0, 3)),
      )
      .catch(() => setCourses([]));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return undefined;
    }
    const isMobile = window.innerWidth <= 920;
    if (isMobile) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  const stats = useMemo(
    () => [
      ["10+", "лет опыта в тренировках и методике"],
      ["3", "готовых курса для старта"],
      ["24/7", "доступ к урокам в кабинете"],
    ],
    [],
  );
  const processSteps = useMemo(
    () => [
      [
        "01",
        "choose",
        "Выбираете курс",
        "Смотрите программу, формат, уровень подготовки и оставляете заявку на подходящий курс.",
      ],
      [
        "02",
        "access",
        "Получаете доступ",
        "После одобрения курс появляется в личном кабинете вместе с модулями, уроками и заданиями.",
      ],
      [
        "03",
        "steps",
        "Проходите по шагам",
        "Уроки открываются последовательно: лекции, видео, тесты, домашки и простые чекпоинты.",
      ],
      [
        "04",
        "review",
        "Получаете проверку",
        "Куратор смотрит домашние задания, оставляет комментарии и помогает довести работу до результата.",
      ],
    ],
    [],
  );
  const mentorFacts = useMemo(
    () => [
      ["anatomy", "Анатомия и техника", "понятная база для работы с движением"],
      ["homework", "Практические домашки", "задания, которые собирают навык"],
      ["curator", "Проверка куратора", "обратная связь по реальным работам"],
    ],
    [],
  );
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link
          to="/"
          className={styles.brand}
          onClick={(event) => {
            scrollToSection(event);
            closeMenu();
          }}
        >
          <SiteLogo />
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
          <a
            href="#courses"
            onClick={(event) => {
              scrollToSection(event);
              closeMenu();
            }}
          >
            Курсы
          </a>
          <a
            href="#process"
            onClick={(event) => {
              scrollToSection(event);
              closeMenu();
            }}
          >
            Как проходит обучение
          </a>
          <a
            href="#mentor"
            onClick={(event) => {
              scrollToSection(event);
              closeMenu();
            }}
          >
            Наставник
          </a>
          {user ? (
            <>
              <Link
                to="/cabinet"
                onClick={(event) => {
                  scrollToSection(event);
                  closeMenu();
                }}
              >
                Кабинет
              </Link>
              {(userRole === "admin" || userRole === "curator") && (
                <Link
                  to="/admin"
                  onClick={(event) => {
                    scrollToSection(event);
                    closeMenu();
                  }}
                >
                  Рабочая зона
                </Link>
              )}
              <button
                type="button"
                className={styles.logoutLink}
                onClick={onLogout}
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={styles.loginLink}
              onClick={(event) => {
                scrollToSection(event);
                closeMenu();
              }}
            >
              Войти
            </Link>
          )}
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

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>Курсы, которые помогают тренеру уверенно работать с людьми</h1>
            <p className={styles.lead}>
              Практические программы по профессии фитнес-тренера, ведению
              занятий, питанию и работе с клиентами. Вы выбираете курс,
              оставляете заявку и проходите обучение в личном кабинете с
              уроками, тестами, домашними заданиями и проверкой куратора.
            </p>
            <div className={styles.heroActions}>
              <a
                href="#courses"
                onClick={scrollToSection}
                className={styles.primaryBtn}
              >
                Выбрать курс
              </a>
              <button
                className={styles.secondaryBtn}
                onClick={() => navigate(user ? "/cabinet" : "/login")}
              >
                {user ? "Открыть кабинет" : "Оставить заявку"}
              </button>
            </div>
          </div>

          <div className={styles.heroMedia} aria-label="Наставник курса">
            <div className={styles.heroTopicCloud} aria-label="Темы обучения">
              {heroTopics.map((topic, index) => (
                <span key={topic} style={{ "--topic-index": index }}>
                  {topic}
                </span>
              ))}
            </div>
            <div className={styles.heroSlides} aria-live="off">
              {heroSlides.map((slide, index) => (
                <OptimizedImage
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className={`${styles.heroSlide} ${index === activeHeroIndex ? styles.heroSlideActive : ""}`}
                  style={{
                    "--hero-x": slide.x,
                    "--hero-scale": slide.scale,
                  }}
                />
              ))}
            </div>
            <div className={styles.mediaBadge}>
              <strong>Андрей Шарипкулов</strong>
              <span>тренер, наставник и автор программ</span>
            </div>
          </div>
        </section>

        <section className={styles.statsBand} aria-label="Факты об обучении">
          {stats.map(([value, label]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </section>

        <section id="courses" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>
              Выберите направление и начните обучение с понятной программой
            </h2>
          </div>
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <article key={course.id_course} className={styles.courseCard}>
                {course.image_path ? (
                  <OptimizedImage src={course.image_path} alt={course.title} />
                ) : (
                  <div className={styles.courseImageFallback} />
                )}
                <div className={styles.courseBody}>
                  <span>{getAccessLabel(course.access_type)}</span>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <div
                    className={styles.courseMeta}
                    aria-label="Кратко о курсе"
                  >
                    {courseHighlights.map((item) => (
                      <small key={item}>{item}</small>
                    ))}
                  </div>
                  <Link to={`/course/${course.id_course}`}>Подробнее</Link>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.courseSectionFooter}>
            <p>
              Откройте карточку курса, чтобы посмотреть модули, уроки и условия
              доступа перед заявкой.
            </p>
            <Link to="/courses">Смотреть весь каталог</Link>
          </div>
        </section>

        <section
          id="process"
          className={`${styles.section} ${styles.processSection}`}
        >
          <div className={styles.sectionHeader}>
            <h2>
              Вся программа собрана в кабинете и открывается по мере прохождения
            </h2>
          </div>
          <div className={styles.processBody}>
            <div className={styles.steps}>
              {processSteps.map(([num, icon, title, text]) => (
                <article key={num} className={styles.step}>
                  <StepIcon name={icon} />
                  <span>{num}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <figure className={styles.processCoach} aria-hidden="true">
              <OptimizedImage
                src={assetUrl("/landing-assets/process-coach-present.png")}
                alt=""
              />
            </figure>
          </div>
        </section>

        <section id="mentor" className={styles.mentorSection}>
          <div className={styles.mentorImages}>
            <OptimizedImage
              src={assetUrl("/landing-assets/hero.jpeg")}
              alt="Тренер на съемке курса"
            />
            <figure className={styles.mentorPortrait}>
              <OptimizedImage
                src={assetUrl("/landing-assets/coach-training.jpg")}
                alt="Практическая работа тренера"
              />
              <figcaption>
                <strong>Андрей Шарипкулов</strong>
                <span>тренер, наставник и автор программ</span>
              </figcaption>
            </figure>
          </div>
          <div className={styles.mentorCopy}>
            <h2>Обучение построено на реальной тренерской практике</h2>
            <p>
              Внутри курсов не сухая теория ради галочки, а понятные уроки,
              разборы, задания и контрольные тесты. Программа помогает собрать
              базу, научиться объяснять упражнения, вести клиента, работать с
              питанием и оформлять свою методику.
            </p>
            <div className={styles.mentorFacts}>
              {mentorFacts.map(([icon, title, text]) => (
                <article key={title}>
                  <FactIcon name={icon} />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerBrand}>
          <SiteLogo />
        </Link>
        <nav className={styles.footerNav} aria-label="Нижняя навигация">
          <a href="#courses" onClick={scrollToSection}>
            Курсы
          </a>
          <a href="#process" onClick={scrollToSection}>
            Как проходит обучение
          </a>
          <a href="#mentor" onClick={scrollToSection}>
            Наставник
          </a>
          <Link to={user ? "/cabinet" : "/login"}>
            {user ? "Кабинет" : "Войти"}
          </Link>
        </nav>
        <p>© 2026 ФитСтарт</p>
      </footer>
    </div>
  );
}
export default Landing;
