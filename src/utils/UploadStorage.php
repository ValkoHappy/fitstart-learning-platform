<?php

class UploadStorage
{
    public static function root(): string
    {
        $configuredRoot = trim((string) getenv('UPLOAD_ROOT'));
        if ($configuredRoot !== '') {
            return rtrim($configuredRoot, "/\\");
        }

        $rootDir = defined('ROOT_DIR') ? ROOT_DIR : dirname(__DIR__, 2);
        $localPublicDir = $rootDir . DIRECTORY_SEPARATOR . 'public';

        if (is_file($localPublicDir . DIRECTORY_SEPARATOR . 'index.php')) {
            return $localPublicDir;
        }

        return $rootDir;
    }

    public static function directory(string $publicPath): string
    {
        $relativePath = trim(str_replace('\\', '/', $publicPath), '/');
        return self::root() . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
    }

    public static function ensureDirectory(string $publicPath): string
    {
        $directory = self::directory($publicPath);
        if (!is_dir($directory) && !mkdir($directory, 0775, true)) {
            throw new RuntimeException('Не удалось создать папку для загружаемых файлов.');
        }

        if (!is_writable($directory)) {
            throw new RuntimeException('Папка загрузок недоступна для записи на сервере.');
        }

        return rtrim($directory, "/\\") . DIRECTORY_SEPARATOR;
    }

    public static function resolvePublicFile(string $requestPath): ?string
    {
        $path = parse_url($requestPath, PHP_URL_PATH) ?: '';
        $normalizedPath = '/' . ltrim(str_replace('\\', '/', $path), '/');

        if (!preg_match('#^/(img|uploads)/#', $normalizedPath)) {
            return null;
        }

        $root = realpath(self::root());
        if (!$root) {
            return null;
        }

        $candidate = realpath($root . DIRECTORY_SEPARATOR . ltrim($normalizedPath, '/'));
        if (!$candidate || !str_starts_with($candidate, $root . DIRECTORY_SEPARATOR) || !is_file($candidate)) {
            return null;
        }

        return $candidate;
    }
}
