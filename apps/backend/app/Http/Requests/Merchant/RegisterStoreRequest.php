<?php

namespace App\Http\Requests\Merchant;

use App\Enums\MerchantType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'store_name' => [
                'required',
                'string',
                'min:3',
                'max:150',
            ],
            'merchant_type' => [
                'required',
                Rule::enum(MerchantType::class),
            ],
            'address_text' => [
                'required',
                'string',
                'min:5',
                'max:300',
            ],
            'latitude' => [
                'nullable',
                'numeric',
                'between:-90,90',
            ],
            'longitude' => [
                'nullable',
                'numeric',
                'between:-180,180',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'store_name.required' => 'اسم المتجر أو النشاط مطلوب.',
            'store_name.min' => 'اسم المتجر يجب ألا يقل عن 3 أحرف.',
            'merchant_type.required' => 'نوع النشاط التجاري مطلوب.',
            'merchant_type.Illuminate\Validation\Rules\Enum' => 'نوع النشاط غير صالح (يجب أن يكون مطعم أو محل أو مطبخ منزلي).',
            'address_text.required' => 'عنوان المتجر أو المنطقة مطلوب.',
        ];
    }
}
