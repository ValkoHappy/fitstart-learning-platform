<?php

class Mailer
{
    private static string $lastError = '';

    public static function sendPlainText(string $to, string $subject, string $body): bool
    {
        self::$lastError = '';
        $fromEmail = getenv('MAIL_FROM') ?: 'no-reply@fitstart.local';
        $fromName = getenv('MAIL_FROM_NAME') ?: 'FitStart';

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            self::$lastError = 'Некорректный email получателя';
            error_log('Mail send failed: invalid recipient email');
            return false;
        }

        if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            self::$lastError = 'Некорректный email отправителя';
            error_log('Mail send failed: invalid sender email');
            return false;
        }

        if (getenv('SMTP_HOST') && getenv('SMTP_USER') && getenv('SMTP_PASS')) {
            return self::sendViaSmtp($to, $subject, $body, $fromEmail, $fromName);
        }

        if (self::isProduction()) {
            self::$lastError = 'SMTP не настроен на сервере';
            error_log('Mail send failed: SMTP is not configured in production');
            return false;
        }

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            sprintf('From: %s <%s>', $encodedFromName, $fromEmail),
            sprintf('Reply-To: %s', $fromEmail),
            'X-Mailer: PHP/' . phpversion(),
        ];

        $sent = @mail($to, $encodedSubject, $body, implode("\r\n", $headers));
        if (!$sent) {
            self::$lastError = 'PHP mail() не смог отправить письмо';
        }

        return $sent;
    }

    public static function getLastError(): string
    {
        return self::$lastError;
    }

    private static function sendViaSmtp(string $to, string $subject, string $body, string $fromEmail, string $fromName): bool
    {
        $host = (string) getenv('SMTP_HOST');
        $port = (int) (getenv('SMTP_PORT') ?: 587);
        $secure = strtolower((string) (getenv('SMTP_SECURE') ?: 'tls'));
        $username = (string) getenv('SMTP_USER');
        $password = (string) getenv('SMTP_PASS');
        $timeout = 20;

        $target = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'peer_name' => $host,
                'SNI_enabled' => true,
            ],
        ]);
        $socket = @stream_socket_client($target, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

        if (!$socket) {
            self::$lastError = "Не удалось подключиться к SMTP: {$errstr}";
            error_log("SMTP connection failed: {$errno} {$errstr}");
            return false;
        }

        stream_set_timeout($socket, $timeout);

        try {
            self::expect($socket, [220]);
            self::command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);

            if ($secure === 'tls') {
                self::command($socket, 'STARTTLS', [220]);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('SMTP STARTTLS failed');
                }
                self::command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250]);
            }

            self::command($socket, 'AUTH LOGIN', [334]);
            self::command($socket, base64_encode($username), [334]);
            self::command($socket, base64_encode($password), [235]);

            self::command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
            self::command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
            self::command($socket, 'DATA', [354]);

            $message = self::buildMessage($to, $subject, $body, $fromEmail, $fromName);
            fwrite($socket, $message . "\r\n.\r\n");
            self::expect($socket, [250]);
            self::command($socket, 'QUIT', [221]);
            fclose($socket);

            return true;
        } catch (Throwable $e) {
            self::$lastError = $e->getMessage();
            error_log('SMTP send failed: ' . $e->getMessage());
            if (is_resource($socket)) {
                fclose($socket);
            }
            return false;
        }
    }

    private static function buildMessage(string $to, string $subject, string $body, string $fromEmail, string $fromName): string
    {
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $body = str_replace(["\r\n", "\r"], "\n", $body);
        $body = str_replace("\n", "\r\n", $body);

        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'Date: ' . date(DATE_RFC2822),
            sprintf('From: %s <%s>', $encodedFromName, $fromEmail),
            sprintf('Reply-To: %s', $fromEmail),
            sprintf('To: <%s>', $to),
            sprintf('Subject: %s', $encodedSubject),
        ];

        return implode("\r\n", $headers) . "\r\n\r\n" . self::escapeSmtpBody($body);
    }

    private static function escapeSmtpBody(string $body): string
    {
        return preg_replace('/^\./m', '..', $body);
    }

    private static function isProduction(): bool
    {
        return getenv('APP_ENV') === 'production'
            || getenv('RAILWAY_ENVIRONMENT') !== false
            || getenv('RAILWAY_PROJECT_ID') !== false;
    }

    private static function command($socket, string $command, array $expectedCodes): string
    {
        fwrite($socket, $command . "\r\n");
        return self::expect($socket, $expectedCodes);
    }

    private static function expect($socket, array $expectedCodes): string
    {
        $response = '';

        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (preg_match('/^\d{3}\s/', $line)) {
                break;
            }
        }

        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expectedCodes, true)) {
            throw new RuntimeException('SMTP expected ' . implode('/', $expectedCodes) . ', got: ' . trim($response));
        }

        return $response;
    }
}
