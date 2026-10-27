<?php
require_once __DIR__ . '/Environment.php';
require_once dirname(__DIR__) . '/infrastructure/database/LegacyPdoResult.php';
require_once dirname(__DIR__) . '/infrastructure/database/LegacyPdoStatement.php';
require_once dirname(__DIR__) . '/infrastructure/database/LegacyPdoConnection.php';

if (!defined('MYSQLI_ASSOC')) define('MYSQLI_ASSOC', 1);
if (!defined('MYSQLI_NUM')) define('MYSQLI_NUM', 2);
loadEnvironmentFile(dirname(__DIR__, 2) . '/.env');

class Database
{
    private string $servername;
    private string $username;
    private string $password;
    private string $dbname;
    private int $port;
    private ?PDO $pdo = null;
    public $conn;

    public function __construct()
    {
        $databaseUrl = getenv('DATABASE_URL') ?: '';
        $databaseParts = $databaseUrl ? parse_url($databaseUrl) : false;

        $this->servername = $databaseParts['host']
            ?? getenv('MYSQLHOST')
            ?: getenv('DB_HOST')
            ?: '127.0.0.1';
        $this->username = isset($databaseParts['user'])
            ? urldecode($databaseParts['user'])
            : (getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root');
        $this->password = isset($databaseParts['pass'])
            ? urldecode($databaseParts['pass'])
            : (getenv('MYSQLPASSWORD') ?: getenv('DB_PASS') ?: '');
        $this->dbname = isset($databaseParts['path'])
            ? ltrim($databaseParts['path'], '/')
            : (getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'fitstart');
        $this->port = (int) (
            $databaseParts['port']
            ?? getenv('MYSQLPORT')
            ?: getenv('DB_PORT')
            ?: 3306
        );

        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $this->servername,
                $this->port,
                $this->dbname
            );

            $this->pdo = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false,
                PDO::ATTR_TIMEOUT => 5,
            ]);

            $this->conn = new LegacyPdoConnection($this->pdo);
        } catch (PDOException $e) {
            $this->conn = new LegacyPdoConnection(null, $e->getMessage());
        }

        $this->conn->set_charset('utf8mb4');
    }

    public function getPdo(): PDO
    {
        if (!$this->pdo) throw new RuntimeException('База данных недоступна');
        return $this->pdo;
    }

    public function getConnection()
    {
        return $this->conn;
    }
}
