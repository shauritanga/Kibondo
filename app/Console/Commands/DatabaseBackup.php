<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

#[Signature('db:backup')]
#[Description('Dump the database to storage/backups and prune copies older than 30 days')]
class DatabaseBackup extends Command
{
    public function handle(): int
    {
        $disk = Storage::disk('local');
        $disk->makeDirectory('backups');

        $filename = 'backups/kibondo_' . now()->format('Y-m-d_His') . '.sql.gz';
        $path     = storage_path('app/' . $filename);

        $host   = config('database.connections.pgsql.host');
        $port   = config('database.connections.pgsql.port');
        $db     = config('database.connections.pgsql.database');
        $user   = config('database.connections.pgsql.username');
        $pass   = config('database.connections.pgsql.password');

        $cmd = sprintf(
            'PGPASSWORD=%s pg_dump -h %s -p %s -U %s %s | gzip > %s',
            escapeshellarg($pass),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($user),
            escapeshellarg($db),
            escapeshellarg($path)
        );

        exec($cmd, $output, $exitCode);

        if ($exitCode !== 0) {
            Log::error('Database backup failed', ['exit_code' => $exitCode]);
            $this->error('Backup failed.');
            return self::FAILURE;
        }

        $this->info("Backup saved: {$filename}");

        // Prune backups older than 30 days
        $pruned = 0;
        foreach ($disk->files('backups') as $file) {
            if ($disk->lastModified($file) < now()->subDays(30)->timestamp) {
                $disk->delete($file);
                $pruned++;
            }
        }

        if ($pruned > 0) {
            $this->info("Pruned {$pruned} old backup(s).");
        }

        return self::SUCCESS;
    }
}
