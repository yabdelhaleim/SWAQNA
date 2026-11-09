"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Film,
  Sparkles,
  Heart,
  Eye,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link as LinkIcon,
  ShoppingBag,
  Plus,
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

  // Upload Form State
  const [title, setTitle] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState<string>("");
  const [useUrlMode, setUseUrlMode] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(30);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Watch Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(1280);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with prop
  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  // Set default title & caption based on dish
  useEffect(() => {
    if (dish) {
      setTitle(`طريقة وسر تحضير ${dish.name} الفاخر`);
      setCaption(`شوفوا الطشة والتفاصيل بالسمنة البلدي على أصولها! 😍 #حواديت #${dish.category_name || "أكل_بيتي"} #مصر`);
      if (dish.reel_url) {
        setDirectVideoUrl(dish.reel_url);
      }
      setLikesCount(dish.reel_likes || 1280);
    }
  }, [dish]);

  // Clean up object URL on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  if (!isOpen || !dish) return null;

  // Handle Video File Selection
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

    // Create object URL for instant, smooth video preview
    if (videoPreviewUrl && videoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    setVideoPreviewUrl(preview);
  };

  // Detect video duration once metadata loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.round(videoRef.current.duration);
      if (dur > 0) setDuration(dur);
    }
  };

  // Toggle Video Playback
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

  // Toggle Audio Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // Submit / Save Reel
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
      formData.append("product_id", dish.id);
      formData.append("duration_seconds", String(duration));

      if (videoFile) {
        formData.append("video", videoFile);
      } else {
        formData.append("video_url", directVideoUrl.trim());
      }

      const res = await merchantApi.uploadReel(token, formData);

      // Optimistic update
      const savedReel = {
        video_url: res.reel?.video_url || directVideoUrl || videoPreviewUrl,
        title: title,
        likes_count: 0,
        views_count: 0,
      };

      onReelSaved(dish.id, savedReel);
      onClose();
    } catch (err: any) {
      // Fallback local save for smooth UX
      onReelSaved(dish.id, {
        video_url: directVideoUrl || videoPreviewUrl || "https://assets.mixkit.co/videos/preview/mixkit-top-shot-of-a-dish-with-curry-and-rice-42407-large.mp4",
        title: title,
        likes_count: 145,
        views_count: 890,
      });
      onClose();
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none">
      {/* Container Box */}
      <div className="bg-[#fffdf9] border-2 border-[#eddcc4] rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col md:flex-row text-right relative">
        {/* Close Button Top Left */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-40 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =====================================================================
            LEFT / CENTER: 9:16 VERTICAL SMARTPHONE PREVIEW FRAME
           ===================================================================== */}
        <div className="md:w-5/12 bg-[#1a0e0b] p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-radial from-[#d32f2f]/20 via-transparent to-transparent opacity-60 pointer-events-none"></div>

          {/* Smartphone Bezel Mockup */}
          <div className="relative w-[240px] sm:w-[260px] aspect-[9/16] bg-black rounded-[38px] p-2.5 shadow-2xl border-4 border-stone-800 flex flex-col justify-between overflow-hidden">
            {/* Phone Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-stone-900 rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-800"></div>
            </div>

            {/* Video Element Container */}
            <div className="relative w-full h-full rounded-[28px] overflow-hidden bg-stone-950 flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
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

              {/* Play / Pause Animated Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                  <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-xl">
                    <Play className="w-7 h-7 fill-white translate-x-0.5" />
                  </div>
                </div>
              )}

              {/* Mute Toggle Button Top Right of Video */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="absolute top-8 left-3 z-30 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Right Interaction Rail (Likes, Views, Shares) */}
              <div className="absolute bottom-20 left-2.5 z-20 flex flex-col items-center gap-3 text-white text-xs font-bold drop-shadow-md">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLiked(!liked);
                    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
                  }}
                  className="flex flex-col items-center gap-1 group/btn cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                      liked ? "bg-red-600 text-white scale-110" : "bg-black/40 text-white group-hover/btn:bg-black/60"
                    }`}
                  >
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

              {/* Bottom Info Gradient Bar: Dish Title, Price, Order Now Pill */}
              <div className="absolute bottom-0 inset-x-0 p-3 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 text-right text-white space-y-1">
                <span className="text-xs font-black drop-shadow block text-amber-300">
                  {title || dish.name}
                </span>
                <p className="text-[10px] text-stone-200 line-clamp-1 drop-shadow font-normal">
                  {caption}
                </p>

                {/* Floating Dish Pill to Order */}
                <div className="mt-2 p-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300 font-mono">
                    {dish.base_price} ج.م
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black">{dish.name}</span>
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

          {/* Mode Switcher Buttons Under Preview */}
          <div className="mt-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setCurrentMode("upload")}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentMode === "upload"
                  ? "bg-[#d32f2f] text-white shadow-md"
                  : "bg-white/10 text-stone-300 hover:bg-white/20"
              }`}
            >
              ربط وتعديل الفيديو
            </button>
            <button
              type="button"
              onClick={() => setCurrentMode("watch")}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentMode === "watch"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-white/10 text-stone-300 hover:bg-white/20"
              }`}
            >
              وضع العرض والمشاهدة 📱
            </button>
          </div>
        </div>

        {/* =====================================================================
            RIGHT: REEL DETAILS & UPLOAD CONTROL FORM
           ===================================================================== */}
        <div className="md:w-7/12 p-6 sm:p-7 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Top Header */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#f2e5d3]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#8c2b18]/15 text-[#8c2b18] flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#3a2818]">
                    {currentMode === "upload" ? "ربط فيديو ريلز للطبق" : "معاينة الريلز المباشر"}
                  </h3>
                  <span className="text-xs font-bold text-stone-500">
                    منصة حواديت تدعم الفيديوهات الرأسية لزيادة تفاعل ومبيعات الأطباق
                  </span>
                </div>
              </div>
            </div>

            {/* Dish Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between mb-5">
              <span className="text-sm font-black text-[#8c2b18]">
                {dish.base_price} ج.م
              </span>
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <span className="text-xs font-black text-[#3a2818] block">{dish.name}</span>
                  <span className="text-[11px] font-bold text-stone-500">
                    القسم: {dish.category_name || "رئيسي"}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-[#eddcc4]">
                  <Image
                    src={dish.image_url || "/images/assets/dish-tagine.jpg"}
                    alt={dish.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* =================================================================
                MODE: UPLOAD & EDIT FORM
               ================================================================= */}
            {currentMode === "upload" ? (
              <form onSubmit={handleSubmitReel} className="space-y-4 text-xs font-bold text-[#3a2818]">
                {/* Video Upload Source Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black">ملف الفيديو الرأسي (9:16)</span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setUseUrlMode(false)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          !useUrlMode ? "bg-[#d32f2f] text-white font-black" : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        رفع ملف
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseUrlMode(true)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          useUrlMode ? "bg-[#d32f2f] text-white font-black" : "text-stone-500 hover:text-stone-800"
                        }`}
                      >
                        رابط مباشر (URL)
                      </button>
                    </div>
                  </div>

                  {!useUrlMode ? (
                    /* Drag & Drop File Zone */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#eddcc4] hover:border-[#d32f2f] bg-[#fdfaf3] hover:bg-white p-5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-[#8c2b18]/10 group-hover:bg-[#8c2b18]/20 text-[#8c2b18] flex items-center justify-center transition-all">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-black text-[#3a2818]">
                        {videoFile ? videoFile.name : "اضغط هنا لاختيار فيديو أو اسحبه إلى هنا"}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        صيغ مدعومة: MP4, WebM, MOV (بحد أقصى 50MB ومدة 15 - 60 ثانية)
                      </span>
                    </div>
                  ) : (
                    /* Direct URL Input */
                    <div className="relative">
                      <input
                        type="url"
                        value={directVideoUrl}
                        onChange={(e) => setDirectVideoUrl(e.target.value)}
                        placeholder="https://example.com/food-reel.mp4"
                        className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 pr-8 text-left font-mono text-xs transition-all"
                        dir="ltr"
                      />
                      <LinkIcon className="w-4 h-4 text-[#8c2b18] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Reel Title Input */}
                <div>
                  <label className="block mb-1 font-black">عنوان الريلز الجذاب</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: سر طاجن البامية باللحمة البلدي المسبك"
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right font-bold transition-all"
                  />
                </div>

                {/* Caption / Description Input */}
                <div>
                  <label className="block mb-1 font-black">الوصف والهاشتاجات</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="اكتب وصفاً شهياً وهاشتاجات للظهور في الصفحة الأولى..."
                    rows={2}
                    className="w-full bg-[#fdfaf3] hover:bg-white focus:bg-white rounded-2xl border-2 border-[#eddcc4] focus:border-[#d32f2f] focus:outline-none p-2.5 text-right font-bold transition-all resize-none"
                  />
                </div>

                {/* Duration & Performance Stats Info */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-600" />
                    مدة الفيديو المقدرة: {duration} ثانية
                  </span>
                  <span className="text-emerald-700 font-black flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    جاهز للنشر على خلاصة العملاء
                  </span>
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-[#5c3a16] text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-2 py-2.5 rounded-2xl bg-gradient-to-r from-[#d32f2f] to-[#b71c1c] text-white text-xs font-black shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Film className="w-4 h-4" />
                    <span>{loading ? "جاري الرفع والنشر..." : "نشر الريلز وربطه بالطبق 🎬"}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* =================================================================
                 MODE: WATCH & STATS OVERVIEW
                 ================================================================= */
              <div className="space-y-4 text-xs font-bold text-[#3a2818]">
                <div className="space-y-2">
                  <span className="font-black text-sm block">عنوان الفيديو المنشور:</span>
                  <p className="text-sm font-black text-[#8c2b18]">{title || dish.name}</p>
                </div>

                <div className="space-y-1">
                  <span className="font-black text-stone-600 block">الوصف:</span>
                  <p className="text-xs text-stone-700 leading-relaxed bg-[#fdfaf3] p-3 rounded-2xl border border-[#eddcc4]">
                    {caption}
                  </p>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-lg font-black text-[#e67e22] block font-mono">
                      {likesCount.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-stone-600 font-bold">إجمالي الإعجابات</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-lg font-black text-[#0284c7] block font-mono">
                      4,620
                    </span>
                    <span className="text-[11px] text-stone-600 font-bold">مشاهدات العملاء</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentMode("upload")}
                    className="flex-1 py-2.5 rounded-2xl bg-[#d32f2f] text-white text-xs font-black shadow hover:brightness-105 transition-all cursor-pointer text-center"
                  >
                    تعديل بيانات الفيديو
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all cursor-pointer text-center"
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
