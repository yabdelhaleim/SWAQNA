<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['phone_number' => '01000000001'],
            [
                'email'             => 'admin@souqna.com',
                'full_name'         => 'يوسف عبد الحليم',
                'password'          => Hash::make('Admin@2026'),
                'role'              => UserRole::SUPER_ADMIN,
                'is_active'         => true,
                'is_phone_verified' => true,
            ]
        );
    }
}
