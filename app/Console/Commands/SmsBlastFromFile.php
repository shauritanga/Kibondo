<?php

namespace App\Console\Commands;

use App\Services\SmsService;
use Illuminate\Console\Command;

class SmsBlastFromFile extends Command
{
    protected $signature = 'sms:blast
        {phones : Path to a text file with one phone number per line}
        {--message-file= : Path to the message body file}
        {--message= : Inline message body (ignored if --message-file is set)}
        {--dry-run : List recipients and exit without sending}
        {--force : Required to actually send}';

    protected $description = 'Send one SMS body to many numbers via the configured SMS driver (chunked bulk)';

    public function handle(SmsService $sms): int
    {
        $phonesPath = $this->argument('phones');
        if (! is_readable($phonesPath)) {
            $this->error("Cannot read phones file: {$phonesPath}");

            return self::FAILURE;
        }

        $body = $this->option('message-file')
            ? trim((string) file_get_contents($this->option('message-file')))
            : trim((string) $this->option('message'));

        if ($body === '') {
            $this->error('Provide --message or --message-file.');

            return self::FAILURE;
        }

        $phones = collect(file($phonesPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES))
            ->map(fn ($line) => preg_replace('/\D+/', '', trim($line)))
            ->filter(fn ($n) => is_string($n) && strlen($n) >= 9)
            ->unique()
            ->values()
            ->all();

        $this->info('Recipients: '.count($phones));
        $this->info('Message length: '.strlen($body).' chars');
        $this->info('Driver: '.config('sms.default'));
        $this->info('Sender: '.(config('sms.drivers.nextsms.sender_id') ?: config('sms.from')));
        $this->info('Sandbox: '.(config('sms.drivers.nextsms.sandbox') ? 'yes' : 'no'));
        $this->info('SMS enabled: '.($sms->isEnabled() ? 'yes' : 'no'));

        if ($this->option('dry-run')) {
            $this->warn('Dry run — nothing sent.');
            $this->line(implode(', ', array_slice($phones, 0, 5)).(count($phones) > 5 ? ', …' : ''));

            return self::SUCCESS;
        }

        if (! $this->option('force')) {
            $this->error('Refusing to send without --force (use --dry-run first).');

            return self::FAILURE;
        }

        if (! $sms->isEnabled()) {
            $this->error('SMS is disabled (sms_enabled setting).');

            return self::FAILURE;
        }

        $this->warn('Sending now…');

        $result = $sms->sendMany($phones, $body, [
            'type'   => 'manual_blast',
            'source' => basename($phonesPath),
        ]);

        $ok = $result->sentCount();
        $fail = $result->failedCount();

        foreach ($result->byRecipient as $phone => $item) {
            if (! $item->success) {
                $this->line("<fg=red>FAIL {$phone}</>: ".($item->error ?? 'unknown'));
            }
        }

        if ($result->error) {
            $this->error('Bulk error: '.$result->error);
        }

        $this->info("Done. Success: {$ok}, Failed: {$fail}");

        return $fail > 0 && $ok === 0 ? self::FAILURE : self::SUCCESS;
    }
}
