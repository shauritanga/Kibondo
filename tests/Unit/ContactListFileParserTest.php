<?php

namespace Tests\Unit;

use App\Support\ContactListFileParser;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ContactListFileParserTest extends TestCase
{
    public function test_parses_thursday_style_xlsx(): void
    {
        $path = base_path('Thursday.xlsx');
        if (! is_readable($path)) {
            $this->markTestSkipped('Thursday.xlsx not present');
        }

        $rows = app(ContactListFileParser::class)->parse($path);

        $this->assertGreaterThan(600, count($rows));
        $this->assertSame('255744766324', $rows[0]['phone']);
        $this->assertNotEmpty($rows[0]['name']);
    }

    public function test_parses_csv_with_header(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'list.csv',
            "Number,Name\n0753383840,Test User\n"
        );

        $rows = app(ContactListFileParser::class)->parse($file);

        $this->assertCount(1, $rows);
        $this->assertSame('255753383840', $rows[0]['phone']);
        $this->assertSame('Test User', $rows[0]['name']);
    }
}
