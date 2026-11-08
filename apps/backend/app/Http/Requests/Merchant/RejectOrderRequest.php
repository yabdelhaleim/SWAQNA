<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class RejectOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'سبب الرفض مطلوب',
            'rejection_reason.min'      => 'سبب الرفض يجب أن يكون على الأقل 5 أحرف',
            'rejection_reason.max'      => 'سبب الرفض يجب ألا يتجاوز 500 حرف',
        ];
    }
}
