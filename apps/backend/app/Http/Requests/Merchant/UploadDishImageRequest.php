<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class UploadDishImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'], // Max 5MB
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'ملف صورة الطبق مطلوب.',
            'image.image' => 'الملف يجب أن يكون صورة صالحة.',
            'image.mimes' => 'صيغ الصور المدعومة هي: jpeg, png, jpg, webp.',
            'image.max' => 'أقصى حجم مسموح به للصورة هو 5 ميجابايت.',
        ];
    }
}
