<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Admin.php';

class AdminController
{
    private $admin;

    public function __construct(Database $db)
    {
        $this->admin = new Admin($db->getConnection());
    }

    public function handle($action)
    {
        switch ($action) {
            case 'getUsers':
                $this->admin->getUsers();
                break;
            case 'updateUserRole':
                $this->admin->updateUserRole();
                break;
            case 'deleteUser':
                $this->admin->deleteUser();
                break;
            case 'getStaffPermissions':
                $this->admin->getStaffPermissions();
                break;
            case 'saveStaffPermissions':
                $this->admin->saveStaffPermissions();
                break;
            case 'getProgressOverview':
                $this->admin->getProgressOverview();
                break;
            case 'getQuizQuestions':
                $this->admin->getQuizQuestions();
                break;
            case 'saveQuizQuestions':
                $this->admin->saveQuizQuestions();
                break;
        }
    }
}
