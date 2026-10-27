<?php
class Course
{
    private $conn;

    public function __construct($connection)
    {
        $this->conn = $connection;
    }

    public function getAll()
    {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM courses WHERE is_active = 1 ORDER BY created_at DESC");
            $stmt->execute();
            $courses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            $userId = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
            $role = $_SESSION['user_role'] ?? 'guest';
            $courseIds = array_map('intval', array_column($courses, 'id_course'));
            $enrollments = $userId && $role !== 'admin' ? $this->getUserEnrollmentsByCourse($userId, $courseIds) : [];
            $applications = $userId ? $this->getUserApplicationsByCourse($userId, $courseIds) : [];
            $progressByCourse = $userId ? $this->getUserProgressByCourse($userId, $courseIds) : [];

            foreach ($courses as &$course) {
                $courseId = intval($course['id_course']);
                $isFree = (($course['access_type'] ?? 'application') === 'free');
                $course['has_access'] = $role === 'admin'
                    || $isFree
                    || isset($enrollments[$courseId]);
                $course['application'] = $applications[$courseId] ?? null;
                $course['progress'] = $userId && $course['has_access'] ? ($progressByCourse[$courseId] ?? 0) : 0;
            }

            echo json_encode($courses);
        } catch (Exception $e) {
            error_log("Get courses error: " . $e->getMessage());
            echo json_encode([]);
        }
    }

    public function getById($id)
    {
        try {
            $courseId = intval($id);
            $stmt = $this->conn->prepare("SELECT * FROM courses WHERE id_course = ? AND is_active = 1");
            $stmt->bind_param('i', $courseId);
            $stmt->execute();
            $course = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$course) {
                echo json_encode(['success' => false, 'message' => 'Курс не найден']);
                return;
            }

            $userId = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
            $role = $_SESSION['user_role'] ?? 'guest';
            $course['success'] = true;
            $course['has_access'] = $role === 'admin'
                || (($course['access_type'] ?? 'application') === 'free')
                || ($userId && $this->checkUserAccess($userId, $courseId));
            $course['application'] = $userId ? $this->getUserApplicationState($userId, $courseId) : null;
            echo json_encode($course);
        } catch (Exception $e) {
            error_log("Get course error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Ошибка получения курса']);
        }
    }

    private function checkUserAccess($userId, $courseId)
    {
        try {
            $stmt = $this->conn->prepare("SELECT access_type FROM courses WHERE id_course = ? AND is_active = 1");
            $stmt->bind_param('i', $courseId);
            $stmt->execute();
            $course = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (($course['access_type'] ?? 'application') === 'free') {
                return true;
            }

            $stmt = $this->conn->prepare("SELECT id_enrollment FROM course_enrollments WHERE id_user = ? AND id_course = ? AND status = 'active' LIMIT 1");
            $stmt->bind_param('ii', $userId, $courseId);
            $stmt->execute();
            $hasAccess = $stmt->get_result()->num_rows > 0;
            $stmt->close();
            return $hasAccess;
        } catch (Exception $e) {
            error_log("Check access error: " . $e->getMessage());
            return false;
        }
    }

    private function getUserApplicationState($userId, $courseId)
    {
        try {
            $stmt = $this->conn->prepare("SELECT a.id_application, a.id_status, s.status_name
                FROM applications a
                LEFT JOIN application_statuses s ON a.id_status = s.id_status
                WHERE a.id_user = ? AND a.id_course = ? AND a.id_status IN (1,2,3)
                ORDER BY a.created_at DESC
                LIMIT 1");
            $stmt->bind_param('ii', $userId, $courseId);
            $stmt->execute();
            $application = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            return $application ?: null;
        } catch (Exception $e) {
            error_log("Get application state error: " . $e->getMessage());
            return null;
        }
    }

    private function getUserEnrollmentsByCourse($userId, array $courseIds)
    {
        $courseIds = array_values(array_unique(array_filter(array_map('intval', $courseIds))));
        if (!$userId || empty($courseIds)) {
            return [];
        }

        try {
            $idList = implode(',', $courseIds);
            $stmt = $this->conn->prepare("SELECT id_course FROM course_enrollments WHERE id_user = ? AND status = 'active' AND id_course IN ({$idList})");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            $result = [];
            foreach ($rows as $row) {
                $result[intval($row['id_course'])] = true;
            }
            return $result;
        } catch (Exception $e) {
            error_log("Get enrollments by course error: " . $e->getMessage());
            return [];
        }
    }

    private function getUserApplicationsByCourse($userId, array $courseIds)
    {
        $courseIds = array_values(array_unique(array_filter(array_map('intval', $courseIds))));
        if (!$userId || empty($courseIds)) {
            return [];
        }

        try {
            $idList = implode(',', $courseIds);
            $stmt = $this->conn->prepare("SELECT a.id_course, a.id_application, a.id_status, s.status_name
                FROM applications a
                LEFT JOIN application_statuses s ON a.id_status = s.id_status
                WHERE a.id_user = ? AND a.id_course IN ({$idList}) AND a.id_status IN (1,2,3)
                ORDER BY a.id_course ASC, a.created_at DESC");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            $result = [];
            foreach ($rows as $row) {
                $courseId = intval($row['id_course']);
                if (!isset($result[$courseId])) {
                    unset($row['id_course']);
                    $result[$courseId] = $row;
                }
            }
            return $result;
        } catch (Exception $e) {
            error_log("Get applications by course error: " . $e->getMessage());
            return [];
        }
    }

    private function getUserProgressByCourse($userId, array $courseIds)
    {
        $courseIds = array_values(array_unique(array_filter(array_map('intval', $courseIds))));
        if (!$userId || empty($courseIds)) {
            return [];
        }

        try {
            $idList = implode(',', $courseIds);
            $totals = [];
            $stmt = $this->conn->prepare("SELECT m.id_course, COUNT(l.id_lesson) AS total
                FROM modules m
                LEFT JOIN lessons l ON l.id_module = m.id_module
                WHERE m.id_course IN ({$idList})
                GROUP BY m.id_course");
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            foreach ($rows as $row) {
                $totals[intval($row['id_course'])] = intval($row['total'] ?? 0);
            }

            $completed = [];
            $stmt = $this->conn->prepare("SELECT m.id_course, COUNT(DISTINCT lp.id_lesson) AS completed
                FROM lesson_progress lp
                JOIN lessons l ON lp.id_lesson = l.id_lesson
                JOIN modules m ON l.id_module = m.id_module
                WHERE lp.id_user = ? AND m.id_course IN ({$idList})
                GROUP BY m.id_course");
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            foreach ($rows as $row) {
                $completed[intval($row['id_course'])] = intval($row['completed'] ?? 0);
            }

            $result = [];
            foreach ($courseIds as $courseId) {
                $total = $totals[$courseId] ?? 0;
                $result[$courseId] = $total > 0 ? (int) round((($completed[$courseId] ?? 0) / $total) * 100) : 0;
            }
            return $result;
        } catch (Exception $e) {
            error_log("Get progress by course error: " . $e->getMessage());
            return [];
        }
    }

    public function checkAccess()
    {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(['success' => true, 'has_access' => false]);
            return;
        }
        $courseId = intval($_GET['id'] ?? 0);
        $hasAccess = $courseId > 0 && $this->checkUserAccess(intval($_SESSION['user_id']), $courseId);
        echo json_encode(['success' => true, 'has_access' => $hasAccess]);
    }

    private function normalizeAccessType($accessType)
    {
        $allowed = ['free', 'application', 'paid_later'];
        return in_array($accessType, $allowed, true) ? $accessType : 'application';
    }

    public function create($title, $description, $imagePath, $accessType = 'application')
    {
        if (empty($title)) {
            echo json_encode(['success' => false, 'message' => 'Название курса обязательно']);
            return;
        }
        $accessType = $this->normalizeAccessType($accessType);
        $stmt = $this->conn->prepare("INSERT INTO courses (title, description, image_path, access_type) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('ssss', $title, $description, $imagePath, $accessType);
        $ok = $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        echo json_encode(['success' => $ok, 'id' => $id]);
    }

    public function update($id, $title, $description, $imagePath = null, $accessType = 'application')
    {
        if (empty($title)) {
            echo json_encode(['success' => false, 'message' => 'Название курса обязательно']);
            return;
        }
        $accessType = $this->normalizeAccessType($accessType);
        if ($imagePath) {
            $stmt = $this->conn->prepare("UPDATE courses SET title = ?, description = ?, image_path = ?, access_type = ? WHERE id_course = ?");
            $stmt->bind_param('ssssi', $title, $description, $imagePath, $accessType, $id);
        } else {
            $stmt = $this->conn->prepare("UPDATE courses SET title = ?, description = ?, access_type = ? WHERE id_course = ?");
            $stmt->bind_param('sssi', $title, $description, $accessType, $id);
        }
        $ok = $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => $ok]);
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("UPDATE courses SET is_active = 0 WHERE id_course = ?");
        $stmt->bind_param('i', $id);
        $ok = $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => $ok]);
    }

    public function getUserProgress($userId, $courseId)
    {
        $stmt = $this->conn->prepare("SELECT COUNT(l.id_lesson) AS total FROM lessons l JOIN modules m ON l.id_module = m.id_module WHERE m.id_course = ?");
        $stmt->bind_param('i', $courseId);
        $stmt->execute();
        $total = intval($stmt->get_result()->fetch_assoc()['total'] ?? 0);
        $stmt->close();
        if ($total === 0) {
            return 0;
        }

        $stmt = $this->conn->prepare("SELECT COUNT(lp.id_lesson) AS completed FROM lesson_progress lp JOIN lessons l ON lp.id_lesson = l.id_lesson JOIN modules m ON l.id_module = m.id_module WHERE lp.id_user = ? AND m.id_course = ?");
        $stmt->bind_param('ii', $userId, $courseId);
        $stmt->execute();
        $completed = intval($stmt->get_result()->fetch_assoc()['completed'] ?? 0);
        $stmt->close();
        return round(($completed / $total) * 100);
    }
}
