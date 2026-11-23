<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$m = App\Models\Merchant::with('owner')->first();
$p = App\Models\Product::where('merchant_id', $m->id)->first() ?? App\Models\Product::first();
echo "Merchant ID: " . $m->id . "\n";
echo "Product ID: " . $p->id . "\n";
echo "Product Name: " . $p->name . "\n";
echo "Product Merchant ID: " . $p->merchant_id . "\n";
