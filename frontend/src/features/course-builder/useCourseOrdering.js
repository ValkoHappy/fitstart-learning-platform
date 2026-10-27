import { useState, useRef } from "react";
import axios from "../../services/apiClient";
import { API_URL } from "../../config/api";
export function useCourseOrdering({
  modules,
  setModules,
  addNotification,
  fetchCourseData,
}) {
  const [draggedModule, setDraggedModule] = useState(null);
  const [draggedLesson, setDraggedLesson] = useState(null);
  const [collapsedModules, setCollapsedModules] = useState({});
  const [dropTargetModuleId, setDropTargetModuleId] = useState(null);
  const [dropTargetLessonId, setDropTargetLessonId] = useState(null);
  const dragAllowedRef = useRef(false);
  const toggleModule = (e, moduleId) => {
    e.stopPropagation();
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };
  const handleDragStart = (e, module) => {
    if (!dragAllowedRef.current) {
      e.preventDefault();
      return;
    }
    if (draggedLesson) {
      e.preventDefault();
      return;
    }
    setDraggedModule(module);
    e.dataTransfer.effectAllowed = "move";
    dragAllowedRef.current = false;
  };
  const handleDragOver = (e, module) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedModule && module.id_module !== draggedModule.id_module) {
      setDropTargetModuleId(module.id_module);
    }
  };
  const handleDragLeave = (e) => {};
  const handleDrop = async (e, targetModule) => {
    e.preventDefault();
    setDropTargetModuleId(null);
    if (draggedLesson) return;
    if (!draggedModule || draggedModule.id_module === targetModule.id_module)
      return;
    const newModules = [...modules];
    const draggedIndex = newModules.findIndex(
      (m) => m.id_module === draggedModule.id_module,
    );
    const targetIndex = newModules.findIndex(
      (m) => m.id_module === targetModule.id_module,
    );
    newModules.splice(draggedIndex, 1);
    newModules.splice(targetIndex, 0, draggedModule);
    setModules(newModules);
    setDraggedModule(null);
    try {
      await axios.post(
        `${API_URL}/?action=reorderModules`,
        {
          modules: newModules.map((m) => m.id_module),
        },
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Module reorder failed", error);
      addNotification("Ошибка сохранения порядка модулей", "error");
      fetchCourseData();
    }
  };
  const handleDragEnd = () => {
    setDraggedModule(null);
    setDraggedLesson(null);
    setDropTargetModuleId(null);
    setDropTargetLessonId(null);
    dragAllowedRef.current = false;
  };
  const handleLessonDragStart = (e, lesson, module) => {
    if (!dragAllowedRef.current) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedLesson({ lesson, module });
    e.dataTransfer.effectAllowed = "move";
    dragAllowedRef.current = false;
  };
  const handleLessonDragOver = (e, lesson) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedLesson && draggedLesson.lesson.id_lesson !== lesson.id_lesson) {
      setDropTargetLessonId(lesson.id_lesson);
    }
  };
  const handleLessonDrop = async (e, targetLesson, targetModule) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetLessonId(null);
    if (!draggedLesson) return;
    if (draggedLesson.module.id_module !== targetModule.id_module) return;
    if (draggedLesson.lesson.id_lesson === targetLesson.id_lesson) return;
    const newModules = [...modules];
    const moduleIndex = newModules.findIndex(
      (m) => m.id_module === targetModule.id_module,
    );
    const activeModule = { ...newModules[moduleIndex] };
    const newLessons = [...activeModule.lessons];
    const draggedIndex = newLessons.findIndex(
      (l) => l.id_lesson === draggedLesson.lesson.id_lesson,
    );
    const targetIndex = newLessons.findIndex(
      (l) => l.id_lesson === targetLesson.id_lesson,
    );
    const [movedLesson] = newLessons.splice(draggedIndex, 1);
    newLessons.splice(targetIndex, 0, movedLesson);
    activeModule.lessons = newLessons;
    newModules[moduleIndex] = activeModule;
    setModules(newModules);
    setDraggedLesson(null);
    try {
      await axios.post(
        `${API_URL}/?action=reorderLessons`,
        {
          lessons: newLessons.map((l) => l.id_lesson),
        },
        { withCredentials: true },
      );
    } catch (error) {
      console.error("Lesson reorder failed", error);
      addNotification("Ошибка сохранения порядка уроков", "error");
      fetchCourseData();
    }
  };
  const onHandleMouseDown = () => {
    dragAllowedRef.current = true;
  };
  const onHandleMouseUp = () => {
    dragAllowedRef.current = false;
  };
  return {
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
  };
}
