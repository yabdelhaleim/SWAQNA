<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class SendOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // التحقق من صيغة الهاتف المصري: 11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015
            'phone_number' => [
                'required',
                'string',
                'regex:/^(010|011|012|015)[0-9]{8}$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'phone_number.required' => 'رقم الهاتف مطلوب.',
            'phone_number.regex' => 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقم.',
        ];
    }
}
