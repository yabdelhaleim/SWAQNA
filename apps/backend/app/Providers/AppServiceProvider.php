<?php

namespace App\Providers;

use App\Events\ReelLiked;
use App\Events\ReelSaved;
use App\Listeners\SendReelInteractionNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(ReelLiked::class, [SendReelInteractionNotification::class, 'handleReelLiked']);
        Event::listen(ReelSaved::class, [SendReelInteractionNotification::class, 'handleReelSaved']);
    }
}
