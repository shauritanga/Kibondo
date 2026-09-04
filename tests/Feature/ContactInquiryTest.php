<?php

namespace Tests\Feature;

use App\Notifications\ContactInquiryNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ContactInquiryTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Amina',
            'last_name'  => 'Juma',
            'phone'      => '+255767524210',
            'email'      => 'amina@example.com',
            'message'    => 'I would like to book a farm visit.',
        ], $overrides);
    }

    public function test_authorized_request_queues_inquiry_email(): void
    {
        Notification::fake();

        $this->withToken('testing-contact-secret')
            ->postJson('/api/v1/contact', $this->payload())
            ->assertOk()
            ->assertJsonPath('message', 'Thank you for your inquiry. We will contact you shortly.');

        Notification::assertSentOnDemand(
            ContactInquiryNotification::class,
            function (ContactInquiryNotification $notification) {
                return $notification->email === 'amina@example.com'
                    && $notification->firstName === 'Amina'
                    && $notification->phone === '+255767524210';
            }
        );
    }

    public function test_rejects_missing_secret(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/contact', $this->payload())
            ->assertUnauthorized();

        Notification::assertNothingSent();
    }

    public function test_rejects_invalid_secret(): void
    {
        Notification::fake();

        $this->withToken('wrong-secret')
            ->postJson('/api/v1/contact', $this->payload())
            ->assertUnauthorized();

        Notification::assertNothingSent();
    }

    public function test_validation_requires_core_fields(): void
    {
        $this->withToken('testing-contact-secret')
            ->postJson('/api/v1/contact', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name', 'phone', 'email']);
    }

    public function test_honeypot_succeeds_without_sending_mail(): void
    {
        Notification::fake();

        $this->withToken('testing-contact-secret')
            ->postJson('/api/v1/contact', $this->payload(['website' => 'http://spam.test']))
            ->assertOk();

        Notification::assertNothingSent();
    }
}
