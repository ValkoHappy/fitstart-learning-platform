<?php
return [
    SystemController::class => ['health'],
    AuthController::class => ['register', 'login', 'check_auth', 'logout', 'getUserRole', 'requestPasswordReset', 'validatePasswordResetToken', 'resetPassword'],
    CourseController::class => ['getCourses', 'getCourse', 'checkAccess', 'createCourse', 'updateCourse', 'deleteCourse', 'getCourseContent', 'createModule', 'updateModule', 'deleteModule', 'createLesson', 'updateLesson', 'deleteLesson', 'reorderModules', 'reorderLessons'],
    LearningController::class => ['completeLesson', 'submitAssignment', 'reviewSubmission', 'getReviewQueue', 'submitQuiz'],
    ApplicationController::class => ['createApplication', 'getApplications', 'getAllApplications', 'updateApplicationStatus', 'deleteApplication', 'searchApplications'],
    AdminController::class => ['getUsers', 'updateUserRole', 'deleteUser', 'getStaffPermissions', 'saveStaffPermissions', 'getProgressOverview', 'getQuizQuestions', 'saveQuizQuestions'],
];
