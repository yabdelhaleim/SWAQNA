"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  X, Play, Volume2, VolumeX, Upload, Film, Sparkles, Heart,
  Eye, Share2, AlertCircle, Clock, Link as LinkIcon, Loader2, Check,
} from "lucide-react";
import { merchantApi } from "@/lib/api";

interface DishItem {
  id: string;
  name: string;
  description: string;
  base_price: number;
  category_name?: string;
  image_url?: string;
  reel_url?: string;
  reel_title?: string;
  reel_likes?: number;
  reel_views?: number;
}

interface ReelModalProps {
  isOpen: boolean;
  mode: "upload" | "watch";
  dish: DishItem | null;
  token: string;
  onClose: () => void;
  onReelSaved: (dishId: string, reelData: any) => void;
}

export default function ReelModal({
  isOpen,
  mode: initialMode,
  dish,
  token,
  onClose,
  onReelSaved,
}: ReelModalProps) {
  const [currentMode, setCurrentMode] = useState<"upload" | "watch">(initialMode);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState<string>("");
  const [useUrlMode, setUseUrlMode] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Watch Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(1280);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (dish) {
      setTitle(`طريقة وسر تحضير ${dish.name} الفاخر`);
      setCaption(`أقوى لقطة وتفاصيل بالطشة البلدي على أصولها! 😍 #سوقنا #${dish.category_name || "أكل_بيتي"} #مصر`);
      if (dish.reel_url) {
        setDirectVideoUrl(dish.reel_url);
      }
      setLikesCount(dish.reel_likes || 1280);
    }
  }, [dish]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  if (!isOpen || !dish) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("يرجى اختيار ملف فيديو صالح (MP4, WebM, MOV).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("حجم الفيديو يجب ألا يتجاوز 50 ميجابايت.");
      return;
    }

    setError(null);
    setVideoFile(file);

    if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setVideoPreviewUrl(preview);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.round(videoRef.current.duration);
      if (dur > 0) setDuration(dur);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("يرجى إدخال عنوان جذاب للفيديو.");
      return;
    }

    if (!videoFile && !directVideoUrl.trim()) {
      setError("يرجى رفع ملف فيديو أو إدخال رابط فيديو صالح.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("caption", caption);
      if (dish?.id) {
        formData.append("product_id", dish.id);
      }
      formData.append("price", String(dish?.base_price || 149));
      formData.append("duration_seconds", String(duration));

      if (videoFile) {
        formData.append("video", videoFile);
      } else {
        formData.append("video_url", directVideoUrl.trim());
      }

      const res = await merchantApi.uploadReel(token, formData);

      if (!res?.success || !res.reel) {
        const firstFieldErr = res?.errors ? Object.values(res.errors).flat()[0] : null;
        setError(firstFieldErr || res?.message || "فشل رفع الفيديو للسيرفر. تأكد من الصلاحيات وحجم الفيديو.");
        return;
      }

      const savedReel = {
        id: res.reel.id,
        video_url: res.reel.video_url || directVideoUrl,
        title: res.reel.title || title,
        caption: res.reel.caption || caption,
        duration_seconds: res.reel.duration_seconds || duration,
        likes_count: res.reel.likes_count || 0,
        views_count: res.reel.views_count || 0,
      };

      onReelSaved(dish.id, savedReel);
      onClose();
    } catch (err: any) {
      setError(err?.message || "تعذر الاتصال بالسيرفر أثناء رفع الفيديو. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const sampleVideoUrl =
    dish.reel_url ||
    directVideoUrl ||
    videoPreviewUrl ||
    "https://assets.mixkit.co/videos/preview/mixkit-top-shot-of-a-dish-with-curry-and-rice-42407-large.mp4";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in" dir="rtl">
      <div className="card-glass border border-souqna-gold/25 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col md:flex-row text-right relative">
        {/* Close Button Top Left */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-40 w-9 h-9 rounded-full bg-souqna-surface/80 hover:bg-souqna-surface text-souqna-text-secondary hover:text-white flex items-center justify-center backdrop-blur-md transition-colors border border-souqna-border"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Smartphone Preview Frame */}
        <div className="md:w-5/12 bg-souqna-base/80 p-5 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-l border-souqna-border">
          <div className="relative w-[230px] sm:w-[250px] aspect-[9/16] bg-black rounded-[36px] p-2.5 shadow-2xl border-4 border-souqna-border flex flex-col justify-between overflow-hidden">
            {/* Phone Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-stone-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-stone-800"></div>
            </div>

            {/* Video Player */}
            <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-black flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={sampleVideoUrl}
                playsInline
                loop
                autoPlay
                muted={isMuted}
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full h-full object-cover"
              />

              {!isPlaying && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <div className="w-14 h-14 rounded-full bg-souqna-gold/30 backdrop-blur-md border border-souqna-gold/50 flex items-center justify-center text-souqna-gold shadow-xl">
                    <Play className="w-7 h-7 fill-souqna-gold translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Mute Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute top-8 left-3 z-30 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Engagement Rail */}
              <div className="absolute bottom-20 left-2.5 z-20 flex flex-col items-center gap-3 text-white text-xs font-bold drop-shadow-md">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLiked(!liked);
                    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
                  }}
                  className="flex flex-col items-center gap-1 group/btn"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                    liked ? "bg-red-600 text-white scale-110" : "bg-black/40 text-white"
                  }`}>
                    <Heart className={`w-5 h-5 ${liked ? "fill-white" : ""}`} />
                  </div>
                  <span className="text-[10px] font-mono">{likesCount.toLocaleString()}</span>
                </button>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                    <Eye className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono">4.6K</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono">مشاركة</span>
                </div>
              </div>

              {/* Bottom Info Gradient */}
              <div className="absolute bottom-0 inset-x-0 p-3 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 text-right text-white space-y-1">
                <span className="text-xs font-black drop-shadow block text-souqna-gold">
                  {title || dish.name}
                </span>
                <p className="text-[10px] text-stone-300 line-clamp-1 font-normal">
                  {caption}
                </p>

                {/* Floating Product Order Tag */}
                <div className="mt-2 p-1.5 rounded-xl bg-souqna-base/80 backdrop-blur-md border border-souqna-gold/30 flex items-center justify-between">
                  <span className="text-xs font-black text-souqna-gold font-mono">
                    {dish.base_price} ج.م
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white">{dish.name}</span>
                    <div className="w-5 h-5 rounded-md overflow-hidden relative">
                      <Image
                        src={dish.image_url || "/images/assets/dish-tagine.jpg"}
                        alt={dish.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="mt-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setCurrentMode("upload")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentMode === "upload"
                  ? "btn-gold text-xs py-1.5 px-4"
                  : "btn-ghost text-xs py-1.5 px-4 text-souqna-text-muted"
              }`}
            >
              ربط وتعديل الفيديو
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("watch")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentMode === "watch"
                  ? "bg-souqna-emerald text-souqna-base font-bold text-xs py-1.5 px-4"
                  : "btn-ghost text-xs py-1.5 px-4 text-souqna-text-muted"
              }`}
            >
              وضع العرض 📱
            </button>
          </div>
        </div>

        {/* Right Form / Details Column */}
        <div className="md:w-7/12 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-souqna-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-souqna-gold/15 text-souqna-gold flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-souqna-text-primary">
                    {currentMode === "upload" ? "ربط فيديو ريلز للمنتج" : "معاينة الريلز المباشر"}
                  </h3>
                  <span className="text-xs text-souqna-text-muted font-medium">
                    سوقنا يدعم الفيديو الرأسي لزيادة التفاعل والمبيعات اللحظية
                  </span>
                </div>
              </div>
            </div>

            {/* Product Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-souqna-gold/10 border border-souqna-gold/20 flex items-center justify-between mb-5">
              <span className="text-sm font-black text-souqna-gold">
                {dish.base_price} ج.م
              </span>
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-xs font-black text-souqna-text-primary block">{dish.name}</span>
                  <span className="text-[11px] text-souqna-text-muted font-semibold">
                    القسم: {dish.category_name || "عام"}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-souqna-border">
                  <Image
                    src={dish.image_url || "/images/assets/dish-tagine.jpg"}
                    alt={dish.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {currentMode === "upload" ? (
              <form onSubmit={handleSubmitReel} className="space-y-4 text-xs font-bold">
                {/* Video Source Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-souqna-text-primary">فيديو رأسي 9:16</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setUseUrlMode(false)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          !useUrlMode ? "bg-souqna-gold text-souqna-base font-bold" : "text-souqna-text-muted hover:text-white"
                        }`}
                      >
                        رفع ملف
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseUrlMode(true)}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          useUrlMode ? "bg-souqna-gold text-souqna-base font-bold" : "text-souqna-text-muted hover:text-white"
                        }`}
                      >
                        رابط (URL)
                      </button>
                    </div>
                  </div>

                  {!useUrlMode ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-souqna-border hover:border-souqna-gold/50 bg-souqna-surface/60 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-souqna-gold/15 text-souqna-gold flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-souqna-text-primary">
                        {videoFile ? videoFile.name : "اضغط لاختيار فيديو أو اسحبه إلى هنا"}
                      </span>
                      <span className="text-[10px] text-souqna-text-muted">
                        MP4, WebM, MOV (بحد أقصى 50MB ومدة 15 - 60 ثانية)
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="url"
                        value={directVideoUrl}
                        onChange={(e) => setDirectVideoUrl(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="input-dark w-full pr-9 text-left font-mono text-xs"
                        dir="ltr"
                      />
                      <LinkIcon className="w-4 h-4 text-souqna-gold absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-souqna-text-secondary">عنوان الريلز الجذاب</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: سر طشة الملوخية بالسمنة البلدي"
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-souqna-text-secondary">الوصف والهاشتاجات</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="اكتب وصفاً جذاباً وهاشتاجات..."
                    rows={2}
                    className="input-dark w-full resize-none"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-souqna-text-muted p-2.5 rounded-xl bg-souqna-surface border border-souqna-border">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-souqna-gold" />
                    المدة: {duration} ثانية
                  </span>
                  <span className="text-souqna-emerald font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    جاهز للنشر على خلاصة العملاء
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-gold py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                    <span>{loading ? "جاري الرفع..." : "نشر الريلز وربطه بالمنتج 🎬"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs font-bold">
                <div className="space-y-1">
                  <span className="text-souqna-text-muted text-[11px] block">عنوان الفيديو المنشور:</span>
                  <p className="text-sm font-black text-souqna-gold">{title || dish.name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-souqna-text-muted text-[11px] block">الوصف:</span>
                  <p className="text-xs text-souqna-text-secondary leading-relaxed bg-souqna-surface p-3 rounded-2xl border border-souqna-border">
                    {caption}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-souqna-gold/10 border border-souqna-gold/20 text-center">
                    <span className="text-lg font-black text-souqna-gold block font-mono">
                      {likesCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-souqna-text-muted font-bold">إجمالي الإعجابات</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-lg font-black text-blue-400 block font-mono">
                      4,620
                    </span>
                    <span className="text-[11px] text-souqna-text-muted font-bold">مشاهدات العملاء</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentMode("upload")}
                    className="flex-1 py-2.5 btn-gold text-xs"
                  >
                    تعديل بيانات الفيديو
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 btn-ghost rounded-xl text-xs font-bold"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
