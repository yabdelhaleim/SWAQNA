<?php

namespace App\Http\Requests\Merchant;

use App\Enums\DeliveryFulfillmentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class RequestFulfillmentChangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'requested_fulfillment_type' => ['required', new Enum(DeliveryFulfillmentType::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'requested_fulfillment_type.required' => 'نوع التوصيل المطلوب اختياره.',
        ];
    }
}
