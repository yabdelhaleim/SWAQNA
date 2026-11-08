<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class UploadMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:logo,cover'],
            'image' => ['required', 'file', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'], // Max 5MB
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'نوع الصورة مطلوب (logo أو cover).',
            'type.in' => 'نوع الصورة يجب أن يكون شعار المتجر logo أو غلاف المتجر cover.',
            'image.required' => 'ملف الصورة مطلوب.',
            'image.image' => 'الملف يجب أن يكون صورة صالحة.',
            'image.mimes' => 'صيغ الصور المدعومة هي: jpeg, png, jpg, webp.',
            'image.max' => 'أقصى حجم مسموح به للصورة هو 5 ميجابايت.',
        ];
    }
}
