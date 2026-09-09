<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class OtpService
{
    /**
     * Create a challenge OTP stored in cache.
     *
     * @return array{code: string, challenge_token: string}
     */
    public function issue(string $purpose, array $payload, int $ttlMinutes = 10): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $challengeToken = Str::uuid()->toString();

        Cache::put($this->key($purpose, $challengeToken), array_merge($payload, [
            'otp_hash' => hash('sha256', $code),
            'purpose'  => $purpose,
        ]), now()->addMinutes($ttlMinutes));

        return ['code' => $code, 'challenge_token' => $challengeToken];
    }

    /**
     * Issue OTP keyed by a stable identifier (e.g. phone) instead of a challenge token.
     *
     * @return array{code: string, cache_key: string}
     */
    public function issueForKey(string $purpose, string $identifier, array $payload = [], int $ttlMinutes = 10): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $cacheKey = $this->key($purpose, $identifier);

        Cache::put($cacheKey, array_merge($payload, [
            'otp_hash' => hash('sha256', $code),
            'purpose'  => $purpose,
        ]), now()->addMinutes($ttlMinutes));

        Cache::forget($this->attemptsKey($purpose, $identifier));

        return ['code' => $code, 'cache_key' => $cacheKey];
    }

    /**
     * @return array{ok: bool, payload?: array, message?: string}
     */
    public function verify(string $purpose, string $challengeToken, string $code, ?string $expectedIp = null, int $maxAttempts = 5): array
    {
        $cacheKey = $this->key($purpose, $challengeToken);
        $payload = Cache::get($cacheKey);

        if (! $payload) {
            return ['ok' => false, 'message' => 'Code expired. Please request a new one.'];
        }

        if ($expectedIp !== null && ($payload['ip'] ?? null) !== $expectedIp) {
            Cache::forget($cacheKey);
            return ['ok' => false, 'message' => 'Session mismatch. Please try again.'];
        }

        $attemptsKey = $this->attemptsKey($purpose, $challengeToken);
        $attempts = (int) Cache::get($attemptsKey, 0);

        if ($attempts >= $maxAttempts) {
            Cache::forget($cacheKey);
            return ['ok' => false, 'message' => 'Too many attempts. Please request a new code.'];
        }

        if (! hash_equals($payload['otp_hash'], hash('sha256', $code))) {
            Cache::put($attemptsKey, $attempts + 1, now()->addMinutes(10));

            return ['ok' => false, 'message' => 'Invalid code. Please try again.'];
        }

        Cache::forget($cacheKey);
        Cache::forget($attemptsKey);

        return ['ok' => true, 'payload' => $payload];
    }

    /**
     * Verify OTP keyed by identifier (phone).
     *
     * @return array{ok: bool, payload?: array, message?: string}
     */
    public function verifyForKey(string $purpose, string $identifier, string $code, int $maxAttempts = 5): array
    {
        return $this->verify($purpose, $identifier, $code, null, $maxAttempts);
    }

    private function key(string $purpose, string $id): string
    {
        return "otp:{$purpose}:{$id}";
    }

    private function attemptsKey(string $purpose, string $id): string
    {
        return "otp_attempts:{$purpose}:{$id}";
    }
}
