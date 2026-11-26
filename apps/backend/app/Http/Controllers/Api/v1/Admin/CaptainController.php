<?php

namespace App\Http\Controllers\Api\v1\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryCaptain;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptainController extends Controller
{
    public function index(): JsonResponse
    {
        $captains = DeliveryCaptain::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success'  => true,
            'captains' => $captains,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|min:2|max:150',
            'phone'        => 'required|string|min:8|max:20|unique:delivery_captains,phone',
            'vehicle_type' => 'required|in:MOTORCYCLE,CAR,BICYCLE',
            'current_zone' => 'nullable|string|max:150',
        ]);

        $captain = DeliveryCaptain::create([
            ...$validated,
            'status' => 'AVAILABLE',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة الكابتن بنجاح.',
            'captain' => $captain,
        ], 201);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:AVAILABLE,BUSY,OFFLINE',
        ]);

        $captain = DeliveryCaptain::findOrFail($id);
        $captain->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الكابتن.',
            'captain' => $captain,
        ]);
    }
}
