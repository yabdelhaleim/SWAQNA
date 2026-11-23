<?php

namespace App\Http\Controllers\Api\v1\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    /**
     * Display a listing of customer addresses.
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = CustomerAddress::where('user_id', $request->user()->id)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addresses,
        ]);
    }

    /**
     * Store a newly created address.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'label' => 'nullable|string|in:home,work,other',
            'city' => 'nullable|string|max:100',
            'area' => 'required|string|max:150',
            'street' => 'required|string|max:200',
            'building' => 'nullable|string|max:100',
            'floor' => 'nullable|string|max:50',
            'apartment' => 'nullable|string|max:50',
            'landmark' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'is_default' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $isFirst = CustomerAddress::where('user_id', $user->id)->count() === 0;
        $isDefault = $isFirst || !empty($validated['is_default']);

        return DB::transaction(function () use ($user, $validated, $isDefault) {
            if ($isDefault) {
                CustomerAddress::where('user_id', $user->id)->update(['is_default' => false]);
            }

            $address = CustomerAddress::create([
                'user_id' => $user->id,
                'title' => $validated['title'],
                'label' => $validated['label'] ?? 'home',
                'city' => $validated['city'] ?? 'القاهرة',
                'area' => $validated['area'],
                'street' => $validated['street'],
                'building' => $validated['building'] ?? null,
                'floor' => $validated['floor'] ?? null,
                'apartment' => $validated['apartment'] ?? null,
                'landmark' => $validated['landmark'] ?? null,
                'phone' => $validated['phone'] ?? $user->phone_number,
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'is_default' => $isDefault,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم حفظ العنوان بنجاح ✨',
                'data' => $address,
            ], 201);
        });
    }

    /**
     * Update the specified address.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:100',
            'label' => 'nullable|string|in:home,work,other',
            'city' => 'nullable|string|max:100',
            'area' => 'sometimes|required|string|max:150',
            'street' => 'sometimes|required|string|max:200',
            'building' => 'nullable|string|max:100',
            'floor' => 'nullable|string|max:50',
            'apartment' => 'nullable|string|max:50',
            'landmark' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'is_default' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($address, $validated, $request) {
            if (!empty($validated['is_default'])) {
                CustomerAddress::where('user_id', $request->user()->id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }

            $address->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'تم تحديث العنوان بنجاح 📍',
                'data' => $address->fresh(),
            ]);
        });
    }

    /**
     * Remove the specified address.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $wasDefault = $address->is_default;
        $address->delete();

        // If the deleted address was default, promote the newest remaining address
        if ($wasDefault) {
            $nextAddress = CustomerAddress::where('user_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($nextAddress) {
                $nextAddress->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تم حذف العنوان بنجاح',
        ]);
    }

    /**
     * Mark an address as the default.
     */
    public function setDefault(Request $request, string $id): JsonResponse
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        DB::transaction(function () use ($address, $request) {
            CustomerAddress::where('user_id', $request->user()->id)
                ->update(['is_default' => false]);

            $address->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => 'تم تعيين العنوان كافتراضي 🌟',
            'data' => $address->fresh(),
        ]);
    }
}
