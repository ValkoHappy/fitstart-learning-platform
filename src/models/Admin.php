<?php
class Admin
{
    private $conn;

    public function __construct($connection)
    {
        $this->conn = $connection;
    }

    private function currentUserId()
    {
        return isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
    }

    private function isAdmin()
    {
        return ($_SESSION['user_role'] ?? '') === 'admin';
    }

    private function canEditLesson($lessonId)
    {
        if ($this->isAdmin()) {
            return true;
        }
        if (($_SESSION['user_role'] ?? '') !== 'curator' || !$this->currentUserId()) {
            return false;
        }
        $sql = "SELECT csp.can_edit_content
            FROM lessons l
            JOIN modules m ON l.id_module = m.id_module
            JOIN course_staff_permissions csp ON csp.id_course = m.id_course
            WHERE l.id_lesson = ? AND csp.id_user = ?
            LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $userId = $this->currentUserId();
        $stmt->bind_param('ii', $lessonId, $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return !empty($row['can_edit_content']);
    }

    private function curatorCourseFilter($permissionColumn)
    {
        if ($this->isAdmin()) {
            return ['', '', []];
        }
        if (($_SESSION['user_role'] ?? '') !== 'curator' || !$this->currentUserId()) {
            return [' AND 1 = 0', '', []];
        }
        return [
            " AND EXISTS (
                SELECT 1
                FROM course_staff_permissions csp
                WHERE csp.id_course = c.id_course
                    AND csp.id_user = ?
                    AND csp.{$permissionColumn} = 1
            )",
            'i',
            [$this->currentUserId()]
        ];
    }

