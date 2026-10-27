<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Course.php';
require_once dirname(__DIR__) . '/models/Module.php';
require_once dirname(__DIR__) . '/models/Lesson.php';
require_once dirname(__DIR__) . '/services/CourseImageStorage.php';

class CourseController
{

    private $db;
    private $course;
    private $module;
    private $lesson;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $conn = $this->db->getConnection();
        $this->course = new Course($conn);
        $this->module = new Module($conn);
        $this->lesson = new Lesson($conn);
    }

    public function handle($action)
    {
        switch ($action) {
            case 'getCourses':
                $this->course->getAll();
                break;
            case 'getCourse':
                $this->course->getById($_GET['id'] ?? 0);
                break;
            case 'getCourseContent':
                $this->getCourseContent();
                break;
            case 'checkAccess':
                $this->course->checkAccess();
                break;
            case 'createCourse':
                $this->handleCreateCourse();
                break;
            case 'updateCourse':
                $this->handleUpdateCourse();
                break;
            case 'deleteCourse':
                $this->handleDeleteCourse();
                break;
            case 'createModule':
                $this->handleCreateModule();
                break;
            case 'updateModule':
                $this->handleUpdateModule();
                break;
            case 'deleteModule':
                $this->handleDeleteModule();
                break;
            case 'createLesson':
                $this->handleCreateLesson();
                break;
            case 'updateLesson':
                $this->handleUpdateLesson();
                break;
            case 'deleteLesson':
                $this->handleDeleteLesson();
                break;
            case 'reorderModules':
                $this->handleReorderModules();
                break;
            case 'reorderLessons':
                $this->handleReorderLessons();
                break;
        }
    }

    private function getCourseContent()
    {
        $courseId = intval($_GET['id'] ?? 0);
        if (!$courseId) {
            echo json_encode(['success' => false, 'message' => 'Course ID required']);
            return;
        }
        $userId = $_SESSION['user_id'] ?? null;
        $modules = $this->module->getByCourseId($courseId, $userId);
        if (!$this->canViewCourseContent($courseId)) {
            foreach ($modules as &$module) {
                foreach ($module['lessons'] as &$lesson) {
                    $lesson['content'] = '';
                    $lesson['video_ref'] = '';
                    $lesson['locked_preview'] = true;
                }
            }
        }
        echo json_encode(['success' => true, 'modules' => $modules]);
    }

    private function handleCreateCourse()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }

        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $accessType = $_POST['access_type'] ?? 'application';
        try {
            $imagePath = (new CourseImageStorage())->upload();
            $this->course->create($title, $description, $imagePath, $accessType);
        } catch (RuntimeException $error) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    private function handleUpdateCourse()
    {
        $id = intval($_POST['id'] ?? 0);
        if (!$id || !$this->canEditCourse($id)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }

        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $accessType = $_POST['access_type'] ?? 'application';
        try {
            $imagePath = (new CourseImageStorage())->upload();
            $this->course->update($id, $title, $description, $imagePath ?: null, $accessType);
        } catch (RuntimeException $error) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    private function handleDeleteCourse()
    {
        $id = intval($_POST['id'] ?? 0);
        if (!$id || !$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $this->course->delete($id);
    }

    private function handleCreateModule()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $courseId = intval($data['course_id'] ?? 0);
        if (!$this->canEditCourse($courseId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $id = $this->module->create($courseId, trim($data['title'] ?? ''));
        echo json_encode(['success' => (bool)$id, 'id_module' => $id]);
    }

    private function handleUpdateModule()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $moduleId = intval($data['id_module'] ?? 0);
        if (!$moduleId || !$this->canEditModule($moduleId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $ok = $this->module->update($moduleId, trim($data['title'] ?? ''));
        echo json_encode(['success' => (bool)$ok]);
    }

    private function handleDeleteModule()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $moduleId = intval($data['id_module'] ?? 0);
        if (!$moduleId || !$this->canEditModule($moduleId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        echo json_encode(['success' => (bool)$this->module->delete($moduleId)]);
    }

    private function handleCreateLesson()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $moduleId = intval($data['module_id'] ?? 0);
        if (!$this->canEditModule($moduleId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $id = $this->lesson->create(
            $moduleId,
            trim($data['title'] ?? ''),
            $data['type'] ?? 'text',
            $data['content'] ?? '',
            $data['duration'] ?? '',
            $data['video_provider'] ?? null,
            $data['video_ref'] ?? null,
            $data['pass_score'] ?? null,
            $data['completion_policy'] ?? null
        );
        echo json_encode(['success' => (bool)$id, 'id_lesson' => $id]);
    }

    private function handleUpdateLesson()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonId = intval($data['id_lesson'] ?? 0);
        if (!$lessonId || !$this->canEditLesson($lessonId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $ok = $this->lesson->update(
            $lessonId,
            trim($data['title'] ?? ''),
            $data['type'] ?? 'text',
            $data['content'] ?? '',
            $data['duration'] ?? '',
            $data['video_provider'] ?? null,
            $data['video_ref'] ?? null,
            $data['pass_score'] ?? null,
            $data['completion_policy'] ?? null
        );
        echo json_encode(['success' => (bool)$ok]);
    }

    private function handleDeleteLesson()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonId = intval($data['id_lesson'] ?? 0);
        if (!$lessonId || !$this->canEditLesson($lessonId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        echo json_encode(['success' => (bool)$this->lesson->delete($lessonId)]);
    }

    private function handleReorderModules()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $moduleIds = $data['modules'] ?? [];
        if (empty($moduleIds) || !$this->canEditOrderedModules($moduleIds)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        echo json_encode(['success' => $this->module->reorder($moduleIds)]);
    }

    private function handleReorderLessons()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonIds = $data['lessons'] ?? [];
        if (empty($lessonIds) || !$this->canEditOrderedLessons($lessonIds)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        echo json_encode(['success' => $this->lesson->reorder($lessonIds)]);
    }

    private function isAdmin()
    {
        return ($_SESSION['user_role'] ?? '') === 'admin';
    }

    private function isAdminOrCurator()
    {
        return in_array($_SESSION['user_role'] ?? '', ['admin', 'curator'], true);
    }

    private function canEditCourse($courseId)
    {
        if ($this->isAdmin()) {
            return true;
        }
        if (($_SESSION['user_role'] ?? '') !== 'curator' || empty($_SESSION['user_id'])) {
            return false;
        }
        $stmt = $this->db->getConnection()->prepare("SELECT can_edit_content FROM course_staff_permissions WHERE id_user = ? AND id_course = ? LIMIT 1");
        $userId = intval($_SESSION['user_id']);
        $stmt->bind_param('ii', $userId, $courseId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return !empty($row['can_edit_content']);
    }

    private function canViewCourseContent($courseId)
    {
        if ($this->isAdmin() || $this->canEditCourse($courseId)) {
            return true;
        }
        $stmt = $this->db->getConnection()->prepare("SELECT access_type FROM courses WHERE id_course = ?");
        $stmt->bind_param('i', $courseId);
        $stmt->execute();
        $course = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (($course['access_type'] ?? 'application') === 'free') {
            return true;
        }
        if (empty($_SESSION['user_id'])) {
            return false;
        }
        $userId = intval($_SESSION['user_id']);
        $stmt = $this->db->getConnection()->prepare("SELECT id_enrollment FROM course_enrollments WHERE id_user = ? AND id_course = ? AND status = 'active' LIMIT 1");
        $stmt->bind_param('ii', $userId, $courseId);
        $stmt->execute();
        $hasAccess = $stmt->get_result()->num_rows > 0;
        $stmt->close();
        return $hasAccess;
    }

    private function canEditOrderedModules($moduleIds)
    {
        $ids = array_values(array_unique(array_map('intval', $moduleIds)));
        if (empty($ids) || count($ids) !== count($moduleIds)) {
            return false;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));
        $stmt = $this->db->getConnection()->prepare("SELECT DISTINCT id_course FROM modules WHERE id_module IN ({$placeholders})");
        $params = [];
        foreach ($ids as $key => $value) {
            $params[$key] = &$ids[$key];
        }
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $courses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return count($courses) === 1 && $this->canEditCourse(intval($courses[0]['id_course']));
    }

    private function canEditOrderedLessons($lessonIds)
    {
        $ids = array_values(array_unique(array_map('intval', $lessonIds)));
        if (empty($ids) || count($ids) !== count($lessonIds)) {
            return false;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));
        $stmt = $this->db->getConnection()->prepare("SELECT DISTINCT l.id_module, m.id_course FROM lessons l JOIN modules m ON l.id_module = m.id_module WHERE l.id_lesson IN ({$placeholders})");
        $params = [];
        foreach ($ids as $key => $value) {
            $params[$key] = &$ids[$key];
        }
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return count($rows) === 1 && $this->canEditCourse(intval($rows[0]['id_course']));
    }

    private function canEditModule($moduleId)
    {
        $stmt = $this->db->getConnection()->prepare("SELECT id_course FROM modules WHERE id_module = ?");
        $stmt->bind_param('i', $moduleId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ? $this->canEditCourse(intval($row['id_course'])) : false;
    }

    private function canEditLesson($lessonId)
    {
        $stmt = $this->db->getConnection()->prepare("SELECT m.id_course FROM lessons l JOIN modules m ON l.id_module = m.id_module WHERE l.id_lesson = ?");
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ? $this->canEditCourse(intval($row['id_course'])) : false;
    }
}
