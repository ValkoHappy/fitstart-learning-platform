<?php

class Validation
{
    public const MIN_PASSWORD_LENGTH = 8;

    public static function validatePassword(string $password): ?string
    {
        if (mb_strlen($password) < self::MIN_PASSWORD_LENGTH) {
            return 'Пароль должен содержать минимум ' . self::MIN_PASSWORD_LENGTH . ' символов';
        }

        return null;
    }

    public static function normalizeRussianPhone(?string $phone): string
    {
        $phone = trim((string) $phone);

        if ($phone === '') {
            return '';
        }

        $digits = preg_replace('/\D+/', '', $phone);
        if ($digits === null || $digits === '') {
            return '';
        }

        if (strlen($digits) === 11 && ($digits[0] === '7' || $digits[0] === '8')) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) !== 10) {
            return '';
        }

        return sprintf(
            '+7 (%s) %s-%s-%s',
            substr($digits, 0, 3),
            substr($digits, 3, 3),
            substr($digits, 6, 2),
            substr($digits, 8, 2)
        );
    }

    public static function validateOptionalRussianPhone(?string $phone): ?string
    {
        $phone = trim((string) $phone);

        if ($phone === '') {
            return null;
        }

        return self::normalizeRussianPhone($phone) === ''
            ? 'Введите телефон в формате +7 (999) 123-45-67'
            : null;
    }
}
