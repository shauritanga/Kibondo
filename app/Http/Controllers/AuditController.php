<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditController extends Controller
{
    private const ALLOWED_SORT   = ['created_at', 'user_name', 'action', 'module', 'status'];
    private const ALLOWED_PER_PAGE = [10, 25, 50, 100];

    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query();

        // Full-text search across key columns
        if ($search = $request->filled('search') ? $request->search : null) {
            $query->where(function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where('user_name',   'ilike', $like)
                  ->orWhere('user_email', 'ilike', $like)
                  ->orWhere('action',     'ilike', $like)
                  ->orWhere('module',     'ilike', $like)
                  ->orWhere('description','ilike', $like)
                  ->orWhere('ip_address', 'ilike', $like)
                  ->orWhere('record_id',  'ilike', $like);
            });
        }

        // Date range filter
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        // Exact filters
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortBy  = in_array($request->sort_by, self::ALLOWED_SORT) ? $request->sort_by : 'created_at';
        $sortDir = $request->sort_dir === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // Pagination
        $perPage = in_array((int) $request->per_page, self::ALLOWED_PER_PAGE)
            ? (int) $request->per_page
            : 25;

        return response()->json($query->paginate($perPage));
    }

    public function show(AuditLog $auditLog): JsonResponse
    {
        return response()->json(['data' => $auditLog]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = AuditLog::query();

        if ($search = $request->filled('search') ? $request->search : null) {
            $query->where(function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where('user_name',    'ilike', $like)
                  ->orWhere('user_email', 'ilike', $like)
                  ->orWhere('action',     'ilike', $like)
                  ->orWhere('module',     'ilike', $like)
                  ->orWhere('description','ilike', $like)
                  ->orWhere('ip_address', 'ilike', $like)
                  ->orWhere('record_id',  'ilike', $like);
            });
        }

        if ($request->filled('from'))    $query->whereDate('created_at', '>=', $request->from);
        if ($request->filled('to'))      $query->whereDate('created_at', '<=', $request->to);
        if ($request->filled('user_id')) $query->where('user_id', $request->user_id);
        if ($request->filled('action'))  $query->where('action',  $request->action);
        if ($request->filled('module'))  $query->where('module',  $request->module);
        if ($request->filled('status'))  $query->where('status',  $request->status);

        $query->orderBy('created_at', 'desc');

        $filename = 'audit_logs_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'ID', 'Date', 'User', 'Email', 'Role',
                'Action', 'Module', 'Description',
                'Record ID', 'Table', 'IP Address', 'Status',
            ]);

            $query->chunk(500, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->id,
                        $log->created_at?->format('Y-m-d H:i:s'),
                        $log->user_name,
                        $log->user_email,
                        $log->user_role,
                        $log->action,
                        $log->module,
                        $log->description,
                        $log->record_id,
                        $log->table_name,
                        $log->ip_address,
                        $log->status,
                    ]);
                }
            });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
