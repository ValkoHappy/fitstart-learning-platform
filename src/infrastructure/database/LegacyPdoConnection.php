<?php

class LegacyPdoConnection
{
    private ?PDO $pdo;
    public string $error = '';
    public string $connect_error = '';

    public function __construct(?PDO $pdo, string $connectError = '')
    {
        $this->pdo = $pdo;
        $this->connect_error = $connectError;
        $this->error = $connectError;
    }

    public function prepare(string $sql)
    {
        if (!$this->pdo) {
            $this->error = $this->connect_error ?: 'Database connection is not available';
            return false;
        }

        try {
            $stmt = $this->pdo->prepare($sql);
            return new LegacyPdoStatement($this->pdo, $stmt);
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return false;
        }
    }

    public function query(string $sql)
    {
        if (!$this->pdo) {
            $this->error = $this->connect_error ?: 'Database connection is not available';
            return false;
        }

        try {
            if ($this->isRowReturningQuery($sql)) {
                $stmt = $this->pdo->query($sql);
                if ($stmt === false) {
                    return false;
                }

                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                return new LegacyPdoResult($rows);
            }

            return $this->pdo->exec($sql) !== false;
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return false;
        }
    }

    public function begin_transaction(): bool
    {
        if (!$this->pdo) {
            return false;
        }

        return $this->pdo->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->pdo ? $this->pdo->commit() : false;
    }

    public function rollback(): bool
    {
        return $this->pdo ? $this->pdo->rollBack() : false;
    }

    public function set_charset(string $charset): bool
    {
        return true;
    }

    public function close(): void
    {
        $this->pdo = null;
    }

    public function __get(string $name)
    {
        if ($name === 'insert_id') {
            return $this->pdo ? (int) $this->pdo->lastInsertId() : 0;
        }

        if ($name === 'error') {
            return $this->error;
        }

        if ($name === 'connect_error') {
            return $this->connect_error;
        }

        return null;
    }

    private function isRowReturningQuery(string $sql): bool
    {
        return (bool) preg_match('/^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)\b/i', $sql);
    }
}
