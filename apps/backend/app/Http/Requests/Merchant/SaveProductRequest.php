<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class SaveProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:200'],
            'description' => ['nullable', 'string', 'max:1000'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'category_id' => ['nullable', 'string'],
            'category_name' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'image_url' => ['nullable', 'string'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'servings_count' => ['nullable', 'string', 'max:50'],
            'requires_preorder' => ['nullable', 'boolean'],
            'is_available' => ['nullable', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['required_with:variants', 'string', 'max:100'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0'],
            'modifier_group_ids' => ['nullable', 'array'],
            'modifier_group_ids.*' => ['string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الطبق / المنتج مطلوب.',
            'base_price.required' => 'سعر الطبق الأساسي مطلوب.',
            'base_price.numeric' => 'سعر الطبق يجب أن يكون رقماً صحيحاً.',
        ];
    }
}
