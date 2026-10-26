<?php
declare(strict_types=1);
namespace Course\Domain;
final class OperationException extends \RuntimeException
{
    public function __construct(string $message, public readonly string $reason = 'validation')
    {
        parent::__construct($message);
    }
}
