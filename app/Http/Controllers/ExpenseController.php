<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    const CATEGORIES = ['Transport', 'Branding', 'Packaging', 'Salaries', 'Utilities', 'Maintenance', 'Other'];

    public function index(Request $request): JsonResponse
    {
        $query = Expense::with('user:id,name')->orderByDesc('expense_date')->orderByDesc('created_at');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->to);
        }
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $paginated = $query->paginate(25);

        $summaryQuery = Expense::query();
        if ($request->filled('category')) $summaryQuery->where('category', $request->category);
        if ($request->filled('from'))     $summaryQuery->whereDate('expense_date', '>=', $request->from);
        if ($request->filled('to'))       $summaryQuery->whereDate('expense_date', '<=', $request->to);
        if ($request->filled('search'))   $summaryQuery->where('description', 'like', '%' . $request->search . '%');

        $totalAmount = $summaryQuery->sum('amount');

        $byCategory = $summaryQuery->selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        return response()->json([
            'data'         => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'total'        => $paginated->total(),
            'summary'      => [
                'total_amount' => (int) $totalAmount,
                'by_category'  => $byCategory,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'description'  => 'required|string|max:255',
            'amount'       => 'required|integer|min:1',
            'category'     => 'required|string|in:' . implode(',', self::CATEGORIES),
            'expense_date' => 'required|date',
            'note'         => 'nullable|string|max:1000',
        ]);

        $data['user_id'] = $request->user()->id;

        $expense = Expense::create($data);

        return response()->json(['data' => $expense->load('user:id,name')], 201);
    }

    public function show(Expense $expense): JsonResponse
    {
        return response()->json(['data' => $expense->load('user:id,name')]);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $data = $request->validate([
            'description'  => 'sometimes|string|max:255',
            'amount'       => 'sometimes|integer|min:1',
            'category'     => 'sometimes|string|in:' . implode(',', self::CATEGORIES),
            'expense_date' => 'sometimes|date',
            'note'         => 'nullable|string|max:1000',
        ]);

        $expense->update($data);

        return response()->json(['data' => $expense->load('user:id,name')]);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();
        return response()->json(null, 204);
    }
}
