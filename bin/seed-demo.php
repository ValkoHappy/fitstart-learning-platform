<?php
require_once dirname(__DIR__) . '/src/config/database.php';
$pdo = (new Database())->getPdo();
if ($pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn()) { fwrite(STDERR, "Courses already exist. No data changed.\n"); exit(1); }
$courses = json_decode(file_get_contents(dirname(__DIR__) . '/database/demo-courses.json'), true, 512, JSON_THROW_ON_ERROR);
$pdo->beginTransaction();
try {
    foreach ($courses as $course) {
        $pdo->prepare('INSERT INTO courses (id_course,title,description,image_path,access_type,is_active) VALUES (?,?,?,?,?,1)')->execute([$course['id_course'],$course['title'],$course['description'],$course['image_path'],$course['access_type']]);
        foreach ($course['modules'] as $module) {
            $pdo->prepare('INSERT INTO modules (id_module,id_course,title,order_index) VALUES (?,?,?,?)')->execute([$module['id_module'],$course['id_course'],$module['title'],$module['order_index']]);
            foreach ($module['lessons'] as $lesson) {
                $pdo->prepare('INSERT INTO lessons (id_lesson,id_module,title,type,content,duration,order_index,video_provider,video_ref,pass_score,completion_policy) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute([$lesson['id_lesson'],$module['id_module'],$lesson['title'],$lesson['type'],$lesson['content'],$lesson['duration'],$lesson['order_index'],$lesson['video_provider']??null,$lesson['video_ref']??null,$lesson['pass_score']??null,$lesson['completion_policy']]);
                if ($lesson['type'] === 'task') $pdo->prepare('INSERT INTO assignments (id_lesson,prompt) VALUES (?,?)')->execute([$lesson['id_lesson'],$lesson['content']]);
                if ($lesson['type'] !== 'quiz') continue;
                foreach (json_decode($lesson['content'],true)['questions'] as $question) {
                    $pdo->prepare('INSERT INTO quiz_questions (id_question,id_lesson,question,order_index) VALUES (?,?,?,0)')->execute([$question['id_question'],$lesson['id_lesson'],$question['question']]);
                    foreach ($question['options'] as $index => $option) $pdo->prepare('INSERT INTO quiz_options (id_option,id_question,option_text,is_correct,order_index) VALUES (?,?,?,?,?)')->execute([$option['id_option'],$question['id_question'],$option['option_text'],(int)$option['is_correct'],$index]);
                }
            }
        }
    }
    $pdo->commit(); echo "Created 3 sample courses and 12 lessons.\n";
} catch (Throwable $error) { $pdo->rollBack(); fwrite(STDERR, "Cannot seed sample courses: " . $error->getMessage() . "\n"); exit(1); }
