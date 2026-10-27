import { useCourseOrdering } from "../features/course-builder/useCourseOrdering";
import LessonEditor from "../features/course-builder/LessonEditor";
import CourseStructure from "../features/course-builder/CourseStructure";
import CourseMetaForm from "../features/course-builder/CourseMetaForm";
import QuizEditor from "../features/course-builder/QuizEditor";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../services/apiClient";
import { API_URL } from "../config/api";
import styles from "./CourseBuilder.module.scss";
import Loader from "../Components/UI/Loader";
import { useNotification } from "../context/NotificationContext";
import ConfirmModal from "../Components/UI/ConfirmModal";
import {
  buildLessonPayload,
  normalizeQuizQuestion,
  parseQuizContent,
} from "../lib/adminPayloads";
import { prepareCourseImageForUpload } from "../lib/courseImageUpload";
import OptimizedImage from "../Components/OptimizedImage";
const emptyLesson = () => ({
  title: "",
  type: "text",
  content: "",
  duration: "",
  video_provider: "external",
  video_ref: "",
  pass_score: 70,
  questions: parseQuizContent(""),
});
const emptyCourseMeta = () => ({
  title: "",
  description: "",
  access_type: "application",
  image_file: null,
});
const CourseBuilder = ({ userRole }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [courseMeta, setCourseMeta] = useState(emptyCourseMeta());
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courseImagePreview, setCourseImagePreview] = useState("");
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLesson, setNewLesson] = useState(emptyLesson());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmDeleteModule, setShowConfirmDeleteModule] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  const courseImageInputRef = useRef(null);
  const fetchCourseData = async () => {
    try {
      setIsLoading(true);
      const courseRes = await axios.get(
        `${API_URL}/?action=getCourse&id=${id}`,
        { withCredentials: true },
      );
      if (courseRes.data.success) {
        setCourse(courseRes.data);
        setCourseMeta({
          title: courseRes.data.title || "",
          description: courseRes.data.description || "",
          access_type: courseRes.data.access_type || "application",
          image_file: null,
        });
        setCourseImagePreview("");
      } else {
        addNotification("Курс не найден", "error");
        navigate("/courses");
        return;
      }
      const contentRes = await axios.get(
        `${API_URL}/?action=getCourseContent&id=${id}`,
        { withCredentials: true },
      );
      if (contentRes.data.success) {
        setModules(contentRes.data.modules);
      }
    } catch (error) {
      console.error(error);
      addNotification("Ошибка загрузки данных", "error");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    return () => {
      if (courseImagePreview) {
        URL.revokeObjectURL(courseImagePreview);
      }
    };
  }, [courseImagePreview]);
  const handleCourseImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setCourseMeta({ ...courseMeta, image_file: file });
    setCourseImagePreview((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };
  const handleSaveCourseMeta = async (e) => {
    e.preventDefault();
    if (!courseMeta.title.trim()) {
      addNotification("Название курса обязательно", "error");
      return;
    }
    try {
      setIsSavingCourse(true);
      const formData = new FormData();
      formData.append("id", id);
      formData.append("title", courseMeta.title.trim());
      formData.append("description", courseMeta.description || "");
      formData.append("access_type", courseMeta.access_type || "application");
      if (courseMeta.image_file) {
        const imageFile = await prepareCourseImageForUpload(
          courseMeta.image_file,
        );
        formData.append("image", imageFile);
      }
      const res = await axios.post(
        `${API_URL}/?action=updateCourse`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      if (res.data.success) {
        addNotification("Настройки курса сохранены", "success");
        fetchCourseData();
      } else {
        addNotification(
          res.data.message || "Не удалось сохранить курс",
          "error",
        );
      }
    } catch (error) {
      addNotification(
        error.response?.data?.message || "Ошибка сервера при сохранении курса",
        "error",
      );
    } finally {
      setIsSavingCourse(false);
    }
  };
  const handleCreateModule = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/?action=createModule`,
        {
          course_id: id,
          title: newModuleTitle,
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        addNotification("Модуль создан", "success");
        setNewModuleTitle("");
        setShowAddModule(false);
        fetchCourseData();
      } else {
        addNotification(res.data.message || "Ошибка создания", "error");
      }
    } catch (error) {
      addNotification("Ошибка сервера", "error");
    }
  };
  const startEditModule = (e, module) => {
    e.stopPropagation();
    setActiveModuleId(module.id_module);
    setEditingModuleId(module.id_module);
    setEditingModuleTitle(module.title || "");
  };
  const cancelEditModule = (e) => {
    e.stopPropagation();
    setEditingModuleId(null);
    setEditingModuleTitle("");
  };
  const handleUpdateModule = async (e, moduleId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingModuleTitle.trim()) {
      addNotification("Название модуля обязательно", "error");
      return;
    }
    try {
      const res = await axios.post(
        `${API_URL}/?action=updateModule`,
        {
          id_module: moduleId,
          title: editingModuleTitle.trim(),
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        addNotification("Модуль обновлен", "success");
        setEditingModuleId(null);
        setEditingModuleTitle("");
        fetchCourseData();
      } else {
        addNotification(
          res.data.message || "Не удалось обновить модуль",
          "error",
        );
      }
    } catch (error) {
      addNotification("Ошибка сервера при обновлении модуля", "error");
    }
  };
  const requestDeleteModule = (e, module) => {
    e.stopPropagation();
    setModuleToDelete(module);
    setShowConfirmDeleteModule(true);
  };
  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    try {
      const res = await axios.post(
        `${API_URL}/?action=deleteModule`,
        {
          id_module: moduleToDelete.id_module,
        },
        { withCredentials: true },
      );
      if (res.data.success) {
        addNotification("Модуль удален", "success");
        if (activeModuleId === moduleToDelete.id_module) {
          resetLessonForm();
          setActiveModuleId(null);
        }
        fetchCourseData();
      } else {
        addNotification(
          res.data.message || "Не удалось удалить модуль",
          "error",
        );
      }
    } catch (error) {
      addNotification("Ошибка сервера при удалении модуля", "error");
    } finally {
      setModuleToDelete(null);
      setShowConfirmDeleteModule(false);
    }
  };
  const handleCreateLesson = async (e) => {
    e.preventDefault();
    try {
      const action = activeLessonId ? "updateLesson" : "createLesson";
      const payload = buildLessonPayload(
        activeLessonId
          ? {
              id_lesson: activeLessonId,
              module_id: activeModuleId,
              ...newLesson,
            }
          : { module_id: activeModuleId, ...newLesson },
      );
      const res = await axios.post(`${API_URL}/?action=${action}`, payload, {
        withCredentials: true,
      });
      if (res.data.success) {
        const lessonId =
          activeLessonId || res.data.id_lesson || res.data.data?.id_lesson;
        if (payload.type === "quiz" && lessonId) {
          const questions = (newLesson.questions || []).map(
            normalizeQuizQuestion,
          );
          await axios.post(
            `${API_URL}/?action=saveQuizQuestions`,
            {
              lesson_id: lessonId,
              questions,
            },
            { withCredentials: true },
          );
        }
        addNotification(
          activeLessonId ? "Урок обновлен" : "Урок создан",
          "success",
        );
        resetLessonForm();
        fetchCourseData();
      } else {
        addNotification(res.data.message || "Ошибка", "error");
      }
    } catch (error) {
      addNotification("Ошибка сервера", "error");
    }
  };
  useEffect(() => {
    fetchCourseData();
  }, [id]);
  const handleDeleteLesson = () => {
    if (!activeLessonId) return;
    setShowConfirmDelete(true);
  };
  const confirmDeleteLesson = async () => {
    try {
      const res = await axios.post(
        `${API_URL}/?action=deleteLesson`,
        { id_lesson: activeLessonId },
        { withCredentials: true },
      );
      if (res.data.success) {
        addNotification("Урок удален", "success");
        resetLessonForm();
        fetchCourseData();
      } else {
        addNotification(res.data.message, "error");
      }
    } catch (error) {
      addNotification("Ошибка сервера", "error");
    } finally {
      setShowConfirmDelete(false);
    }
  };
  const resetLessonForm = () => {
    setNewLesson(emptyLesson());
    setActiveLessonId(null);
    setShowAddLesson(false);
  };
  const openEditLesson = (lesson) => {
    setActiveModuleId(lesson.id_module);
    setNewLesson({
      title: lesson.title,
      type: lesson.type || "text",
      content: lesson.content || "",
      duration: lesson.duration || "",
      video_provider: lesson.video_provider || "external",
      video_ref: lesson.video_ref || "",
      pass_score: lesson.pass_score || 70,
      questions: parseQuizContent(lesson.content),
    });
    setActiveLessonId(lesson.id_lesson);
    setShowAddLesson(true);
  };
  const {
    draggedModule,
    setDraggedModule,
    draggedLesson,
    setDraggedLesson,
    collapsedModules,
    setCollapsedModules,
    dropTargetModuleId,
    setDropTargetModuleId,
    dropTargetLessonId,
    setDropTargetLessonId,
    dragAllowedRef,
    toggleModule,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleLessonDragStart,
    handleLessonDragOver,
    handleLessonDrop,
    onHandleMouseDown,
    onHandleMouseUp,
  } = useCourseOrdering({
    modules,
    setModules,
    addNotification,
    fetchCourseData,
  });
  const updateQuestion = (questionIndex, patch) => {
    setNewLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? normalizeQuizQuestion({ ...question, ...patch })
          : question,
      ),
    }));
  };
  const addQuestion = () => {
    setNewLesson((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        normalizeQuizQuestion({
          question: "",
          options: [
            { option_text: "", is_correct: true },
            { option_text: "", is_correct: false },
          ],
        }),
      ],
    }));
  };
  const removeQuestion = (questionIndex) => {
    setNewLesson((prev) => ({
      ...prev,
      questions:
        prev.questions.length > 1
          ? prev.questions.filter((_, index) => index !== questionIndex)
          : prev.questions,
    }));
  };
  const updateOption = (questionIndex, optionIndex, patch) => {
    setNewLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        const options = question.options.map((option, currentIndex) => {
          if (Object.prototype.hasOwnProperty.call(patch, "is_correct")) {
            return currentIndex === optionIndex
              ? { ...option, is_correct: patch.is_correct }
              : option;
          }
          return currentIndex === optionIndex
            ? { ...option, ...patch }
            : option;
        });
        return normalizeQuizQuestion({ ...question, options });
      }),
    }));
  };
  const addOption = (questionIndex) => {
    setNewLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return normalizeQuizQuestion({
          ...question,
          options: [
            ...question.options,
            { option_text: "", is_correct: false },
          ],
        });
      }),
    }));
  };
  const removeOption = (questionIndex, optionIndex) => {
    setNewLesson((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) => {
        if (index !== questionIndex || question.options.length <= 2)
          return question;
        return normalizeQuizQuestion({
          ...question,
          options: question.options.filter(
            (_, currentIndex) => currentIndex !== optionIndex,
          ),
        });
      }),
    }));
  };
  const getIcon = (type) => {
    switch (type) {
      case "video":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        );
      case "task":
      case "quiz":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            <path d="M9 14l2 2 4-4"></path>
          </svg>
        );
      default:
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        );
    }
  };
  if (isLoading) return <Loader />;
  const moduleCount = modules.length;
  const lessonCount = modules.reduce(
    (sum, module) => sum + (module.lessons?.length || 0),
    0,
  );
  const activeModule = modules.find(
    (module) => module.id_module === activeModuleId,
  );
  return (
    <div className={styles.builderContainer}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <button
            className={styles.backBtn}
            onClick={() => navigate("/courses")}
          >
            ← Назад к курсам
          </button>
          <span className={styles.kicker}>Редактор программы</span>
          <h1>{course?.title || "Конструктор курса"}</h1>
          <p>
            Соберите модули, уроки, видео, задания и тесты в последовательную
            программу обучения.
          </p>
        </div>
        <div className={styles.builderStats} aria-label="Статистика курса">
          <article>
            <strong>{moduleCount}</strong>
            <span>модулей</span>
          </article>
          <article>
            <strong>{lessonCount}</strong>
            <span>уроков</span>
          </article>
          <article>
            <strong>{activeModule ? "Да" : "Не выбран"}</strong>
            <span>активный модуль</span>
          </article>
        </div>
      </div>

      <CourseMetaForm
        handleSaveCourseMeta={handleSaveCourseMeta}
        courseMeta={courseMeta}
        setCourseMeta={setCourseMeta}
        courseImageInputRef={courseImageInputRef}
        handleCourseImageChange={handleCourseImageChange}
        courseImagePreview={courseImagePreview}
        course={course}
        isSavingCourse={isSavingCourse}
      />

      <div className={styles.contentArea}>
        <CourseStructure
          setShowAddModule={setShowAddModule}
          showAddModule={showAddModule}
          handleCreateModule={handleCreateModule}
          newModuleTitle={newModuleTitle}
          setNewModuleTitle={setNewModuleTitle}
          setDropTargetModuleId={setDropTargetModuleId}
          modules={modules}
          activeModuleId={activeModuleId}
          draggedModule={draggedModule}
          dropTargetModuleId={dropTargetModuleId}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
          setActiveModuleId={setActiveModuleId}
          toggleModule={toggleModule}
          collapsedModules={collapsedModules}
          onHandleMouseDown={onHandleMouseDown}
          onHandleMouseUp={onHandleMouseUp}
          editingModuleId={editingModuleId}
          handleUpdateModule={handleUpdateModule}
          editingModuleTitle={editingModuleTitle}
          setEditingModuleTitle={setEditingModuleTitle}
          cancelEditModule={cancelEditModule}
          startEditModule={startEditModule}
          requestDeleteModule={requestDeleteModule}
          setNewLesson={setNewLesson}
          emptyLesson={emptyLesson}
          setActiveLessonId={setActiveLessonId}
          setShowAddLesson={setShowAddLesson}
          setDropTargetLessonId={setDropTargetLessonId}
          draggedLesson={draggedLesson}
          dropTargetLessonId={dropTargetLessonId}
          openEditLesson={openEditLesson}
          handleLessonDragStart={handleLessonDragStart}
          handleLessonDragOver={handleLessonDragOver}
          handleLessonDrop={handleLessonDrop}
          getIcon={getIcon}
        />

        <LessonEditor
          showAddLesson={showAddLesson}
          activeModuleId={activeModuleId}
          activeLessonId={activeLessonId}
          modules={modules}
          handleCreateLesson={handleCreateLesson}
          newLesson={newLesson}
          setNewLesson={setNewLesson}
          removeQuestion={removeQuestion}
          updateQuestion={updateQuestion}
          updateOption={updateOption}
          removeOption={removeOption}
          addOption={addOption}
          addQuestion={addQuestion}
          setShowAddLesson={setShowAddLesson}
          setActiveLessonId={setActiveLessonId}
          handleDeleteLesson={handleDeleteLesson}
        />
      </div>

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={confirmDeleteLesson}
        title="Удалить урок?"
        message="Это действие нельзя отменить."
      />
      <ConfirmModal
        isOpen={showConfirmDeleteModule}
        onClose={() => {
          setShowConfirmDeleteModule(false);
          setModuleToDelete(null);
        }}
        onConfirm={confirmDeleteModule}
        title="Удалить модуль?"
        message={`Модуль "${moduleToDelete?.title || ""}" и все его уроки будут удалены. Это действие нельзя отменить.`}
      />
    </div>
  );
};
export default CourseBuilder;
