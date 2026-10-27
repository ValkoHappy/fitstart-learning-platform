<?php
class User
{
    private $conn;
    private const RESET_CODE_TTL_SECONDS = 900;

    public function __construct($connection)
    {
        $this->conn = $connection;
    }

    public function register()
    {
        try {

            $input = json_decode(file_get_contents('php://input'), true);

            $login = trim($input['login'] ?? '');
            $password = $input['password'] ?? '';
            $firstName = trim($input['first_name'] ?? '');
            $lastName = trim($input['last_name'] ?? '');
            $email = trim($input['email'] ?? '');
            $phone = trim($input['phone'] ?? '');

            if (empty($login) || empty($password)) {
                echo json_encode(['success' => false, 'message' => 'Логин и пароль обязательны']);
                return;
            }

            if (empty($firstName) || empty($lastName)) {
                echo json_encode(['success' => false, 'message' => 'Имя и фамилия обязательны']);
                return;
            }

            if (empty($email)) {
                echo json_encode(['success' => false, 'message' => 'Email обязателен']);
                return;
            }

            $passwordError = Validation::validatePassword((string) $password);
            if ($passwordError !== null) {
                echo json_encode(['success' => false, 'message' => $passwordError]);
                return;
            }

            if (!preg_match('/^[A-Za-z0-9._-]{3,50}$/', $login)) {
                echo json_encode(['success' => false, 'message' => 'Логин должен быть от 3 до 50 символов и содержать только латиницу, цифры, точку, подчеркивание или дефис']);
                return;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'Введите корректный email']);
                return;
            }

            if (!preg_match('/^[А-Яа-яЁё]+(?:[ -][А-Яа-яЁё]+)*$/u', $firstName) || !preg_match('/^[А-Яа-яЁё]+(?:[ -][А-Яа-яЁё]+)*$/u', $lastName)) {
                echo json_encode(['success' => false, 'message' => 'Имя и фамилия должны быть только на русском языке']);
                return;
            }

            $phoneError = Validation::validateOptionalRussianPhone($phone);
            if ($phoneError !== null) {
                echo json_encode(['success' => false, 'message' => $phoneError]);
                return;
            }
            $phone = Validation::normalizeRussianPhone($phone);

            $checkStmt = $this->conn->prepare("SELECT login, email FROM users WHERE login = ? OR email = ? LIMIT 1");
            $checkStmt->bind_param("ss", $login, $email);
            $checkStmt->execute();
            $result = $checkStmt->get_result();

