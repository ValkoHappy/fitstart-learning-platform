import LessonContent from "../features/learning/LessonContent";
import LessonNavigation from "../features/learning/LessonNavigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../services/apiClient";
import styles from "./LessonViewer.module.scss";
import { API_URL } from "../config/api";
import Loader from "../Components/UI/Loader";
import ScrollTopButton from "../Components/ScrollTopButton/ScrollTopButton";
import {
  flattenLessons,
  getLessonAccessState,
  getLessonLockReason,
} from "../lib/learningRules";
import {
  getQuizOptionState,
  prepareQuizQuestionsForStudent,
} from "../lib/quizPresentation";
const typeLabels = {
  text: "Лекция",
  video: "Видео",
  task: "Домашка",
  quiz: "Тест",
  done: "Действие",
};
const submissionLabels = {
  submitted: "Отправлено на проверку",
  review: "На проверке",
  accepted: "Принято",
  needs_revision: "Нужна доработка",
};
function buildVideoSrc(lesson) {
  const provider = lesson.video_provider || "external";
  const ref = (
    lesson.video_ref ||
    lesson.video_url ||
    lesson.video_link ||
    ""
  ).trim();
  if (!ref) return "";
  if (provider === "youtube") {
    const match = ref.match(/(?:v=|youtu\.be\/|embed\/)?([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : ref;
  }
  if (provider === "vimeo") {
    const match = ref.match(/vimeo\.com\/(?:video\/)?(\d+)|^(\d+)$/);
    const id = match?.[1] || match?.[2];
    return id ? `https://player.vimeo.com/video/${id}` : ref;
  }
  if (provider === "kinescope") {
    if (ref.includes("kinescope.io")) return ref;
    return `https://kinescope.io/embed/${ref}`;
  }
  if (provider === "rutube") {
    if (ref.includes("rutube.ru/play/embed/")) return ref;
    const match =
      ref.match(/rutube\.ru\/video\/([a-f0-9]{32})/i) ||
      ref.match(/^([a-f0-9]{32})$/i);
    const id = match?.[1];
    return id ? `https://rutube.ru/play/embed/${id}` : ref;
  }
  if (!/^https?:\/\//i.test(ref)) return "";
  return ref;
}
function normalizeAnswerSelection(value) {
  const items = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === ""
      ? []
      : [value];
  return [...new Set(items.map((item) => String(item)))];
}
function normalizeQuizAnswersMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).map(([questionKey, answerValue]) => [
      String(questionKey),
      normalizeAnswerSelection(answerValue),
    ]),
  );
}
function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const mainContentRef = useRef(null);
  const [modules, setModules] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignmentText, setAssignmentText] = useState("");
  const [assignmentLink, setAssignmentLink] = useState("");
  const [assignmentFiles, setAssignmentFiles] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizRetryMode, setQuizRetryMode] = useState(false);
  const [showQuizHint, setShowQuizHint] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const fetchData = async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    setLoadError("");
    try {
      const [courseRes, contentRes] = await Promise.all([
        axios.get(`${API_URL}/?action=getCourse&id=${courseId}`, {
          withCredentials: true,
        }),
        axios.get(`${API_URL}/?action=getCourseContent&id=${courseId}`, {
          withCredentials: true,
        }),
      ]);
      if (courseRes.data.success) setCourse(courseRes.data);
      if (contentRes.data.success) setModules(contentRes.data.modules || []);
      if (!courseRes.data.success || !contentRes.data.success) {
        setLoadError(
          courseRes.data.message ||
            contentRes.data.message ||
            "Не удалось загрузить урок.",
        );
      }
    } catch {
      setCourse(null);
      setModules([]);
      setLoadError(
        "Не удалось загрузить урок. Проверьте соединение и попробуйте ещё раз.",
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [courseId]);
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [lessonId]);
  const lessons = useMemo(() => flattenLessons(modules), [modules]);
  const currentLesson = lessons.find(
    (lesson) => Number(lesson.id_lesson) === Number(lessonId),
  );
  const currentIndex = lessons.findIndex(
    (lesson) => Number(lesson.id_lesson) === Number(lessonId),
  );
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  const accessState = getLessonAccessState(modules, lessonId);
  const taskStatus = currentLesson?.submission_status || "";
  const canSubmitTask =
    currentLesson?.type === "task" &&
    !["submitted", "review", "accepted"].includes(taskStatus);
  const hasQuizAttempt =
    currentLesson?.type === "quiz" &&
    currentLesson.quiz_score !== null &&
    currentLesson.quiz_score !== undefined;
  const quizPassed = Boolean(
    currentLesson?.quiz_passed || currentLesson?.completed,
  );
  const videoSrc =
    currentLesson?.type === "video" ? buildVideoSrc(currentLesson) : "";
  const quizData = useMemo(() => {
    if (currentLesson?.type !== "quiz") return null;
    try {
      const parsed = JSON.parse(currentLesson.content || "[]");
      const data = Array.isArray(parsed) ? { questions: parsed } : parsed;
      return {
        ...data,
        questions: prepareQuizQuestionsForStudent(
          data.questions || [],
          currentLesson.id_lesson,
        ),
      };
    } catch {
      return { questions: [] };
    }
  }, [currentLesson]);
  const savedQuizAnswers = useMemo(() => {
    if (currentLesson?.type !== "quiz") return {};
    try {
      const parsed = JSON.parse(currentLesson.quiz_answers_json || "{}");
      return normalizeQuizAnswersMap(parsed);
    } catch {
      return {};
    }
  }, [currentLesson]);
  const visibleQuizAnswers =
    Object.keys(quizAnswers).length > 0
      ? quizAnswers
      : quizPassed
        ? savedQuizAnswers
        : {};
  const showQuizReview =
    currentLesson?.type === "quiz" &&
    !quizRetryMode &&
    Boolean(quizFeedback || quizPassed);
  const quizLocked = Boolean(
    quizFeedback?.passed || currentLesson?.quiz_passed,
  );
  const quizInputsDisabled = Boolean(showQuizReview || quizLocked);
  const hasVisibleQuizResult =
    currentLesson?.type === "quiz" &&
    !quizRetryMode &&
    Boolean(hasQuizAttempt || quizFeedback);
  const visibleQuizPassed = Boolean(quizFeedback?.passed || quizPassed);
  const visibleQuizScore = quizFeedback?.score ?? currentLesson?.quiz_score;
  const visibleQuizPassScore =
    quizFeedback?.passScore ?? currentLesson?.pass_score ?? 70;
  const hasLessonText = Boolean((currentLesson?.content || "").trim());
  const videoMissing = currentLesson?.type === "video" && !videoSrc;
  const videoCompletionBlocked = videoMissing && !hasLessonText;
  const selectedAssignmentFiles = Array.from(assignmentFiles || []);
  const assignmentFilesLabel = selectedAssignmentFiles.length
    ? selectedAssignmentFiles.length === 1
      ? selectedAssignmentFiles[0].name
      : `${selectedAssignmentFiles.length} файлов выбрано`
    : "Файлы не выбраны";
  const getQuestionKey = (question, questionIndex) =>
    String(question.id_question || questionIndex);
  const getOptionValue = (option, optionIndex) =>
    String(option.id_option || optionIndex);
  const isCorrectOption = (option) =>
    Number(option.is_correct) === 1 || option.correct === true;
  const allowsMultipleAnswers = (question) =>
    (question.options || []).filter(isCorrectOption).length > 1;
  const isSelectedOption = (question, questionIndex, option, optionIndex) => {
    const selected = normalizeAnswerSelection(
      visibleQuizAnswers[getQuestionKey(question, questionIndex)],
    );
    return selected.includes(getOptionValue(option, optionIndex));
  };
  const updateQuizAnswer = (questionKey, optionValue, isMultiple, checked) => {
    setQuizAnswers((prev) => {
      const sourceAnswers =
        Object.keys(prev).length > 0 ? prev : visibleQuizAnswers;
      const nextAnswers = { ...sourceAnswers };
      const current = normalizeAnswerSelection(nextAnswers[questionKey]);
      if (!isMultiple) {
        return { ...nextAnswers, [questionKey]: [optionValue] };
      }
      const next = checked
        ? [...current, optionValue]
        : current.filter((item) => item !== optionValue);
      return { ...nextAnswers, [questionKey]: [...new Set(next)] };
    });
  };
  const handleLessonChange = (id) => {
    const access = getLessonAccessState(modules, id);
    if (!access.unlocked) {
      setStatusMessage(getLessonLockReason(access));
      return;
    }
    setStatusMessage("");
    setShowQuizHint(false);
    setQuizFeedback(null);
    setQuizRetryMode(false);
    navigate(`/course/${courseId}/lesson/${id}`);
    setSidebarOpen(false);
  };
  const restartQuiz = () => {
    setQuizAnswers({});
    setQuizFeedback(null);
    setQuizRetryMode(true);
    setStatusMessage("");
  };
  const markCurrentLessonComplete = async () => {
    if (
      !currentLesson ||
      currentLesson.type === "task" ||
      currentLesson.type === "quiz"
    ) {
      setStatusMessage("Этот урок завершается через сдачу задания или тест.");
      return;
    }
    if (currentLesson.type === "video" && videoCompletionBlocked) {
      setStatusMessage(
        "Видео и конспект пока не добавлены. Завершение будет доступно после добавления материала.",
      );
      return;
    }
    const response = await axios.post(
      `${API_URL}/?action=completeLesson`,
      {
        lesson_id: currentLesson.id_lesson,
      },
      { withCredentials: true },
    );
    if (response.data.success) {
      await fetchData({ showLoader: false });
      setStatusMessage("");
      if (nextLesson)
        navigate(`/course/${courseId}/lesson/${nextLesson.id_lesson}`);
      else navigate(`/course/${courseId}`);
    } else {
      setStatusMessage(response.data.message || "Не удалось завершить урок.");
    }
  };
  const submitAssignment = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("lesson_id", currentLesson.id_lesson);
    formData.append("answer_text", assignmentText);
    formData.append("answer_link", assignmentLink);
    Array.from(assignmentFiles || []).forEach((file) =>
      formData.append("files[]", file),
    );
    const response = await axios.post(
      `${API_URL}/?action=submitAssignment`,
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    setStatusMessage(
      response.data.success
        ? "Задание отправлено на проверку."
        : response.data.message || "Не удалось отправить задание.",
    );
    if (response.data.success) {
      setAssignmentText("");
      setAssignmentLink("");
      setAssignmentFiles([]);
      fetchData({ showLoader: false });
    }
  };
  const submitQuiz = async (event) => {
    event.preventDefault();
    const response = await axios.post(
      `${API_URL}/?action=submitQuiz`,
      {
        lesson_id: currentLesson.id_lesson,
        answers: visibleQuizAnswers,
      },
      { withCredentials: true },
    );
    if (response.data.success) {
      setStatusMessage(
        response.data.passed
          ? `Тест пройден: ${response.data.score}%.`
          : `Нужно набрать ${response.data.pass_score}%. Сейчас: ${response.data.score}%.`,
      );
      setQuizFeedback({
        passed: response.data.passed,
        score: response.data.score,
        passScore: response.data.pass_score,
      });
      setQuizRetryMode(false);
      fetchData({ showLoader: false });
    } else {
      setStatusMessage(response.data.message || "Не удалось проверить тест.");
    }
  };
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }
  if (loadError || !currentLesson) {
    return (
      <div className={styles.lockedPage}>
        <div>
          <span>Урок недоступен</span>
          <h1>Не удалось открыть материал</h1>
          <p>
            {loadError || "Урок не найден или пока не добавлен в программу."}
          </p>
          <button
            className={styles.completeBtn}
            onClick={() => navigate(`/course/${courseId}`)}
          >
            К программе курса
          </button>
        </div>
      </div>
    );
  }
  if (!accessState.unlocked) {
    return (
      <div className={styles.lockedPage}>
        <div>
          <span>Урок закрыт</span>
          <h1>Сначала завершите предыдущий шаг</h1>
          <p>
            Следующие уроки открываются последовательно: лекция, тест или
            домашка должны быть завершены по своему правилу.
          </p>
          <button
            className={styles.completeBtn}
            onClick={() => navigate(`/course/${courseId}`)}
          >
            К программе курса
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.pageContainer}>
      <LessonNavigation
        sidebarOpen={sidebarOpen}
        navigate={navigate}
        courseId={courseId}
        course={course}
        modules={modules}
        lessonId={lessonId}
        handleLessonChange={handleLessonChange}
      />

      <main
        ref={mainContentRef}
        className={styles.mainContent}
        data-scroll-top-target="lesson"
      >
        <div className={styles.topBar}>
          <button
            className={styles.menuToggle}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            ☰
          </button>
          <span>Программа курса</span>
          <button
            className={styles.backToCourses}
            onClick={() => navigate("/cabinet")}
          >
            Кабинет
          </button>
        </div>

        <LessonContent
          typeLabels={typeLabels}
          currentLesson={currentLesson}
          videoSrc={videoSrc}
          hasLessonText={hasLessonText}
          taskStatus={taskStatus}
          submissionLabels={submissionLabels}
          canSubmitTask={canSubmitTask}
          submitAssignment={submitAssignment}
          assignmentText={assignmentText}
          setAssignmentText={setAssignmentText}
          assignmentLink={assignmentLink}
          setAssignmentLink={setAssignmentLink}
          setAssignmentFiles={setAssignmentFiles}
          assignmentFilesLabel={assignmentFilesLabel}
          selectedAssignmentFiles={selectedAssignmentFiles}
          hasVisibleQuizResult={hasVisibleQuizResult}
          visibleQuizPassed={visibleQuizPassed}
          visibleQuizScore={visibleQuizScore}
          visibleQuizPassScore={visibleQuizPassScore}
          restartQuiz={restartQuiz}
          setShowQuizHint={setShowQuizHint}
          showQuizHint={showQuizHint}
          quizPassed={quizPassed}
          showQuizReview={showQuizReview}
          hasQuizAttempt={hasQuizAttempt}
          quizRetryMode={quizRetryMode}
          submitQuiz={submitQuiz}
          quizData={quizData}
          getQuestionKey={getQuestionKey}
          allowsMultipleAnswers={allowsMultipleAnswers}
          getOptionValue={getOptionValue}
          isCorrectOption={isCorrectOption}
          isSelectedOption={isSelectedOption}
          quizInputsDisabled={quizInputsDisabled}
          updateQuizAnswer={updateQuizAnswer}
          statusMessage={statusMessage}
          prevLesson={prevLesson}
          handleLessonChange={handleLessonChange}
          markCurrentLessonComplete={markCurrentLessonComplete}
          videoCompletionBlocked={videoCompletionBlocked}
          nextLesson={nextLesson}
          quizLocked={quizLocked}
          navigate={navigate}
          courseId={courseId}
        />
      </main>
      <ScrollTopButton targetSelector='[data-scroll-top-target="lesson"]' />
    </div>
  );
}
export default LessonViewer;
