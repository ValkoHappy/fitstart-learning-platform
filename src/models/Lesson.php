<?php
class Lesson
{
    private $conn;
    private $table = 'lessons';

    public function __construct($connection)
    {
        $this->conn = $connection;
    }


    public function create($moduleId, $title, $type, $content, $duration, $videoProvider = null, $videoRef = null, $passScore = null, $completionPolicy = null)
    {
        $completionPolicy = $completionPolicy ?: ($type === 'quiz' ? 'quiz' : ($type === 'task' ? 'review' : 'manual'));
        $stmt = $this->conn->prepare("INSERT INTO {$this->table} (id_module, title, type, content, duration, video_provider, video_ref, pass_score, completion_policy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssssss", $moduleId, $title, $type, $content, $duration, $videoProvider, $videoRef, $passScore, $completionPolicy);
        if ($stmt->execute()) {
            return $stmt->insert_id;
        }
        return false;
    }


    public function update($id, $title, $type, $content, $duration, $videoProvider = null, $videoRef = null, $passScore = null, $completionPolicy = null)
    {
        $completionPolicy = $completionPolicy ?: ($type === 'quiz' ? 'quiz' : ($type === 'task' ? 'review' : 'manual'));
        $stmt = $this->conn->prepare("UPDATE {$this->table} SET title = ?, type = ?, content = ?, duration = ?, video_provider = ?, video_ref = ?, pass_score = ?, completion_policy = ? WHERE id_lesson = ?");
        $stmt->bind_param("ssssssssi", $title, $type, $content, $duration, $videoProvider, $videoRef, $passScore, $completionPolicy, $id);
        return $stmt->execute();
    }


    public function delete($id)
    {
        $stmt = $this->conn->prepare("DELETE FROM {$this->table} WHERE id_lesson = ?");
        $stmt->bind_param("i", $id);
        return $stmt->execute();
    }


    public function reorder($orderedIds)
    {
        $this->conn->begin_transaction();
        try {
            $stmt = $this->conn->prepare("UPDATE {$this->table} SET order_index = ? WHERE id_lesson = ?");
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


    public function getById($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id_lesson = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }
}
