<?php
require_once dirname(__DIR__) . '/utils/UploadStorage.php';

class Learning
{
    private $conn;
    private const MAX_SUBMISSION_FILES = 5;
    private const MAX_SUBMISSION_FILE_SIZE = 10485760;
    private const ALLOWED_SUBMISSION_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'webp', 'zip'];

    public function __construct($connection)
    {
        $this->conn = $connection;
    }

    private function currentUserId()
    {
        return isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : 0;
    }

    private function isStaffForCourse($courseId, $permission)
    {
        $userId = $this->currentUserId();
        $role = $_SESSION['user_role'] ?? 'guest';
        if ($role === 'admin') {
            return true;
        }
        if (!$userId || $role !== 'curator') {
            return false;
        }

        $allowedColumns = ['can_manage_applications', 'can_review_submissions', 'can_edit_content', 'can_view_progress'];
        if (!in_array($permission, $allowedColumns, true)) {
            return false;
        }

        $sql = "SELECT {$permission} FROM course_staff_permissions WHERE id_user = ? AND id_course = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ii', $userId, $courseId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return !empty($row[$permission]);
    }

    private function getLessonCourseId($lessonId)
    {
        $sql = "SELECT m.id_course FROM lessons l JOIN modules m ON l.id_module = m.id_module WHERE l.id_lesson = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ? intval($row['id_course']) : 0;
    }

    private function getLessonMeta($lessonId)
    {
        $sql = "SELECT l.id_lesson, l.type, l.completion_policy, l.content, l.video_ref, m.id_course, c.access_type
            FROM lessons l
            JOIN modules m ON l.id_module = m.id_module
            JOIN courses c ON m.id_course = c.id_course
            WHERE l.id_lesson = ? AND c.is_active = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $row ?: null;
    }

    private function hasCourseAccess($userId, $courseId)
    {
        $role = $_SESSION['user_role'] ?? 'guest';
        if ($role === 'admin') {
            return true;
        }

        $stmt = $this->conn->prepare("SELECT access_type FROM courses WHERE id_course = ? AND is_active = 1");
        $stmt->bind_param('i', $courseId);
        $stmt->execute();
        $course = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$course) {
            return false;
        }
        if (($course['access_type'] ?? 'application') === 'free') {
            return true;
        }

        $stmt = $this->conn->prepare("SELECT id_enrollment FROM course_enrollments WHERE id_user = ? AND id_course = ? AND status = 'active' LIMIT 1");
        $stmt->bind_param('ii', $userId, $courseId);
        $stmt->execute();
        $hasAccess = $stmt->get_result()->num_rows > 0;
        $stmt->close();
        return $hasAccess;
    }

    private function markComplete($userId, $lessonId)
    {
        $sql = "INSERT IGNORE INTO lesson_progress (id_user, id_lesson, completed_at) VALUES (?, ?, NOW())";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ii', $userId, $lessonId);
        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    }

    public function completeLesson()
    {
        $userId = $this->currentUserId();
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'Нужна авторизация']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonId = intval($data['lesson_id'] ?? 0);
        if (!$lessonId) {
            echo json_encode(['success' => false, 'message' => 'Урок не указан']);
            return;
        }

        $lesson = $this->getLessonMeta($lessonId);
        if (!$lesson || !$this->hasCourseAccess($userId, intval($lesson['id_course']))) {
            echo json_encode(['success' => false, 'message' => 'Доступ запрещён']);
            return;
        }
        if (in_array($lesson['type'], ['task', 'quiz'], true)) {
            echo json_encode(['success' => false, 'message' => 'Этот урок завершается через задание или тест']);
            return;
        }
        if (
            ($lesson['type'] ?? '') === 'video'
            && trim((string)($lesson['video_ref'] ?? '')) === ''
            && trim((string)($lesson['content'] ?? '')) === ''
        ) {
            echo json_encode(['success' => false, 'message' => 'Видео и конспект пока не добавлены. Завершение будет доступно после добавления материала.']);
            return;
        }

        echo json_encode(['success' => $this->markComplete($userId, $lessonId)]);
    }

    public function submitAssignment()
    {
        $userId = $this->currentUserId();
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'Нужна авторизация']);
            return;
        }

        $lessonId = intval($_POST['lesson_id'] ?? 0);
        $answerText = trim($_POST['answer_text'] ?? '');
        $answerLink = trim($_POST['answer_link'] ?? '');
        if (!$lessonId) {
            echo json_encode(['success' => false, 'message' => 'Урок не указан']);
            return;
        }

        $lesson = $this->getLessonMeta($lessonId);
        if (!$lesson || !$this->hasCourseAccess($userId, intval($lesson['id_course']))) {
            echo json_encode(['success' => false, 'message' => 'Доступ запрещён']);
            return;
        }
        if (($lesson['type'] ?? '') !== 'task') {
            echo json_encode(['success' => false, 'message' => 'Этот урок не принимает сдачу заданий']);
            return;
        }
        if ($answerText === '' && $answerLink === '' && empty($_FILES['files']['name'])) {
            echo json_encode(['success' => false, 'message' => 'Добавьте ответ, ссылку или файл перед отправкой']);
            return;
        }
        $fileErrors = $this->validateSubmissionFiles();
        if (!empty($fileErrors)) {
            echo json_encode(['success' => false, 'message' => implode('; ', $fileErrors)]);
            return;
        }

        $assignmentId = $this->ensureAssignment($lessonId);
        $stmt = $this->conn->prepare("INSERT INTO assignment_submissions (id_assignment, id_user, answer_text, answer_link, status, submitted_at) VALUES (?, ?, ?, ?, 'submitted', NOW())");
        $stmt->bind_param('iiss', $assignmentId, $userId, $answerText, $answerLink);
        if (!$stmt->execute()) {
            echo json_encode(['success' => false, 'message' => 'Не удалось отправить задание']);
            return;
        }

        $submissionId = $stmt->insert_id;
        $stmt->close();
        $this->storeSubmissionFiles($submissionId);

        echo json_encode(['success' => true, 'submission_id' => $submissionId, 'status' => 'submitted']);
    }

    private function validateSubmissionFiles()
    {
        if (empty($_FILES['files']) || empty($_FILES['files']['name'])) {
            return [];
        }

        $names = is_array($_FILES['files']['name']) ? $_FILES['files']['name'] : [$_FILES['files']['name']];
        $sizes = is_array($_FILES['files']['size']) ? $_FILES['files']['size'] : [$_FILES['files']['size']];
        $errors = is_array($_FILES['files']['error']) ? $_FILES['files']['error'] : [$_FILES['files']['error']];
        $realFiles = array_values(array_filter($names, fn($name) => trim((string)$name) !== ''));
        $validationErrors = [];

        if (count($realFiles) > self::MAX_SUBMISSION_FILES) {
            $validationErrors[] = 'Можно загрузить не больше ' . self::MAX_SUBMISSION_FILES . ' файлов';
        }

        foreach ($names as $index => $name) {
            if (trim((string)$name) === '') {
                continue;
            }
            if (($errors[$index] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                $validationErrors[] = 'Не удалось загрузить файл: ' . $name;
                continue;
            }
            if (intval($sizes[$index] ?? 0) > self::MAX_SUBMISSION_FILE_SIZE) {
                $validationErrors[] = 'Файл слишком большой: ' . $name;
            }
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($extension, self::ALLOWED_SUBMISSION_EXTENSIONS, true)) {
                $validationErrors[] = 'Такой тип файла нельзя загрузить: ' . $name;
            }
        }

        return $validationErrors;
    }

    private function ensureAssignment($lessonId)
    {
        $stmt = $this->conn->prepare("SELECT id_assignment FROM assignments WHERE id_lesson = ?");
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row) {
            return intval($row['id_assignment']);
        }

        $prompt = '';
        $stmt = $this->conn->prepare("INSERT INTO assignments (id_lesson, prompt, review_mode) VALUES (?, ?, 'manual')");
        $stmt->bind_param('is', $lessonId, $prompt);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
        return $id;
    }

    private function storeSubmissionFiles($submissionId)
    {
        if (empty($_FILES['files'])) {
            return;
        }

        $baseDir = UploadStorage::ensureDirectory('uploads/submissions');

        $names = is_array($_FILES['files']['name']) ? $_FILES['files']['name'] : [$_FILES['files']['name']];
        $tmpNames = is_array($_FILES['files']['tmp_name']) ? $_FILES['files']['tmp_name'] : [$_FILES['files']['tmp_name']];
        $types = is_array($_FILES['files']['type']) ? $_FILES['files']['type'] : [$_FILES['files']['type']];
        $sizes = is_array($_FILES['files']['size']) ? $_FILES['files']['size'] : [$_FILES['files']['size']];
        $errors = is_array($_FILES['files']['error']) ? $_FILES['files']['error'] : [$_FILES['files']['error']];

        foreach ($names as $index => $name) {
            if ($errors[$index] !== UPLOAD_ERR_OK) {
                continue;
            }
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($extension, self::ALLOWED_SUBMISSION_EXTENSIONS, true) || intval($sizes[$index] ?? 0) > self::MAX_SUBMISSION_FILE_SIZE) {
                continue;
            }
            $safeName = 'submission_' . $submissionId . '_' . uniqid() . ($extension ? '.' . $extension : '');
            $target = $baseDir . $safeName;
            if (!move_uploaded_file($tmpNames[$index], $target)) {
                continue;
            }
            $path = '/uploads/submissions/' . $safeName;
            $type = $types[$index] ?? null;
            $size = intval($sizes[$index] ?? 0);
            $stmt = $this->conn->prepare("INSERT INTO submission_files (id_submission, file_path, original_name, mime_type, file_size) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param('isssi', $submissionId, $path, $name, $type, $size);
            $stmt->execute();
            $stmt->close();
        }
    }

    public function reviewSubmission()
    {
        $reviewerId = $this->currentUserId();
        if (!$reviewerId) {
            echo json_encode(['success' => false, 'message' => 'Auth required']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $submissionId = intval($data['submission_id'] ?? 0);
        $status = $data['status'] ?? '';
        $comment = trim($data['comment'] ?? '');
        if (!$submissionId || !in_array($status, ['accepted', 'needs_revision'], true)) {
            echo json_encode(['success' => false, 'message' => 'Invalid review data']);
            return;
        }

        $courseSql = "SELECT l.id_lesson, m.id_course, s.id_user
            FROM assignment_submissions s
            JOIN assignments a ON s.id_assignment = a.id_assignment
            JOIN lessons l ON a.id_lesson = l.id_lesson
            JOIN modules m ON l.id_module = m.id_module
            WHERE s.id_submission = ?";
        $stmt = $this->conn->prepare($courseSql);
        $stmt->bind_param('i', $submissionId);
        $stmt->execute();
        $meta = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$meta || !$this->isStaffForCourse(intval($meta['id_course']), 'can_review_submissions')) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }

        $stmt = $this->conn->prepare("UPDATE assignment_submissions SET status = ?, reviewer_id = ?, reviewer_comment = ?, reviewed_at = NOW() WHERE id_submission = ?");
        $stmt->bind_param('sisi', $status, $reviewerId, $comment, $submissionId);
        $ok = $stmt->execute();
        $stmt->close();

        if ($ok && $status === 'accepted') {
            $this->markComplete(intval($meta['id_user']), intval($meta['id_lesson']));
        }

        echo json_encode(['success' => $ok]);
    }

    public function getReviewQueue()
    {
        $userId = $this->currentUserId();
        if (!$userId) {
            echo json_encode(['success' => false, 'items' => []]);
            return;
        }

        $role = $_SESSION['user_role'] ?? 'guest';
        if ($role === 'admin') {
            $where = '1=1';
            $joinPermissions = '';
        } else {
            $where = 'csp.id_user = ? AND csp.can_review_submissions = 1';
            $joinPermissions = 'JOIN course_staff_permissions csp ON csp.id_course = c.id_course';
        }
        $sql = "SELECT s.*, a.id_lesson, l.title AS lesson_title, c.title AS course_title, c.id_course, u.login AS student_login, u.email AS student_email
            FROM assignment_submissions s
            JOIN assignments a ON s.id_assignment = a.id_assignment
            JOIN lessons l ON a.id_lesson = l.id_lesson
            JOIN modules m ON l.id_module = m.id_module
            JOIN courses c ON m.id_course = c.id_course
            JOIN users u ON s.id_user = u.id_user
            {$joinPermissions}
            WHERE {$where} AND s.status IN ('submitted','review')
            ORDER BY s.submitted_at DESC
            LIMIT 100";
        $stmt = $this->conn->prepare($sql);
        if ($role !== 'admin') {
            $stmt->bind_param('i', $userId);
        }
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        if (!empty($items)) {
            $submissionIds = array_map('intval', array_column($items, 'id_submission'));
            $placeholders = implode(',', array_fill(0, count($submissionIds), '?'));
            $types = str_repeat('i', count($submissionIds));
            $fileStmt = $this->conn->prepare("SELECT id_submission, file_path, original_name, mime_type, file_size FROM submission_files WHERE id_submission IN ({$placeholders}) ORDER BY uploaded_at ASC");
            $params = [];
            foreach ($submissionIds as $key => $value) {
                $params[$key] = &$submissionIds[$key];
            }
            $fileStmt->bind_param($types, ...$params);
            $fileStmt->execute();
            $files = $fileStmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $fileStmt->close();

            $filesBySubmission = [];
            foreach ($files as $file) {
                $filesBySubmission[intval($file['id_submission'])][] = $file;
            }
            foreach ($items as &$item) {
                $item['files'] = $filesBySubmission[intval($item['id_submission'])] ?? [];
            }
        }

        echo json_encode(['success' => true, 'items' => $items]);
    }

    public function submitQuiz()
    {
        $userId = $this->currentUserId();
        if (!$userId) {
            echo json_encode(['success' => false, 'message' => 'Auth required']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $lessonId = intval($data['lesson_id'] ?? 0);
        $answers = $data['answers'] ?? [];
        if (!$lessonId || !is_array($answers)) {
            echo json_encode(['success' => false, 'message' => 'Invalid quiz data']);
            return;
        }

        $lessonMeta = $this->getLessonMeta($lessonId);
        if (!$lessonMeta || !$this->hasCourseAccess($userId, intval($lessonMeta['id_course']))) {
            echo json_encode(['success' => false, 'message' => 'Access denied']);
            return;
        }
        if (($lessonMeta['type'] ?? '') !== 'quiz') {
            echo json_encode(['success' => false, 'message' => 'This lesson is not a quiz']);
            return;
        }

        $stmt = $this->conn->prepare("SELECT q.id_question, o.id_option
            FROM quiz_questions q
            JOIN quiz_options o ON q.id_question = o.id_question AND o.is_correct = 1
            WHERE q.id_lesson = ?");
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $correctAnswersByQuestion = [];
        foreach ($rows as $row) {
            $questionId = (string)$row['id_question'];
            if (!isset($correctAnswersByQuestion[$questionId])) {
                $correctAnswersByQuestion[$questionId] = [];
            }
            $correctAnswersByQuestion[$questionId][] = (string)$row['id_option'];
        }

        $normalizedAnswers = [];
        foreach ($answers as $questionId => $value) {
            $questionKey = (string)$questionId;
            $answerItems = is_array($value) ? $value : [$value];
            $normalizedAnswers[$questionKey] = array_values(array_unique(array_map('strval', array_filter($answerItems, static function ($item) {
                return $item !== null && $item !== '';
            }))));
        }

        $total = count($correctAnswersByQuestion);
        $correct = 0;
        foreach ($correctAnswersByQuestion as $questionId => $correctOptions) {
            sort($correctOptions);
            $selectedOptions = $normalizedAnswers[$questionId] ?? [];
            sort($selectedOptions);
            if ($selectedOptions === $correctOptions) {
                $correct++;
            }
        }
        $score = $total ? (int)round(($correct / $total) * 100) : 0;
        $passScore = 70;
        $stmt = $this->conn->prepare("SELECT pass_score FROM lessons WHERE id_lesson = ?");
        $stmt->bind_param('i', $lessonId);
        $stmt->execute();
        $lesson = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!empty($lesson['pass_score'])) {
            $passScore = intval($lesson['pass_score']);
        }

        $passed = $score >= $passScore ? 1 : 0;
        $answersJson = json_encode($normalizedAnswers, JSON_UNESCAPED_UNICODE);
        $stmt = $this->conn->prepare("INSERT INTO quiz_attempts (id_lesson, id_user, score, passed, answers_json) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('iiiis', $lessonId, $userId, $score, $passed, $answersJson);
        $stmt->execute();
        $stmt->close();

        if ($passed) {
            $this->markComplete($userId, $lessonId);
        }

        echo json_encode([
            'success' => true,
            'score' => $score,
            'passed' => (bool)$passed,
            'pass_score' => $passScore,
            'answers' => $normalizedAnswers,
            'correct_answers' => $correctAnswersByQuestion,
        ]);
    }
}
