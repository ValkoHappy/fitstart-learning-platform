<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Learning.php';

class LearningController
{
    private $learning;

    public function __construct(Database $db)
    {
        $this->learning = new Learning($db->getConnection());
    }

    public function handle($action)
    {
        switch ($action) {
            case 'submitAssignment':
                $this->learning->submitAssignment();
                break;
            case 'reviewSubmission':
                $this->learning->reviewSubmission();
                break;
            case 'getReviewQueue':
                $this->learning->getReviewQueue();
                break;
            case 'submitQuiz':
                $this->learning->submitQuiz();
                break;
            case 'completeLesson':
                $this->learning->completeLesson();
                break;
        }
    }
}
