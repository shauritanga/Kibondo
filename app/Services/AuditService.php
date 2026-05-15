<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditService
{
    private const SENSITIVE = [
        'password', 'password_confirmation', 'token', 'access_token',
        'refresh_token', 'otp', 'secret', 'api_key', 'private_key',
        'remember_token', 'two_factor_secret', 'two_factor_recovery_codes',
    ];

    public static function log(array $params): void
    {
        try {
            $user = auth()->user();

            AuditLog::create([
                'user_id'     => $params['user_id']    ?? $user?->id,
                'user_name'   => $params['user_name']  ?? $user?->name,
                'user_email'  => $params['user_email'] ?? $user?->email,
                'user_role'   => $params['user_role']  ?? $user?->role,
                'action'      => $params['action'],
                'module'      => $params['module'],
                'description' => $params['description'] ?? null,
                'record_id'   => $params['record_id']   ?? null,
                'table_name'  => $params['table_name']  ?? null,
                'old_values'  => isset($params['old_values'])
                    ? self::strip((array) $params['old_values']) : null,
                'new_values'  => isset($params['new_values'])
                    ? self::strip((array) $params['new_values']) : null,
                'metadata'    => $params['metadata'] ?? null,
                'ip_address'  => request()->ip(),
                'user_agent'  => request()->userAgent(),
                'status'      => $params['status'] ?? 'success',
            ]);
        } catch (\Throwable) {
            // Never let audit logging break the main request
        }
    }

    private static function strip(array $data): array
    {
        return array_diff_key($data, array_flip(self::SENSITIVE));
    }
}
