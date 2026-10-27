<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/User.php';
require_once dirname(__DIR__) . '/utils/Mailer.php';
require_once dirname(__DIR__) . '/utils/Validation.php';

class AuthController
{
    private $db;
    private $user;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->user = new User($this->db->getConnection());
    }

    public function handle($action)
    {
        switch ($action) {
            case 'register':
                $this->user->register();
                break;
            case 'login':
                $this->user->login();
                break;
            case 'check_auth':
                $this->checkAuth();
                break;
            case 'logout':
                $this->logout();
                break;
            case 'getUserRole':
                $this->user->getRole();
                break;
            case 'requestPasswordReset':
                $this->user->requestPasswordReset();
                break;
            case 'validatePasswordResetToken':
                $this->user->validatePasswordResetToken();
                break;
            case 'resetPassword':
                $this->user->resetPassword();
                break;
        }
    }

    private function checkAuth()
    {
        if (isset($_SESSION['user_id']) && isset($_SESSION['user_login'])) {
            $userId = intval($_SESSION['user_id']);


            $sql = "SELECT id_user, login, role, first_name, last_name, email, phone FROM users WHERE id_user = ?";
            $stmt = $this->db->getConnection()->prepare($sql);
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();


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

                $this->logout();
            }
            $stmt->close();
        } else {

            echo json_encode([
                'success' => true,
                'authenticated' => false,
                'message' => 'Пользователь не авторизован'
            ]);
        }
    }

    private function logout()
    {
        $_SESSION = array();

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();

        echo json_encode([
            'success' => true,
            'message' => 'Вы успешно вышли из системы',
            'authenticated' => false
        ]);
    }
}
