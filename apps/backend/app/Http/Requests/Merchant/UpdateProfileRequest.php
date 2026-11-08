<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:200'],
            'address_text' => ['required', 'string', 'min:5', 'max:500'],
            'preparation_time_minutes' => ['required', 'integer', 'min:5', 'max:1440'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'delivery_radius_km' => ['nullable', 'numeric', 'min:0.5', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم المتجر مطلوب.',
            'name.min' => 'اسم المتجر يجب ألا يقل عن 3 أحرف.',
            'address_text.required' => 'العنوان التفصيلي مطلوب.',
            'preparation_time_minutes.required' => 'وقت التجهيز مطلوب.',
            'preparation_time_minutes.min' => 'وقت التجهيز لا يمكن أن يقل عن 5 دقائق.',
            'preparation_time_minutes.max' => 'أقصى وقت تجهيز مسموح به هو 1440 دقيقة (24 ساعة).',
        ];
    }
}
