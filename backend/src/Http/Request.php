<?php
declare(strict_types=1);
namespace Course\Http;
final class Request
{
    public static function json(): array
    {
        if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
            throw new ApiException('Требуется JSON.', 415);
        }
        $body = file_get_contents('php://input', false, null, 0, 16385);
        if ($body === false || strlen($body) > 16384) {
            throw new ApiException('Запрос слишком большой.', 413);
        }
        try {
            $data = json_decode($body, false, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new ApiException('Некорректный JSON.');
        }
        if (!$data instanceof \stdClass) {
            throw new ApiException('Ожидается объект JSON.');
        }
        return (array) $data;
    }

    public static function password(array $data): string
    {
        $value = $data['password'] ?? null;
        if (!is_string($value) || $value === '' || strlen($value) > 72) {
            throw new ApiException('Проверьте пароль.');
        }
        return $value;
    }

    public static function text(array $data, string $key, int $max, bool $required = true): string
    {
        $value = $data[$key] ?? '';
        if (!is_string($value)) {
            throw new ApiException('Некорректное поле: ' . $key);
        }
        $value = trim($value);
        if (($required && $value === '') || strlen($value) > $max) {
            throw new ApiException('Проверьте поле: ' . $key);
        }
        return $value;
    }
}
