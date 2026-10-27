<?php
class Module
{
    private $conn;
    private $table = 'modules';

    public function __construct($connection)
    {
        $this->conn = $connection;
    }


    public function getByCourseId($courseId, $userId = null)
    {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE id_course = ? ORDER BY order_index ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('i', $courseId);
            $stmt->execute();
            $result = $stmt->get_result();
            $modules = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();


            foreach ($modules as &$module) {
                $module['lessons'] = $this->getLessonsByModuleId($module['id_module'], $userId);
            }

            return $modules;
        } catch (Exception $e) {
            return [];
        }
    }

    private function getLessonsByModuleId($moduleId, $userId = null)
    {
        try {
            if ($userId) {
                $sql = "SELECT l.*,
                            (lp.id_progress IS NOT NULL) as completed,
                            qs.id_submission,
                            qs.status as submission_status,
                            qs.answer_text as latest_answer_text,
                            qs.answer_link as latest_answer_link,
                            qs.reviewer_comment,
                            qs.submitted_at,
                            qs.reviewed_at,
                            qa.score as quiz_score,
                            qa.passed as quiz_passed,
                            qa.created_at as quiz_attempted_at,
                            qa.answers_json as quiz_answers_json
                        FROM lessons l
                        LEFT JOIN lesson_progress lp ON l.id_lesson = lp.id_lesson AND lp.id_user = ?
                        LEFT JOIN assignments a ON a.id_lesson = l.id_lesson
                        LEFT JOIN (
                            SELECT s1.*
                            FROM assignment_submissions s1
                            INNER JOIN (
                                SELECT id_assignment, id_user, MAX(id_submission) AS max_submission
                                FROM assignment_submissions
                                GROUP BY id_assignment, id_user
                            ) latest ON latest.max_submission = s1.id_submission
                        ) qs ON qs.id_assignment = a.id_assignment AND qs.id_user = ?
                        LEFT JOIN (
                            SELECT qa1.*
                            FROM quiz_attempts qa1
                            INNER JOIN (
                                SELECT id_lesson, id_user, MAX(id_attempt) AS max_attempt
                                FROM quiz_attempts
                                GROUP BY id_lesson, id_user
                            ) latest_quiz ON latest_quiz.max_attempt = qa1.id_attempt
                        ) qa ON qa.id_lesson = l.id_lesson AND qa.id_user = ?
                        WHERE l.id_module = ?
                        ORDER BY l.order_index ASC";
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param('iiii', $userId, $userId, $userId, $moduleId);
            } else {
                $sql = "SELECT *, 0 as completed FROM lessons WHERE id_module = ? ORDER BY order_index ASC";
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param('i', $moduleId);
            }

            $stmt->execute();
            $result = $stmt->get_result();
            $lessons = $result->fetch_all(MYSQLI_ASSOC);


            foreach ($lessons as &$lesson) {
                $lesson['completed'] = (bool)$lesson['completed'];
            }

            if ($userId) {
                $submissionIds = array_values(array_unique(array_filter(array_map(
                    static fn($lesson) => isset($lesson['id_submission']) ? intval($lesson['id_submission']) : 0,
                    $lessons
                ))));

                if (!empty($submissionIds)) {
                    $placeholders = implode(',', array_fill(0, count($submissionIds), '?'));
                    $types = str_repeat('i', count($submissionIds));
                    $fileSql = "SELECT id_submission, file_path, original_name, mime_type, file_size
                        FROM submission_files
                        WHERE id_submission IN ({$placeholders})
                        ORDER BY uploaded_at ASC";
                    $fileStmt = $this->conn->prepare($fileSql);
                    $params = [];
                    foreach ($submissionIds as $key => $value) {
                        $params[$key] = &$submissionIds[$key];
                    }
                    $fileStmt->bind_param($types, ...$params);
                    $fileStmt->execute();
                    $files = $fileStmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $fileStmt->close();

                    $filesBySubmission = [];
                    foreach ($files as $file) {
                        $filesBySubmission[intval($file['id_submission'])][] = $file;
                    }

                    foreach ($lessons as &$lesson) {
                        $submissionId = intval($lesson['id_submission'] ?? 0);
                        $lesson['submission_files'] = $submissionId ? ($filesBySubmission[$submissionId] ?? []) : [];
                    }
                } else {
                    foreach ($lessons as &$lesson) {
                        $lesson['submission_files'] = [];
                    }
                }
            }

            return $lessons;
        } catch (Exception $e) {
            return [];
        }
    }



    public function create($courseId, $title)
    {
        if (empty($title)) {
            return false;
        }
        $orderStmt = $this->conn->prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM {$this->table} WHERE id_course = ?");
        $orderStmt->bind_param("i", $courseId);
        $orderStmt->execute();
        $nextOrder = intval($orderStmt->get_result()->fetch_assoc()['next_order'] ?? 0);
        $orderStmt->close();

        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (id_course, title, order_index) VALUES (?, ?, ?)");
        $stmt->bind_param("isi", $courseId, $title, $nextOrder);
        if ($stmt->execute()) {
            return $stmt->insert_id;
        }
        return false;
    }

    public function update($id, $title)
    {
        if (empty($title)) {
            return false;
        }
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET title = ? WHERE id_module = ?");
        $stmt->bind_param("si", $title, $id);
        return $stmt->execute();
    }

    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id_module = ?");
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }


    public function reorder($orderedIds)
    {
        $this->conn->begin_transaction();
        try {
            $stmt = $this->conn->prepare("UPDATE {$this->table} SET order_index = ? WHERE id_module = ?");
            foreach ($orderedIds as $index => $id) {
                $stmt->bind_param("ii", $index, $id);
                $stmt->execute();
            }
            $stmt->close();
            $this->conn->commit();
            return true;
        } catch (Exception $e) {
            $this->conn->rollback();
            return false;
        }
    }
}
