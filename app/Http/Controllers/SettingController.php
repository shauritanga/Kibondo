<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function socialLinks(): JsonResponse
    {
        $links = json_decode(Setting::get('social_links', '[]'), true) ?? [];
        return response()->json($links);
    }

    public function index(): JsonResponse
    {
        $links = json_decode(Setting::get('social_links', '[]'), true) ?? [];
        return response()->json(['social_links' => $links]);
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

    public function getSms(): JsonResponse
    {
        return response()->json([
            'enabled' => Setting::get('sms_enabled', '1') !== '0',
            'driver'  => config('sms.default'),
            'from'    => config('sms.from'),
        ]);
    }

    public function updateSms(Request $request): JsonResponse
    {
        $request->validate(['enabled' => 'required|boolean']);
        Setting::set('sms_enabled', $request->boolean('enabled') ? '1' : '0');

        return response()->json(['message' => 'SMS settings saved.']);
    }

    public function testSms(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string|max:30']);

        $result = app(\App\Services\SmsService::class)->send(
            $request->phone,
            'Kibondo test SMS — your SMS integration is working.',
            ['type' => 'settings_test', 'user_id' => $request->user()->id]
        );

        if (! $result->success) {
            return response()->json([
                'message' => 'SMS send failed: ' . ($result->error ?? 'unknown error'),
            ], 422);
        }

        return response()->json([
            'message'              => 'Test SMS sent.',
            'provider_message_id'  => $result->providerMessageId,
        ]);
    }
}
