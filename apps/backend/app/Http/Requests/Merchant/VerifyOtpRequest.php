<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone_number' => [
                'required',
                'string',
                'regex:/^(010|011|012|015)[0-9]{8}$/',
            ],
            'code' => [
                'required',
                'string',
                'size:4',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'phone_number.required' => 'رقم الهاتف مطلوب.',
            'code.required' => 'كود التحقق مطلوب.',
            'code.size' => 'كود التحقق يجب أن يتكون من 4 أرقام بالضبط.',
        ];
    }
}
