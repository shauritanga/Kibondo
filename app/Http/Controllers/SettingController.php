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
}
