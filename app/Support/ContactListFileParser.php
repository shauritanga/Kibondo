<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class ContactListFileParser
{
    /**
     * Parse xlsx / csv / txt into unique [{phone, name}] rows.
     * Expected spreadsheet columns: Number (or Phone) and optional Name.
     *
     * @return list<array{phone: string, name: ?string}>
     */
    public function parse(UploadedFile|string $file): array
    {
        $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;
        $name = $file instanceof UploadedFile ? strtolower($file->getClientOriginalName()) : strtolower(basename((string) $file));

        if (! is_string($path) || $path === '' || ! is_readable($path)) {
            throw ValidationException::withMessages(['file' => 'Cannot read uploaded file.']);
        }

        $rows = match (true) {
            str_ends_with($name, '.xlsx') => $this->parseXlsx($path),
            str_ends_with($name, '.csv') => $this->parseDelimited($path, ','),
            str_ends_with($name, '.tsv') => $this->parseDelimited($path, "\t"),
            str_ends_with($name, '.txt') => $this->parseTxt($path),
            default => throw ValidationException::withMessages([
                'file' => 'Unsupported file type. Upload .xlsx, .csv, or .txt.',
            ]),
        };

        $unique = [];
        foreach ($rows as $row) {
            $phone = PhoneNumber::normalize($row['phone'] ?? null);
            if (! $phone) {
                continue;
            }
            $unique[$phone] = [
                'phone' => $phone,
                'name' => $this->cleanName($row['name'] ?? null),
            ];
        }

        if ($unique === []) {
            throw ValidationException::withMessages([
                'file' => 'No valid phone numbers found. Use columns Number/Phone and optional Name.',
            ]);
        }

        return array_values($unique);
    }

    /**
     * @return list<array{phone: string, name: ?string}>
     */
    private function parseTxt(string $path): array
    {
        $lines = file($path, FILE_IGNORE_NEW_LINES) ?: [];
        $out = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $out[] = ['phone' => $line, 'name' => null];
        }

        return $out;
    }

    /**
     * @return list<array{phone: string, name: ?string}>
     */
    private function parseDelimited(string $path, string $delimiter): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'Cannot read CSV file.']);
        }

        $header = null;
        $phoneIdx = 0;
        $nameIdx = null;
        $out = [];

        try {
            while (($cols = fgetcsv($handle, 0, $delimiter)) !== false) {
                if ($cols === [null] || $cols === false) {
                    continue;
                }
                $cols = array_map(fn ($c) => is_string($c) ? trim($c) : $c, $cols);

                if ($header === null) {
                    $lower = array_map(fn ($c) => strtolower((string) $c), $cols);
                    if ($this->looksLikeHeader($lower)) {
                        $phoneIdx = $this->findColumn($lower, ['number', 'phone', 'msisdn', 'mobile']) ?? 0;
                        $nameIdx = $this->findColumn($lower, ['name', 'customer', 'fullname']);
                        $header = true;
                        continue;
                    }
                    $header = false;
                }

                $phone = (string) ($cols[$phoneIdx] ?? '');
                $name = $nameIdx !== null ? (string) ($cols[$nameIdx] ?? '') : null;
                if ($phone === '') {
                    continue;
                }
                $out[] = ['phone' => $phone, 'name' => $name];
            }
        } finally {
            fclose($handle);
        }

        return $out;
    }

    /**
     * Minimal OOXML reader for simple sheets (inlineStr / numeric cells).
     *
     * @return list<array{phone: string, name: ?string}>
     */
    private function parseXlsx(string $path): array
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages(['file' => 'Invalid Excel file.']);
        }

        try {
            $shared = $this->readSharedStrings($zip);
            $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml')
                ?: $zip->getFromName('xl/worksheets/Sheet1.xml');

            if ($sheetXml === false) {
                throw ValidationException::withMessages(['file' => 'Excel file has no Sheet1.']);
            }
        } finally {
            $zip->close();
        }

        $ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
        $sheet = @simplexml_load_string($sheetXml);
        if ($sheet === false) {
            throw ValidationException::withMessages(['file' => 'Could not parse Excel sheet.']);
        }

        $sheet->registerXPathNamespace('m', $ns);
        $rows = $sheet->xpath('//m:sheetData/m:row') ?: [];

        $phoneCol = 'A';
        $nameCol = 'B';
        $out = [];
        $isFirst = true;

        foreach ($rows as $row) {
            $cells = [];
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                $col = preg_replace('/\d+/', '', $ref) ?? '';
                $cells[$col] = $this->cellValue($c, $shared, $ns);
            }

            if ($isFirst) {
                $isFirst = false;
                $mapped = $this->mapHeaderColumns($cells);
                if ($mapped !== null) {
                    [$phoneCol, $nameCol] = $mapped;
                    continue;
                }
            }

            $phone = (string) ($cells[$phoneCol] ?? '');
            $name = isset($nameCol) ? (string) ($cells[$nameCol] ?? '') : null;
            if ($phone === '') {
                continue;
            }
            $out[] = ['phone' => $phone, 'name' => $name !== '' ? $name : null];
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $cells
     * @return array{0: string, 1: ?string}|null
     */
    private function mapHeaderColumns(array $cells): ?array
    {
        $lower = [];
        foreach ($cells as $col => $val) {
            $lower[$col] = strtolower(trim($val));
        }
        if (! $this->looksLikeHeader(array_values($lower))) {
            return null;
        }

        $phoneCol = null;
        $nameCol = null;
        foreach ($lower as $col => $val) {
            if (in_array($val, ['number', 'phone', 'msisdn', 'mobile'], true)) {
                $phoneCol = $col;
            }
            if (in_array($val, ['name', 'customer', 'fullname'], true)) {
                $nameCol = $col;
            }
        }

        return [$phoneCol ?? 'A', $nameCol];
    }

    /**
     * @param  list<string>  $shared
     */
    private function cellValue(\SimpleXMLElement $c, array $shared, string $ns): string
    {
        $type = (string) $c['t'];

        if ($type === 'inlineStr') {
            $c->registerXPathNamespace('m', $ns);
            $nodes = $c->xpath('.//m:t');
            if ($nodes) {
                return trim(implode('', array_map(fn ($n) => (string) $n, $nodes)));
            }

            return '';
        }

        $v = isset($c->v) ? (string) $c->v : '';

        if ($type === 's' && $v !== '' && isset($shared[(int) $v])) {
            return $shared[(int) $v];
        }

        // Excel stores phones as numbers; avoid scientific notation for 12-digit MSISDNs.
        if ($type === '' || $type === 'n') {
            if (is_numeric($v) && ! str_contains($v, 'e') && ! str_contains($v, 'E')) {
                if (str_contains($v, '.')) {
                    return rtrim(rtrim(sprintf('%.0f', (float) $v), '0'), '.') ?: '0';
                }

                return $v;
            }
        }

        return trim($v);
    }

    /**
     * @return list<string>
     */
    private function readSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');
        if ($xml === false) {
            return [];
        }

        $ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
        $doc = @simplexml_load_string($xml);
        if ($doc === false) {
            return [];
        }
        $doc->registerXPathNamespace('m', $ns);
        $out = [];
        foreach ($doc->xpath('//m:si') ?: [] as $si) {
            $si->registerXPathNamespace('m', $ns);
            $parts = $si->xpath('.//m:t') ?: [];
            $out[] = implode('', array_map(fn ($t) => (string) $t, $parts));
        }

        return $out;
    }

    /**
     * @param  list<string>  $lower
     */
    private function looksLikeHeader(array $lower): bool
    {
        foreach ($lower as $val) {
            if (in_array($val, ['number', 'phone', 'msisdn', 'mobile', 'name'], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $lower
     * @param  list<string>  $candidates
     */
    private function findColumn(array $lower, array $candidates): ?int
    {
        foreach ($lower as $i => $val) {
            if (in_array($val, $candidates, true)) {
                return $i;
            }
        }

        return null;
    }

    private function cleanName(?string $name): ?string
    {
        $name = $name !== null ? trim($name) : null;

        return $name === '' ? null : $name;
    }
}
