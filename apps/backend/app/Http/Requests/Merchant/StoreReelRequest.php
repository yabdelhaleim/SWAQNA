<?php

namespace App\Http\Requests\Merchant;

use Illuminate\Foundation\Http\FormRequest;

class StoreReelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'            => ['required', 'string', 'min:3', 'max:150'],
            'caption'          => ['nullable', 'string', 'max:1000'],
            'product_id'       => ['nullable', 'uuid', 'exists:products,id'],
            'video'            => ['required_without:video_url', 'nullable', 'file', 'mimes:mp4,mov,webm', 'max:51200'],
            'video_url'        => ['required_without:video', 'nullable', 'string', 'url'],
            'thumbnail'        => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'thumbnail_url'    => ['nullable', 'string', 'url'],
            'duration_seconds' => ['nullable', 'integer', 'min:3', 'max:180'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required'        => 'عنوان الفيديو مطلوب',
            'title.min'             => 'عنوان الفيديو يجب أن يكون 3 أحرف على الأقل',
            'title.max'             => 'عنوان الفيديو لا يجب أن يتجاوز 150 حرفاً',
            'product_id.exists'     => 'الطبق أو الوجبة المحددة غير موجودة',
            'video.required_without'=> 'يرجى رفع ملف فيديو أو إدخال رابط الفيديو',
            'video.mimes'           => 'صيغة الفيديو يجب أن تكون MP4 أو MOV أو WebM',
            'video.max'             => 'أقصى حجم مسموح للفيديو هو 50 ميجابايت',
            'thumbnail.mimes'       => 'صيغة الصورة المصغرة يجب أن تكون JPG أو PNG أو WebP',
        ];
    }
}
