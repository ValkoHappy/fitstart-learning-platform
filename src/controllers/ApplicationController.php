<?php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Application.php';
require_once dirname(__DIR__) . '/utils/Validation.php';

class ApplicationController
{
    private $db;
    private $application;

    public function __construct(Database $db)
    {
        $this->db = $db;
        $this->application = new Application($this->db->getConnection());
    }

    public function handle($action)
    {
        switch ($action) {
            case 'createApplication':
                $this->application->create();
                break;
            case 'getApplications':
                $this->application->getUserApplications();
                break;
            case 'getAllApplications':
                $this->application->getAllApplications();
                break;
            case 'updateApplicationStatus':
                $this->application->updateStatus();
                break;
            case 'deleteApplication':
                $this->application->delete();
                break;
            case 'searchApplications':
                $this->application->search();
                break;
        }
    }
}
