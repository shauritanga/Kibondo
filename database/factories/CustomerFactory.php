<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'     => $this->faker->name(),
            'phone'    => $this->faker->unique()->numerify('+255 7## ### ###'),
            'email'    => $this->faker->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'type'     => 'retail',
        ];
    }
}
