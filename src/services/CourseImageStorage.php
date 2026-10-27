<?php
require_once dirname(__DIR__) . '/utils/UploadStorage.php';

class CourseImageStorage
{
    private const MAX_COURSE_IMAGE_BYTES = 5 * 1024 * 1024;
    private const MAX_COURSE_IMAGE_SIDE = 1400;

    public function upload()
    {
        if (empty($_FILES['image'])) {
            return '';
        }
        if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException($this->uploadErrorMessage($_FILES['image']['error']));
        }
        if (($_FILES['image']['size'] ?? 0) > self::MAX_COURSE_IMAGE_BYTES) {
            throw new RuntimeException('Изображение слишком большое. Загрузите файл до 5 МБ.');
        }
        $extension = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            throw new RuntimeException('Поддерживаются только JPG, PNG, WEBP или GIF.');
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES['image']['tmp_name']);
        $allowed = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif'];
        if ($mime !== $allowed[$extension] || !getimagesize($_FILES['image']['tmp_name'])) {
            throw new RuntimeException('Содержимое файла не соответствует изображению.');
        }
        $uploadDir = UploadStorage::ensureDirectory('uploads/courses');
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
            throw new RuntimeException('Не удалось создать папку для изображений.');
        }
        if (!is_writable($uploadDir)) {
            throw new RuntimeException('Папка изображений недоступна для записи на сервере.');
        }
        $tmpPath = $_FILES['image']['tmp_name'];
        $optimizedPath = $this->optimizeCourseImage($tmpPath, $extension);
        $targetExtension = $optimizedPath ? 'jpg' : $extension;
        $sourcePath = $optimizedPath ?: $tmpPath;
        $fileName = 'course_' . time() . '_' . uniqid() . '.' . $targetExtension;
        $targetPath = $uploadDir . $fileName;
        $stored = $optimizedPath
            ? rename($sourcePath, $targetPath)
            : move_uploaded_file($sourcePath, $targetPath);
        if (!$stored) {
            if ($optimizedPath && is_file($optimizedPath)) {
                @unlink($optimizedPath);
            }
            throw new RuntimeException('Не удалось сохранить изображение на сервере.');
        }
        @chmod($targetPath, 0644);
        if (!in_array($targetExtension, ['gif', 'webp'], true)) {
            $this->createCourseWebpVariant($targetPath);
        }
        return '/uploads/courses/' . $fileName;
    }

    private function optimizeCourseImage(string $sourcePath, string $extension): ?string
    {
        if ($extension === 'gif' || !extension_loaded('gd')) {
            return null;
        }

        $bytes = file_get_contents($sourcePath);
        if ($bytes === false) {
            return null;
        }

        $image = @imagecreatefromstring($bytes);
        if (!$image) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::MAX_COURSE_IMAGE_SIDE / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $targetImage = imagecreatetruecolor($targetWidth, $targetHeight);
        imagecopyresampled($targetImage, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        $optimizedPath = tempnam(sys_get_temp_dir(), 'course_cover_');
        if (!$optimizedPath || !imagejpeg($targetImage, $optimizedPath, 82)) {
            imagedestroy($targetImage);
            imagedestroy($image);
            if ($optimizedPath) {
                @unlink($optimizedPath);
            }
            return null;
        }

        imagedestroy($targetImage);
        imagedestroy($image);
        return $optimizedPath;
    }

    private function createCourseWebpVariant(string $sourcePath): void
    {
        if (!extension_loaded('gd') || !is_file($sourcePath)) {
            return;
        }

        $bytes = file_get_contents($sourcePath);
        if ($bytes === false) {
            return;
        }

        $image = @imagecreatefromstring($bytes);
        if (!$image) {
            return;
        }

        $webpPath = $sourcePath . '.webp';
        if (@imagewebp($image, $webpPath, 78)) {
            @chmod($webpPath, 0644);
        }
        imagedestroy($image);
    }

    private function uploadErrorMessage($code)
    {
        switch ($code) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'Изображение слишком большое для настроек сервера.';
            case UPLOAD_ERR_PARTIAL:
                return 'Изображение загрузилось не полностью. Попробуйте еще раз.';
            case UPLOAD_ERR_NO_FILE:
                return '';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'На сервере нет временной папки для загрузок.';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Сервер не смог записать загруженный файл.';
            case UPLOAD_ERR_EXTENSION:
                return 'PHP-расширение остановило загрузку файла.';
            default:
                return 'Не удалось загрузить изображение.';
        }
    }

}
