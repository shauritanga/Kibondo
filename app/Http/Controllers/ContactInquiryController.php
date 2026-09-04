<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactInquiryRequest;
use App\Notifications\ContactInquiryNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ContactInquiryController extends Controller
{
    public function store(ContactInquiryRequest $request): JsonResponse
    {
        $success = ['message' => 'Thank you for your inquiry. We will contact you shortly.'];

        if (filled($request->input('website'))) {
            return response()->json($success);
        }

        $to = (string) config('services.contact.to');
        if ($to === '') {
            Log::error('MAIL_CONTACT_TO is not configured; contact inquiry dropped.');

            return response()->json(['message' => 'Unable to send your inquiry right now. Please try again later.'], 503);
        }

        Notification::route('mail', [$to => 'Kibondo Green Farm'])
            ->notify(new ContactInquiryNotification(
                firstName: $request->string('first_name')->toString(),
                lastName: $request->string('last_name')->toString(),
                phone: $request->string('phone')->toString(),
                email: $request->string('email')->toString(),
                message: $request->string('message')->toString(),
            ));

        return response()->json($success);
    }
}
