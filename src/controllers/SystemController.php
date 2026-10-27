<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/utils/UploadStorage.php';

class SystemController
{
    public function health(): void
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'uploads' => $this->checkUploads(),
            'smtp' => $this->checkSmtp(),
        ];

        $ok = $checks['database']['ok'] && $checks['uploads']['ok'];
        http_response_code($ok ? 200 : 503);
        echo json_encode([
            'success' => $ok,
            'checks' => $checks,
        ], JSON_UNESCAPED_UNICODE);
    }

    private function checkDatabase(): array
    {
        $db = new Database();
        $conn = $db->getConnection();
        $result = $conn->query('SELECT 1 AS ok');

        if (!$result) {
            return [
                'ok' => false,
                'message' => 'База данных недоступна',
            ];
        }

        return ['ok' => true];
    }

    private function checkUploads(): array
    {
        try {
            UploadStorage::ensureDirectory('img');
            UploadStorage::ensureDirectory('uploads/courses');
            UploadStorage::ensureDirectory('uploads/submissions');

            return [
                'ok' => true,
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'message' => 'Хранилище недоступно',
            ];
        }
    }

    private function checkSmtp(): array
    {
        $configured = getenv('SMTP_HOST') && getenv('SMTP_USER') && getenv('SMTP_PASS');

        return [
            'ok' => (bool) $configured,
            'configured' => (bool) $configured,
            'message' => $configured ? 'SMTP настроен' : 'SMTP не настроен',
        ];
    }
}