            if ($existingUser = $result->fetch_assoc()) {
                $message = strcasecmp((string) $existingUser['email'], $email) === 0
                    ? 'Пользователь с такой почтой уже существует'
                    : 'Пользователь с таким логином уже существует';

                echo json_encode(['success' => false, 'message' => $message]);
                $checkStmt->close();
                return;
            }
            $checkStmt->close();

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            $insertStmt = $this->conn->prepare("INSERT INTO users (login, password, first_name, last_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
            $insertStmt->bind_param("ssssss", $login, $hashedPassword, $firstName, $lastName, $email, $phone);

            if ($insertStmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'authenticated' => false,
                    'message' => 'Регистрация завершена. Теперь войдите в аккаунт.'
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Ошибка при создании пользователя']);
            }

            $insertStmt->close();

        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось выполнить операцию']);
        }
    }

    public function login()
    {
        try {

            $input = json_decode(file_get_contents('php://input'), true);

            $login = trim($input['login'] ?? '');
            $password = $input['password'] ?? '';

            if (empty($login) || empty($password)) {
                echo json_encode(['success' => false, 'message' => 'Логин и пароль обязательны']);
                return;
            }


            $stmt = $this->conn->prepare(
                "SELECT id_user, login, password, role, first_name, last_name, email, phone
                 FROM users
                 WHERE login = ? OR email = ?
                 ORDER BY CASE WHEN login = ? THEN 0 ELSE 1 END, id_user DESC
                 LIMIT 1"
            );
            $stmt->bind_param("sss", $login, $login, $login);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                echo json_encode(['success' => false, 'message' => 'Неверный логин или пароль']);
                $stmt->close();
                return;
            }

            $user = $result->fetch_assoc();

            if (password_verify($password, $user['password'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id_user'];
                $_SESSION['user_login'] = $user['login'];
                $role = $user['role'] === 'user' ? 'student' : $user['role'];
                $_SESSION['user_role'] = $role;

                echo json_encode([
                    'success' => true,
                    'authenticated' => true,
                    'user' => [
                        'id' => $user['id_user'],
                        'login' => $user['login'],
                        'role' => $role,
                        'first_name' => $user['first_name'],
                        'last_name' => $user['last_name'],
                        'email' => $user['email'],
                        'phone' => $user['phone']
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Неверный логин или пароль']);
            }

            $stmt->close();

        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Внутренняя ошибка сервера']);
        }
    }

    public function getRole()
    {
        try {
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(['role' => 'guest']);
                return;
            }

            $userId = intval($_SESSION['user_id']);
            $sql = "SELECT role FROM users WHERE id_user = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();
                echo json_encode(['role' => $user['role'] === 'user' ? 'student' : $user['role']]);
            } else {
                echo json_encode(['role' => 'guest']);
            }

            $stmt->close();
        } catch (Exception $e) {
            error_log("Get user role error: " . $e->getMessage());
            echo json_encode(['role' => 'guest']);
        }
    }

    public function requestPasswordReset()
    {
        try {
            $this->ensurePasswordResetTable();
            $input = json_decode(file_get_contents('php://input'), true);
            $email = trim($input['email'] ?? '');

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'Введите корректный email']);
                return;
            }

            $stmt = $this->conn->prepare("SELECT id_user, first_name, email FROM users WHERE email = ? ORDER BY id_user DESC LIMIT 1");
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->num_rows > 0 ? $result->fetch_assoc() : null;
            $stmt->close();

            $response = [
                'success' => true,
                'message' => 'Если аккаунт с таким email найден, код восстановления отправлен на почту.',
            ];

            if (!$user) {
                echo json_encode($response);
                return;
            }

            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $tokenHash = $this->createResetCodeHash((int) $user['id_user'], $code);
            $expiresAt = date('Y-m-d H:i:s', time() + self::RESET_CODE_TTL_SECONDS);
            $requestedIp = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

            $invalidateStmt = $this->conn->prepare("DELETE FROM password_reset_tokens WHERE id_user = ?");
            $invalidateStmt->bind_param('i', $user['id_user']);
            $invalidateStmt->execute();
            $invalidateStmt->close();

            $insertStmt = $this->conn->prepare(
                "INSERT INTO password_reset_tokens (id_user, token_hash, expires_at, requested_ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, NOW())"
            );
            $insertStmt->bind_param('issss', $user['id_user'], $tokenHash, $expiresAt, $requestedIp, $userAgent);
            $insertStmt->execute();
            $insertStmt->close();

            $message = $this->buildResetEmailText($user['first_name'] ?: 'пользователь', $code);
            $mailSent = Mailer::sendPlainText($user['email'], 'Код восстановления пароля — ФитСтарт', $message);

            if (!$mailSent) {
                $deleteFailedTokenStmt = $this->conn->prepare("DELETE FROM password_reset_tokens WHERE id_user = ? AND token_hash = ?");
                $deleteFailedTokenStmt->bind_param('is', $user['id_user'], $tokenHash);
                $deleteFailedTokenStmt->execute();
                $deleteFailedTokenStmt->close();

                $mailError = Mailer::getLastError();
                error_log('Password reset code mail failed for ' . $user['email'] . ($mailError ? ': ' . $mailError : ''));
                echo json_encode([
                    'success' => false,
                    'message' => 'Не удалось отправить код восстановления. Проверьте настройки почты на сервере.',
                ]);
                return;
            }

            echo json_encode($response);
        } catch (Exception $e) {
            error_log("Password reset request error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось отправить код восстановления']);
        }
    }

    public function validatePasswordResetToken()
    {
        try {
            $this->ensurePasswordResetTable();
            $input = json_decode(file_get_contents('php://input'), true) ?: [];
            $email = trim($input['email'] ?? $_GET['email'] ?? '');
            $code = trim($input['code'] ?? $_GET['code'] ?? '');

            if ($email === '' || $code === '') {
                echo json_encode(['success' => false, 'message' => 'Email и код восстановления обязательны']);
                return;
            }

            $tokenRow = $this->findValidResetCodeRow($email, $code);
            if (!$tokenRow) {
                echo json_encode(['success' => false, 'message' => 'Код восстановления недействителен или устарел']);
                return;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Код восстановления активен',
                'expires_at' => $tokenRow['expires_at'],
            ]);
        } catch (Exception $e) {
            error_log("Password reset code validate error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось проверить код восстановления']);
        }
    }

    public function resetPassword()
    {
        try {
            $this->ensurePasswordResetTable();
            $input = json_decode(file_get_contents('php://input'), true);
            $email = trim($input['email'] ?? '');
            $code = trim($input['code'] ?? '');
            $password = (string) ($input['password'] ?? '');

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'Введите корректный email']);
                return;
            }

            if ($code === '') {
                echo json_encode(['success' => false, 'message' => 'Код восстановления обязателен']);
                return;
            }

            $passwordError = Validation::validatePassword($password);
            if ($passwordError !== null) {
                echo json_encode(['success' => false, 'message' => $passwordError]);
                return;
            }

            $tokenRow = $this->findValidResetCodeRow($email, $code);
            if (!$tokenRow) {
                echo json_encode(['success' => false, 'message' => 'Код восстановления недействителен или устарел']);
                return;
            }

            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            $updateUserStmt = $this->conn->prepare("UPDATE users SET password = ? WHERE id_user = ?");
            $updateUserStmt->bind_param('si', $passwordHash, $tokenRow['id_user']);
            $updateUserStmt->execute();
            $updateUserStmt->close();

            $closeTokensStmt = $this->conn->prepare("UPDATE password_reset_tokens SET used_at = NOW() WHERE id_user = ? AND used_at IS NULL");
            $closeTokensStmt->bind_param('i', $tokenRow['id_user']);
            $closeTokensStmt->execute();
            $closeTokensStmt->close();

            echo json_encode(['success' => true, 'message' => 'Пароль успешно обновлён']);
        } catch (Exception $e) {
            error_log("Password reset error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Не удалось обновить пароль']);
        }
    }

    private function ensurePasswordResetTable(): void
    {
        $sql = "CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id_token INT AUTO_INCREMENT PRIMARY KEY,
            id_user INT NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            requested_ip VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_password_reset_token_hash (token_hash),
            KEY idx_password_reset_user (id_user),
            KEY idx_password_reset_expires (expires_at),
            CONSTRAINT fk_password_reset_user FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        $this->conn->query($sql);
    }

    private function createResetCodeHash(int $userId, string $code): string
    {
        return hash('sha256', $userId . ':' . $code);
    }

    private function findValidResetCodeRow(string $email, string $code): ?array
    {
        $normalizedCode = preg_replace('/\D/', '', $code);

        if ($normalizedCode === null || !preg_match('/^\d{6}$/', $normalizedCode)) {
            return null;
        }

        $userStmt = $this->conn->prepare("SELECT id_user FROM users WHERE email = ? ORDER BY id_user DESC LIMIT 1");
        $userStmt->bind_param('s', $email);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $user = $userResult->num_rows > 0 ? $userResult->fetch_assoc() : null;
        $userStmt->close();

        if (!$user) {
            return null;
        }

        $userId = (int) $user['id_user'];
        $tokenHash = $this->createResetCodeHash($userId, $normalizedCode);
        $stmt = $this->conn->prepare(
            "SELECT id_token, id_user, expires_at
             FROM password_reset_tokens
             WHERE id_user = ?
               AND token_hash = ?
               AND used_at IS NULL
               AND expires_at >= NOW()
             ORDER BY id_token DESC
             LIMIT 1"
        );
        $stmt->bind_param('is', $userId, $tokenHash);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->num_rows > 0 ? $result->fetch_assoc() : null;
        $stmt->close();

        return $row ?: null;
    }

    private function buildResetEmailText(string $firstName, string $code): string
    {
        return "Здравствуйте, {$firstName}!\n\n"
            . "Мы получили запрос на восстановление пароля в ФитСтарт.\n\n"
            . "Введите этот код на странице восстановления пароля: {$code}\n\n"
            . "Код действует 15 минут и работает только один раз.\n"
            . "Если это были не вы, просто проигнорируйте это письмо.";
    }
}
