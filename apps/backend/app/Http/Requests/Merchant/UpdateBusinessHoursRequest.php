<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBusinessHoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'hours' => ['required', 'array', 'min:1', 'max:7'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'hours.*.open_time' => ['required', 'string'],
            'hours.*.close_time' => ['required', 'string'],
            'hours.*.is_closed' => ['required', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'hours.required' => 'قائمة ساعات العمل مطلوبة.',
            'hours.*.day_of_week.required' => 'يوم العمل مطلوب.',
            'hours.*.open_time.required' => 'وقت الفتح مطلوب.',
            'hours.*.close_time.required' => 'وقت الإغلاق مطلوب.',
        ];
    }
}
