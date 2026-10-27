<?php

class LegacyPdoStatement
{
    private PDO $pdo;
    private PDOStatement $stmt;
    private array $boundValues = [];
    private ?array $rows = null;
    public int $num_rows = 0;
    public int $insert_id = 0;
    public string $error = '';

    public function __construct(PDO $pdo, PDOStatement $stmt)
    {
        $this->pdo = $pdo;
        $this->stmt = $stmt;
    }

    public function bind_param(string $types, &...$vars): bool
    {
        $this->boundValues = [];
        foreach ($vars as $index => &$var) {
            $this->boundValues[$index] = &$var;
        }

        return true;
    }

    public function execute(?array $params = null): bool
    {
        try {
            $values = array_map(static fn($value) => $value, $params !== null ? array_values($params) : array_values($this->boundValues));
            $ok = $this->stmt->execute($values);

            $this->insert_id = (int) $this->pdo->lastInsertId();
            $this->error = '';
            $this->rows = null;
            $this->num_rows = 0;

            if ($this->stmt->columnCount() > 0) {
                $this->rows = $this->stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
                $this->num_rows = count($this->rows);
            }

            return $ok;
        } catch (PDOException $e) {
            $this->error = $e->getMessage();
            return false;
        }
    }

    public function get_result()
    {
        if ($this->rows === null) {
            $this->rows = $this->stmt->columnCount() > 0 ? ($this->stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
            $this->num_rows = count($this->rows);
        }

        return new LegacyPdoResult($this->rows);
    }

    public function store_result(): bool
    {
        if ($this->rows === null && $this->stmt->columnCount() > 0) {
            $this->rows = $this->stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $this->num_rows = count($this->rows);
        }

        return true;
    }

    public function close(): void
    {
        $this->rows = null;
    }
}
