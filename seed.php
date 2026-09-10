php artisan tinker --execute="
  \App\Models\User::create([
      'name'     => 'Haji Saidi',
      'email'    => 'hajisaidi@yahoo.com',
      'password' => bcrypt('admin123'),
      'role'     => 'admin',
  ]);
  echo 'User created';
  "