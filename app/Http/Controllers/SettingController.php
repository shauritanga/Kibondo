<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const COMPANY_DEFAULTS = [
        'name'    => 'Kibondo Green Farm',
        'phone'   => '+255 655 591 660',
        'email'   => 'sales@kibondo.co.tz',
        'address' => '',
        'city'    => 'Dar es Salaam',
        'country' => 'Tanzania',
    ];

    private function companySettings(): array
    {
        return collect(self::COMPANY_DEFAULTS)
            ->mapWithKeys(fn (string $default, string $field) => [
                $field => Setting::get("company_{$field}", $default),
            ])
            ->all();
    }

    public function socialLinks(): JsonResponse
    {
        $links = json_decode(Setting::get('social_links', '[]'), true) ?? [];
        return response()->json($links);
    }

    public function company(): JsonResponse
    {
        return response()->json($this->companySettings());
    }

    public function index(): JsonResponse
    {
        $links = json_decode(Setting::get('social_links', '[]'), true) ?? [];
        return response()->json([
            'social_links' => $links,
            'company'      => $this->companySettings(),
        ]);
    }

    public function updateSocialLinks(Request $request): JsonResponse
    {
        $request->validate([
            'links'           => 'required|array',
            'links.*.label'   => 'required|string|max:50',
            'links.*.url'     => 'required|url|max:500',
        ]);

        Setting::set('social_links', json_encode($request->links));

        return response()->json(['message' => 'Social links saved.']);
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:120',
            'phone'   => 'nullable|string|max:40',
            'email'   => 'nullable|email|max:180',
            'address' => 'nullable|string|max:255',
            'city'    => 'nullable|string|max:120',
            'country' => 'nullable|string|max:120',
        ]);

        foreach (array_keys(self::COMPANY_DEFAULTS) as $field) {
            Setting::set("company_{$field}", (string) ($validated[$field] ?? ''));
        }

        return response()->json([
            'message' => 'Company information saved.',
            'company' => $this->companySettings(),
        ]);
    }

    public function getPromo(): JsonResponse
    {
        return response()->json(['promo_percentage' => (int) Setting::get('promo_percentage', '0')]);
    }

    public function updatePromo(Request $request): JsonResponse
    {
        $request->validate(['promo_percentage' => 'required|integer|min:0|max:99']);
        Setting::set('promo_percentage', (string) $request->promo_percentage);
        return response()->json(['message' => 'Promo updated.']);
    }

    public function getSecurity(): JsonResponse
    {
        return response()->json([
            'require_2fa_for_admins' => Setting::get('require_2fa_for_admins', '0') === '1',
        ]);
    }

    public function updateSecurity(Request $request): JsonResponse
    {
        $request->validate(['require_2fa_for_admins' => 'required|boolean']);
        Setting::set('require_2fa_for_admins', $request->boolean('require_2fa_for_admins') ? '1' : '0');
        return response()->json(['message' => 'Security settings saved.']);
    }
}
