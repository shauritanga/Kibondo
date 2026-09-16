<?php

namespace Tests\Unit;

use App\Support\PhoneNumber;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PhoneNumberTest extends TestCase
{
    #[DataProvider('validNumbers')]
    public function test_normalizes_valid_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, PhoneNumber::normalize($input));
    }

    public static function validNumbers(): array
    {
        return [
            ['0712345678', '255712345678'],
            ['712345678', '255712345678'],
            ['+255712345678', '255712345678'],
            ['255712345678', '255712345678'],
            ['+255 712 345 678', '255712345678'],
            ['0 712 345 678', '255712345678'],
        ];
    }

    public function test_rejects_invalid_numbers(): void
    {
        $this->assertNull(PhoneNumber::normalize('123'));
        $this->assertNull(PhoneNumber::normalize(''));
        $this->assertNull(PhoneNumber::normalize(null));
        $this->assertNull(PhoneNumber::normalize('+254712345678'));
    }
}
