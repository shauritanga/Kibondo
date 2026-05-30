<?php

namespace Tests\Unit;

use App\Services\Sms\PhoneNumber;
use PHPUnit\Framework\TestCase;

class PhoneNumberTest extends TestCase
{
    public function test_it_normalizes_tanzanian_phone_numbers(): void
    {
        $this->assertSame('+255712345678', PhoneNumber::normalize('0712 345 678'));
        $this->assertSame('+255712345678', PhoneNumber::normalize('712345678'));
        $this->assertSame('+255712345678', PhoneNumber::normalize('255712345678'));
        $this->assertSame('+255712345678', PhoneNumber::normalize('+255 712 345 678'));
    }

    public function test_it_returns_null_for_blank_phone_numbers(): void
    {
        $this->assertNull(PhoneNumber::normalize(null));
        $this->assertNull(PhoneNumber::normalize(''));
        $this->assertNull(PhoneNumber::normalize('   '));
    }
}
