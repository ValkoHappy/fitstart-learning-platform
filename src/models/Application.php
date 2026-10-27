<?php
class Application
{
    private $conn;

    public function __construct($connection)
    {
        $this->conn = $connection;
    }

    public function create()
    {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Нужна авторизация']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $userId = intval($_SESSION['user_id']);
        $courseId = intval($data['id_course'] ?? 0);
        if (!$courseId) {
            echo json_encode(['success' => false, 'message' => 'Курс не указан']);
            return;
        }

        $check = $this->conn->prepare("SELECT id_application FROM applications WHERE id_user = ? AND id_course = ? AND id_status IN (1,2,3) LIMIT 1");
        $check->bind_param('ii', $userId, $courseId);
        $check->execute();
        if ($check->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'Заявка или доступ к этому курсу уже есть']);
            $check->close();
            return;
        }
        $check->close();

        $fullName = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $comment = trim($data['comment'] ?? '');
        $statusId = 1;

        if ($fullName === '') {
            echo json_encode(['success' => false, 'message' => 'ФИО обязательно']);
            return;
        }

        if (!preg_match('/^[А-Яа-яЁё]+(?:[ -][А-Яа-яЁё]+)*$/u', $fullName)) {
            echo json_encode(['success' => false, 'message' => 'ФИО должно быть только на русском языке']);
            return;
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Введите корректный email']);
            return;
        }

        $phoneError = Validation::validateOptionalRussianPhone($phone);
        if ($phoneError !== null) {
            echo json_encode(['success' => false, 'message' => $phoneError]);
            return;
        }
        $phone = Validation::normalizeRussianPhone($phone);

        $stmt = $this->conn->prepare("INSERT INTO applications (id_user, id_course, id_status, full_name, email, phone, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->bind_param('iiissss', $userId, $courseId, $statusId, $fullName, $email, $phone, $comment);
        $ok = $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        echo json_encode(['success' => $ok, 'application_id' => $id, 'message' => $ok ? 'Заявка отправлена' : 'Не удалось создать заявку']);
    }

    public function getUserApplications()
    {
        if (empty($_SESSION['user_id'])) {
            echo json_encode([]);
            return;
        }
        $userId = intval($_SESSION['user_id']);
        $stmt = $this->conn->prepare("SELECT a.*, c.title AS course_title, s.status_name, s.status_color
            FROM applications a
            LEFT JOIN courses c ON a.id_course = c.id_course
            LEFT JOIN application_statuses s ON a.id_status = s.id_status
            WHERE a.id_user = ?
            ORDER BY a.created_at DESC");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        echo json_encode($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
        $stmt->close();
    }

    public function getAllApplications()
    {
        if (!$this->canViewAnyApplications()) {
            echo json_encode(['success' => false, 'items' => [], 'total' => 0, 'message' => 'Доступ запрещен']);
            return;
        }

        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        $statusFilter = isset($_GET['status']) && $_GET['status'] !== '' ? intval($_GET['status']) : null;

        [$visibilityJoin, $visibilityWhere, $visibilityTypes, $visibilityParams] = $this->applicationVisibilitySql();
        $conditions = $visibilityWhere ? [$visibilityWhere] : [];
        $types = $visibilityTypes;
        $params = $visibilityParams;
        if ($statusFilter) {
            $conditions[] = 'a.id_status = ?';
            $types .= 'i';
            $params[] = $statusFilter;
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $countSql = "SELECT COUNT(*) AS total FROM applications a {$visibilityJoin} {$where}";
        $countStmt = $this->conn->prepare($countSql);
        if ($types) {
            $this->bindParams($countStmt, $types, $params);
        }
        $countStmt->execute();
        $total = intval($countStmt->get_result()->fetch_assoc()['total'] ?? 0);
        $countStmt->close();

        [$sortField, $sortOrder] = $this->safeSort($_GET['sort'] ?? 'created_at', $_GET['order'] ?? 'DESC');
        $sql = "SELECT a.*, u.login AS user_login, c.title AS course_title, s.status_name, s.status_color
                FROM applications a
                {$visibilityJoin}
                LEFT JOIN users u ON a.id_user = u.id_user
                LEFT JOIN courses c ON a.id_course = c.id_course
                LEFT JOIN application_statuses s ON a.id_status = s.id_status
                {$where}
                ORDER BY {$sortField} {$sortOrder}
                LIMIT ? OFFSET ?";
        $stmt = $this->conn->prepare($sql);
        $this->bindParams($stmt, $types . 'ii', array_merge($params, [$limit, $offset]));
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode(['success' => true, 'items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit, 'pages' => ceil($total / $limit)]);
    }

    public function updateStatus()
    {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Нужна авторизация']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $applicationId = intval($data['id_application'] ?? 0);
        $statusId = intval($data['id_status'] ?? 0);
        if (!$applicationId || !$statusId) {
            echo json_encode(['success' => false, 'message' => 'Некорректные данные']);
            return;
        }

        $userId = intval($_SESSION['user_id']);
        if (!$this->canManageApplications($userId, $applicationId)) {
            echo json_encode(['success' => false, 'message' => 'Доступ запрещен']);
            return;
        }

        $stmt = $this->conn->prepare("UPDATE applications SET id_status = ?, updated_at = NOW() WHERE id_application = ?");
        $stmt->bind_param('ii', $statusId, $applicationId);
        $ok = $stmt->execute();
        $stmt->close();

        if ($ok && $statusId === 3) {
            $this->grantEnrollmentFromApplication($applicationId, $userId);
        } elseif ($ok && $statusId === 4) {
            $this->revokeEnrollmentFromApplication($applicationId);
        }

        echo json_encode(['success' => $ok, 'message' => $ok ? 'Статус обновлен' : 'Не удалось обновить статус']);
    }

    public function delete()
    {
        if (empty($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Нужна авторизация']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $applicationId = intval($data['id_application'] ?? 0);
        if (!$applicationId) {
            echo json_encode(['success' => false, 'message' => 'Заявка не указана']);
            return;
        }

        $userId = intval($_SESSION['user_id']);
        if (!$this->canManageApplications($userId, $applicationId)) {
            echo json_encode(['success' => false, 'message' => 'Доступ запрещен']);
            return;
        }

        $this->conn->begin_transaction();
        try {
            $this->revokeEnrollmentFromApplication($applicationId);

            $stmt = $this->conn->prepare("DELETE FROM applications WHERE id_application = ?");
            $stmt->bind_param('i', $applicationId);
            $ok = $stmt->execute();
            $stmt->close();

            $this->conn->commit();
            echo json_encode(['success' => $ok, 'message' => $ok ? 'Заявка удалена' : 'Не удалось удалить заявку']);
        } catch (Throwable $e) {
            $this->conn->rollback();
            error_log("Delete application error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось удалить заявку']);
        }
    }

    public function search()
    {
        if (!$this->canViewAnyApplications()) {
            echo json_encode(['success' => false, 'items' => [], 'total' => 0]);
            return;
        }

        $value = '%' . trim($_GET['value'] ?? '') . '%';
        $limit = min(50, max(1, intval($_GET['limit'] ?? 10)));
        $page = max(1, intval($_GET['page'] ?? 1));
        $offset = ($page - 1) * $limit;
        $statusFilter = isset($_GET['status']) && $_GET['status'] !== '' ? intval($_GET['status']) : null;
        [$visibilityJoin, $visibilityWhere, $visibilityTypes, $visibilityParams] = $this->applicationVisibilitySql();
        [$sortField, $sortOrder] = $this->safeSort($_GET['sort'] ?? 'created_at', $_GET['order'] ?? 'DESC');

        $conditions = $visibilityWhere ? [$visibilityWhere] : [];
        $types = $visibilityTypes . 'ssss';
        $params = array_merge($visibilityParams, [$value, $value, $value, $value]);
        $conditions[] = '(u.login LIKE ? OR a.email LIKE ? OR a.phone LIKE ? OR a.full_name LIKE ?)';
        if ($statusFilter) {
            $conditions[] = 'a.id_status = ?';
            $types .= 'i';
            $params[] = $statusFilter;
        }
        $where = 'WHERE ' . implode(' AND ', $conditions);

        $countSql = "SELECT COUNT(*) AS total
                FROM applications a
                {$visibilityJoin}
                LEFT JOIN users u ON a.id_user = u.id_user
                {$where}";
        $countStmt = $this->conn->prepare($countSql);
        $this->bindParams($countStmt, $types, $params);
        $countStmt->execute();
        $total = intval($countStmt->get_result()->fetch_assoc()['total'] ?? 0);
        $countStmt->close();

        $sql = "SELECT a.*, u.login AS user_login, c.title AS course_title, s.status_name, s.status_color
                FROM applications a
                {$visibilityJoin}
                LEFT JOIN users u ON a.id_user = u.id_user
                LEFT JOIN courses c ON a.id_course = c.id_course
                LEFT JOIN application_statuses s ON a.id_status = s.id_status
                {$where}
                ORDER BY {$sortField} {$sortOrder}
                LIMIT ? OFFSET ?";
        $stmt = $this->conn->prepare($sql);
        $this->bindParams($stmt, $types . 'ii', array_merge($params, [$limit, $offset]));
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode(['success' => true, 'items' => $items, 'total' => $total, 'page' => $page, 'limit' => $limit, 'pages' => ceil($total / $limit)]);
    }

    private function canViewAnyApplications()
    {
        $role = $_SESSION['user_role'] ?? 'guest';
        return in_array($role, ['admin', 'curator'], true);
    }

    private function applicationVisibilitySql()
    {
        if (($_SESSION['user_role'] ?? '') === 'admin') {
            return ['', '', '', []];
        }
        $userId = intval($_SESSION['user_id'] ?? 0);
        return [
            'JOIN course_staff_permissions csp ON csp.id_course = a.id_course',
            'csp.id_user = ? AND csp.can_manage_applications = 1',
            'i',
            [$userId],
        ];
    }

    private function safeSort($field, $order)
    {
        $fields = [
            'created_at' => 'a.created_at',
            'id_status' => 'a.id_status',
            'course_title' => 'c.title',
        ];
        $sortField = $fields[$field] ?? 'a.created_at';
        $sortOrder = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';
        return [$sortField, $sortOrder];
    }

    private function bindParams($stmt, $types, $params)
    {
        if (!$types) {
            return;
        }
        $refs = [];
        foreach ($params as $key => $value) {
            $refs[$key] = &$params[$key];
        }
        $stmt->bind_param($types, ...$refs);
    }

    private function canManageApplications($userId, $applicationId)
    {
        if (($_SESSION['user_role'] ?? '') === 'admin') {
            return true;
        }
        $sql = "SELECT csp.can_manage_applications
                FROM applications a
                JOIN course_staff_permissions csp ON csp.id_course = a.id_course
                WHERE a.id_application = ? AND csp.id_user = ?
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('ii', $applicationId, $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return !empty($row['can_manage_applications']);
    }

    private function grantEnrollmentFromApplication($applicationId, $grantedBy)
    {
        $stmt = $this->conn->prepare("SELECT id_user, id_course FROM applications WHERE id_application = ?");
        $stmt->bind_param('i', $applicationId);
        $stmt->execute();
        $application = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$application) {
            return;
        }

        $sql = "INSERT INTO course_enrollments (id_user, id_course, source, status, granted_by, granted_at)
                VALUES (?, ?, 'application', 'active', ?, NOW())
                ON DUPLICATE KEY UPDATE status = 'active', granted_by = VALUES(granted_by), granted_at = NOW()";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('iii', $application['id_user'], $application['id_course'], $grantedBy);
        if (!$stmt->execute()) throw new RuntimeException($stmt->error);
        $stmt->close();
    }

    private function revokeEnrollmentFromApplication($applicationId)
    {
        $stmt = $this->conn->prepare("SELECT id_user, id_course FROM applications WHERE id_application = ?");
        $stmt->bind_param('i', $applicationId);
        $stmt->execute();
        $application = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$application) {
            return;
        }

        $stmt = $this->conn->prepare("UPDATE course_enrollments SET status = 'revoked' WHERE id_user = ? AND id_course = ? AND source = 'application'");
        $stmt->bind_param('ii', $application['id_user'], $application['id_course']);
        $stmt->execute();
        $stmt->close();
    }
}