    public function getUsers()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied', 'items' => []]);
            return;
        }
        $sql = "SELECT id_user, login, first_name, last_name, email, phone, role, created_at
            FROM users
            ORDER BY created_at DESC, id_user DESC";
        $items = $this->conn->query($sql)->fetch_all(MYSQLI_ASSOC);
        foreach ($items as &$item) {
            if ($item['role'] === 'user') {
                $item['role'] = 'student';
            }
        }
        echo json_encode(['success' => true, 'items' => $items]);
    }

    public function updateUserRole()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $userId = intval($data['id_user'] ?? 0);
        $role = $data['role'] ?? 'student';
        if (!$userId || !in_array($role, ['student', 'curator', 'admin'], true)) {
            echo json_encode(['success' => false, 'message' => 'Invalid user role']);
            return;
        }
        $stmt = $this->conn->prepare("UPDATE users SET role = ? WHERE id_user = ?");
        $stmt->bind_param('si', $role, $userId);
        $ok = $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => $ok, 'message' => $ok ? 'Role updated' : 'Failed to update role']);
    }

    public function deleteUser()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $userId = intval($data['id_user'] ?? 0);
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'Пользователь не указан']);
            return;
        }

        if ($userId === $this->currentUserId()) {
            echo json_encode(['success' => false, 'message' => 'Нельзя удалить текущий аккаунт администратора']);
            return;
        }

        $stmt = $this->conn->prepare("SELECT id_user FROM users WHERE id_user = ? LIMIT 1");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'Пользователь не найден']);
            return;
        }

        $this->conn->begin_transaction();
        try {
            if ($this->tableExists('submission_files')) {
                $stmt = $this->conn->prepare(
                    "DELETE sf FROM submission_files sf
                     JOIN assignment_submissions s ON s.id_submission = sf.id_submission
                     WHERE s.id_user = ?"
                );
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->close();
            }

            if ($this->tableExists('assignment_submissions')) {
                $stmt = $this->conn->prepare("UPDATE assignment_submissions SET reviewer_id = NULL WHERE reviewer_id = ?");
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->close();

                $stmt = $this->conn->prepare("DELETE FROM assignment_submissions WHERE id_user = ?");
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->close();
            }

            foreach (['quiz_attempts', 'lesson_progress', 'course_staff_permissions', 'applications', 'password_reset_tokens'] as $table) {
                if (!$this->tableExists($table)) {
                    continue;
                }

                $stmt = $this->conn->prepare("DELETE FROM {$table} WHERE id_user = ?");
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->close();
            }

            if ($this->tableExists('course_enrollments')) {
                $stmt = $this->conn->prepare("DELETE FROM course_enrollments WHERE id_user = ? OR granted_by = ?");
                $stmt->bind_param('ii', $userId, $userId);
                $stmt->execute();
                $stmt->close();
            }

            if ($this->tableExists('orders')) {
                $stmt = $this->conn->prepare("DELETE FROM orders WHERE id_user = ?");
                $stmt->bind_param('i', $userId);
                $stmt->execute();
                $stmt->close();
            }

            $stmt = $this->conn->prepare("DELETE FROM users WHERE id_user = ?");
            $stmt->bind_param('i', $userId);
            $ok = $stmt->execute();
            $stmt->close();

            $this->conn->commit();
            echo json_encode(['success' => $ok, 'message' => $ok ? 'Пользователь удалён' : 'Не удалось удалить пользователя']);
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log("Delete user error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось удалить пользователя']);
        }
    }

    public function getStaffPermissions()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied', 'items' => []]);
            return;
        }
        $courseId = intval($_GET['course_id'] ?? 0);
        $where = $courseId ? 'WHERE csp.id_course = ?' : '';
        $sql = "SELECT csp.*, u.login, u.first_name, u.last_name, c.title AS course_title
            FROM course_staff_permissions csp
            JOIN users u ON csp.id_user = u.id_user
            JOIN courses c ON csp.id_course = c.id_course
            {$where}
            ORDER BY c.title, u.login";
        $stmt = $this->conn->prepare($sql);
        if ($courseId) {
            $stmt->bind_param('i', $courseId);
        }
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        echo json_encode(['success' => true, 'items' => $items]);
    }

    public function getProgressOverview()
    {
        if (!$this->isAdmin() && ($_SESSION['user_role'] ?? '') !== 'curator') {
            echo json_encode(['success' => false, 'message' => 'Access denied', 'items' => []]);
            return;
        }

        [$courseFilter, $types, $params] = $this->curatorCourseFilter('can_view_progress');
        $sql = "SELECT
                ce.id_enrollment,
                ce.status AS enrollment_status,
                ce.granted_at,
                u.id_user,
                u.login,
                u.first_name,
                u.last_name,
                u.email,
                c.id_course,
                c.title AS course_title,
                COUNT(DISTINCT l.id_lesson) AS total_lessons,
                COUNT(DISTINCT lp.id_lesson) AS completed_lessons,
                MAX(lp.completed_at) AS last_activity
            FROM course_enrollments ce
            JOIN users u ON u.id_user = ce.id_user
            JOIN courses c ON c.id_course = ce.id_course
            LEFT JOIN modules m ON m.id_course = c.id_course
            LEFT JOIN lessons l ON l.id_module = m.id_module
            LEFT JOIN lesson_progress lp ON lp.id_user = u.id_user
                AND lp.id_lesson = l.id_lesson
                AND lp.id_progress IS NOT NULL
            WHERE ce.status = 'active' AND c.is_active = 1 {$courseFilter}
            GROUP BY ce.id_enrollment, u.id_user, c.id_course
            ORDER BY last_activity DESC, ce.granted_at DESC";

        $stmt = $this->conn->prepare($sql);
        if ($types) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        foreach ($items as &$item) {
            $total = max(0, intval($item['total_lessons']));
            $done = max(0, intval($item['completed_lessons']));
            $item['progress_percent'] = $total > 0 ? (int) round(($done / $total) * 100) : 0;
        }

        echo json_encode(['success' => true, 'items' => $items]);
    }

    public function saveStaffPermissions()
    {
        if (!$this->isAdmin()) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $userId = intval($data['id_user'] ?? 0);
        $courseId = intval($data['id_course'] ?? 0);
        if (!$userId || !$courseId) {
            echo json_encode(['success' => false, 'message' => 'User and course required']);
            return;
        }
        $canApplications = !empty($data['can_manage_applications']) ? 1 : 0;
        $canReview = !empty($data['can_review_submissions']) ? 1 : 0;
        $canEdit = !empty($data['can_edit_content']) ? 1 : 0;
        $canProgress = !empty($data['can_view_progress']) ? 1 : 0;

        $role = 'curator';
        $stmt = $this->conn->prepare("UPDATE users SET role = ? WHERE id_user = ? AND role <> 'admin'");
        $stmt->bind_param('si', $role, $userId);
        $stmt->execute();
        $stmt->close();

        $sql = "INSERT INTO course_staff_permissions
            (id_user, id_course, can_manage_applications, can_review_submissions, can_edit_content, can_view_progress)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                can_manage_applications = VALUES(can_manage_applications),
                can_review_submissions = VALUES(can_review_submissions),
                can_edit_content = VALUES(can_edit_content),
                can_view_progress = VALUES(can_view_progress)";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('iiiiii', $userId, $courseId, $canApplications, $canReview, $canEdit, $canProgress);
        $ok = $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => $ok, 'message' => $ok ? 'Permissions saved' : 'Failed to save permissions']);
    }

    public function getQuizQuestions()
    {
        $lessonId = intval($_GET['lesson_id'] ?? 0);
        if (!$lessonId || !$this->canEditLesson($lessonId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied', 'items' => []]);
            return;
        }
        echo json_encode(['success' => true, 'items' => $this->loadQuizQuestions($lessonId)]);
    }

    public function saveQuizQuestions()
    {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonId = intval($data['lesson_id'] ?? 0);
        $questions = is_array($data['questions'] ?? null) ? $data['questions'] : [];
        if (!$lessonId || !$this->canEditLesson($lessonId)) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }

        $this->conn->begin_transaction();
        try {
            $stmt = $this->conn->prepare("DELETE FROM quiz_questions WHERE id_lesson = ?");
            $stmt->bind_param('i', $lessonId);
            $stmt->execute();
            $stmt->close();

            foreach ($questions as $questionIndex => $question) {
                $text = trim($question['question'] ?? '');
                if ($text === '') {
                    continue;
                }
                $stmt = $this->conn->prepare("INSERT INTO quiz_questions (id_lesson, question, order_index) VALUES (?, ?, ?)");
                $stmt->bind_param('isi', $lessonId, $text, $questionIndex);
                $stmt->execute();
                $questionId = $stmt->insert_id;
                $stmt->close();

                $options = is_array($question['options'] ?? null) ? $question['options'] : [];
                foreach ($options as $optionIndex => $option) {
                    $optionText = trim($option['option_text'] ?? $option['text'] ?? '');
                    if ($optionText === '') {
                        continue;
                    }
                    $isCorrect = !empty($option['is_correct']) || !empty($option['correct']) ? 1 : 0;
                    $stmt = $this->conn->prepare("INSERT INTO quiz_options (id_question, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param('isii', $questionId, $optionText, $isCorrect, $optionIndex);
                    $stmt->execute();
                    $stmt->close();
                }
            }

            $content = json_encode($this->loadQuizQuestions($lessonId), JSON_UNESCAPED_UNICODE);
            $stmt = $this->conn->prepare("UPDATE lessons SET content = ?, completion_policy = 'quiz' WHERE id_lesson = ?");
            $stmt->bind_param('si', $content, $lessonId);
            $stmt->execute();
            $stmt->close();

            $this->conn->commit();
            echo json_encode(['success' => true, 'items' => $this->loadQuizQuestions($lessonId)]);
        } catch (Exception $e) {
            $this->conn->rollback();
            echo json_encode(['success' => false, 'message' => 'Failed to save quiz questions']);
        }
    }

    private function loadQuizQuestions($lessonId)
    {
        $stmt = $this->conn->prepare("SELECT id_question, question, order_index FROM quiz_questions WHERE id_lesson = ? ORDER BY order_index, id_question");
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $questions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        foreach ($questions as &$question) {
            $stmt = $this->conn->prepare("SELECT id_option, option_text, is_correct, order_index FROM quiz_options WHERE id_question = ? ORDER BY order_index, id_option");
            $questionId = intval($question['id_question']);
            $stmt->bind_param('i', $questionId);
            $stmt->execute();
            $question['options'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }

        return $questions;
    }

    private function tableExists($tableName)
    {
        $stmt = $this->conn->prepare("SHOW TABLES LIKE ?");
        $stmt->bind_param('s', $tableName);
        $stmt->execute();
        $exists = $stmt->get_result()->num_rows > 0;
        $stmt->close();
        return $exists;
    }
}
