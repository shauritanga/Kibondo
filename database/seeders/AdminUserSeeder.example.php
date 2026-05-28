<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Copy to AdminUserSeeder.php (gitignored) and set your credentials.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name'      => 'Admin',
                'password'  => 'change-me',
                'role'      => 'admin',
                'is_active' => true,
            ],
        );
    }
}
