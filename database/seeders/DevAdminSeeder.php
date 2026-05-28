<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Local/Docker admin account. Credentials come from env (see docker-compose.yml).
 * Not used in production unless SEED_DEV_ADMIN is explicitly enabled.
 */
class DevAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('DEV_ADMIN_EMAIL', 'admin@kibondo.local');

        User::updateOrCreate(
            ['email' => $email],
            [
                'name'      => env('DEV_ADMIN_NAME', 'Admin'),
                'password'  => env('DEV_ADMIN_PASSWORD', 'password'),
                'role'      => 'admin',
                'is_active' => true,
            ],
        );

        if ($this->command) {
            $this->command->info("Dev admin ready: {$email}");
        }
    }
}
