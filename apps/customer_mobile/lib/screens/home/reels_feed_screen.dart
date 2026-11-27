// lib/screens/home/reels_feed_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../config/app_config.dart';
import '../../models/reel_model.dart';
import '../../providers/reels_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/souqna_header.dart';
import '../../widgets/product_overlay_card.dart';
import '../product/product_detail_sheet.dart';
import '../store/store_profile_sheet.dart';
import 'reels_comments_sheet.dart';

class ReelsFeedScreen extends StatefulWidget {
  const ReelsFeedScreen({super.key});

  @override
  State<ReelsFeedScreen> createState() => _ReelsFeedScreenState();
}

class _ReelsFeedScreenState extends State<ReelsFeedScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;
  String _selectedCategory = 'الكل';

  @override
  void initState() {
    super.initState();
    // تحميل الفيديوهات الحية من السيرفر فور تشغيل الشاشة
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<ReelsProvider>().loadReels();
      }
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  String _formatCount(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}K';
    }
    return count.toString();
  }

  void _openProductDetails(ReelModel reel) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ProductDetailSheet(reel: reel),
    );
  }

  void _openStoreDetails(ReelModel reel) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StoreProfileSheet(
        vendorId: reel.vendorId,
        vendorName: reel.vendorName,
      ),
    );
  }

  void _toggleLike(ReelModel reel) {
    // ⚡ Optimistic UI: تحديث فوري فائق السرعة
    setState(() {
      reel.isLiked = !reel.isLiked;
      reel.likesCount += reel.isLiked ? 1 : -1;
      if (reel.likesCount < 0) reel.likesCount = 0;
    });

    ApiService.toggleLike(reel.id).then((res) {
      if (res['likes_count'] != null && mounted) {
        setState(() {
          reel.likesCount = res['likes_count'];
          reel.isLiked = res['is_liked'];
        });
      }
    }).catchError((_) {
      // تراجع في حالة الفشل
      if (mounted) {
        setState(() {
          reel.isLiked = !reel.isLiked;
          reel.likesCount += reel.isLiked ? 1 : -1;
        });
      }
    });
  }

  void _toggleSave(ReelModel reel) {
    setState(() {
      reel.isSaved = !reel.isSaved;
      reel.savesCount += reel.isSaved ? 1 : -1;
      if (reel.savesCount < 0) reel.savesCount = 0;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          reel.isSaved ? '✅ تم الحفظ في مفضلتك 🔖' : 'تمت الإزالة من المفضلة',
          style: const TextStyle(fontFamily: 'Cairo'),
        ),
        backgroundColor: reel.isSaved ? const Color(0xFF2E7D32) : Colors.black87,
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    ApiService.toggleSave(reel.id).then((res) {
      if (res['saves_count'] != null && mounted) {
        setState(() {
          reel.savesCount = res['saves_count'];
          reel.isSaved = res['is_saved'];
        });
      }
    }).catchError((_) {
      if (mounted) {
        setState(() {
          reel.isSaved = !reel.isSaved;
          reel.savesCount += reel.isSaved ? 1 : -1;
        });
      }
    });
  }

  void _shareReel(ReelModel reel) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'تم نسخ رابط الوجبة للمشاركة: ${reel.productTitle} 🔗',
          style: const TextStyle(fontFamily: 'Cairo'),
        ),
        backgroundColor: AppTheme.primaryYellow,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reelsProvider = Provider.of<ReelsProvider>(context);
    final reelsList = reelsProvider.reels;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. فيد الفيديوهات العمودية الحقيقية من قاعدة البيانات
          if (reelsProvider.isLoading && reelsList.isEmpty)
            const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppTheme.primaryYellow),
                  SizedBox(height: 16),
                  Text(
                    'جاري تحميل فيديوهات المطاعم...',
                    style: TextStyle(color: Colors.white70, fontFamily: 'Cairo', fontSize: 14),
                  ),
                ],
              ),
            )
          else if (reelsList.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      reelsProvider.error != null ? Icons.wifi_off_rounded : Icons.video_library_outlined,
                      size: 64,
                      color: AppTheme.primaryYellow.withAlpha(200),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      reelsProvider.error ?? 'لا توجد فيديوهات منشورة حالياً',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontFamily: 'Cairo',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      reelsProvider.error != null
                          ? 'تأكد من الاتصال بالإنترنت واضغط تحديث'
                          : 'ارفع أول فيديو من لوحة التاجر وهيظهر هنا فوراً',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white60, fontFamily: 'Cairo', fontSize: 13),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () => reelsProvider.loadReels(refresh: true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryYellow,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                      ),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('تحديث الآن', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            )
          else
          RefreshIndicator(
            onRefresh: () => reelsProvider.loadReels(refresh: true),
            color: AppTheme.primaryYellow,
            child: PageView.builder(
              controller: _pageController,
              scrollDirection: Axis.vertical,
              itemCount: reelsList.length,
              onPageChanged: (idx) => setState(() => _currentIndex = idx),
              itemBuilder: (context, index) {
                final reel = reelsList[index];
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    // مشغل الفيديو الرأسي الذكي (Auto-play + Tap to pause)
                    ReelVideoPlayer(
                      key: ValueKey('${reel.id}_${reel.videoUrl}'),
                      videoUrl: reel.videoUrl,
                      thumbnailUrl: reel.thumbnailUrl,
                      isCurrent: _currentIndex == index,
                    ),

                  // تدرج ظل سفلي لقراءة النصوص بوضوح (IgnorePointer حتى لا يمنع الضغط للتشغيل/الإيقاف)
                  IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withAlpha(51),
                            Colors.black.withAlpha(217),
                          ],
                          stops: const [0.4, 0.65, 1.0],
                        ),
                      ),
                    ),
                  ),

                  // تفاصيل الفيديو السفلية (اسم المتجر + الكابشن + الهاشتاجات)
                  Positioned(
                    bottom: 24,
                    right: 16,
                    left: 90,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // كارت المنتج الأبيض العائم
                        ProductOverlayCard(
                          reel: reel,
                          onOrderNow: () => _openProductDetails(reel),
                        ),
                        const SizedBox(height: 14),

                        // معلومات البائع مع علامة التوثيق وزر المتابعة وقائمته
                        GestureDetector(
                          onTap: () => _openStoreDetails(reel),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white12,
                                  border: Border.all(color: AppTheme.primaryYellow, width: 1.5),
                                  image: reel.vendorAvatar.isNotEmpty
                                      ? DecorationImage(
                                          image: NetworkImage(reel.vendorAvatar),
                                          fit: BoxFit.cover,
                                        )
                                      : null,
                                ),
                                child: reel.vendorAvatar.isEmpty
                                    ? const Icon(Icons.store, color: AppTheme.primaryYellow, size: 20)
                                    : null,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                reel.vendorName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'Cairo',
                                ),
                              ),
                              if (reel.isVerified) ...[
                                const SizedBox(width: 4),
                                const Icon(Icons.verified, color: Color(0xFF29B6F6), size: 16),
                              ],
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(46),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Colors.white30, width: 0.8),
                                ),
                                child: const Text(
                                  'المتجر 🏪',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 8),

                        // وصف الوجبة أو المنتج
                        Text(
                          '${reel.productDescription} 😍',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Cairo',
                          ),
                        ),

                        const SizedBox(height: 4),

                        // الهاشتاجات الرسمية (#سوقنا #أكل_بيتي)
                        Wrap(
                          spacing: 6,
                          children: [
                            const Text('#سوقنا', style: TextStyle(color: AppTheme.primaryYellow, fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Cairo')),
                            Text('#${reel.category.replaceAll(' ', '_')}', style: const TextStyle(color: AppTheme.primaryYellow, fontWeight: FontWeight.bold, fontSize: 12, fontFamily: 'Cairo')),
                            Text('#${reel.vendorName.replaceAll(' ', '_')}', style: const TextStyle(color: Colors.white70, fontSize: 12, fontFamily: 'Cairo')),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // أدوات التفاعل الجانبية (يمين الشاشة)
                  Positioned(
                    bottom: 30,
                    left: 14,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // أيقونة البائع السريعة مع علامة الزائد
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.white12,
                                border: Border.all(color: Colors.white, width: 2),
                                image: reel.vendorAvatar.isNotEmpty
                                    ? DecorationImage(
                                        image: NetworkImage(reel.vendorAvatar),
                                        fit: BoxFit.cover,
                                      )
                                    : null,
                              ),
                              child: reel.vendorAvatar.isEmpty
                                  ? const Icon(Icons.store, color: Colors.white, size: 22)
                                  : null,
                            ),
                            Positioned(
                              bottom: -6,
                              left: 13,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFE53935),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add, color: Colors.white, size: 14),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // لايك (❤️) - تفاعلي مع العداد واللون
                        _ActionIcon(
                          icon: reel.isLiked ? Icons.favorite : Icons.favorite_border,
                          count: _formatCount(reel.likesCount),
                          iconColor: reel.isLiked ? const Color(0xFFE53935) : Colors.white,
                          onTap: () => _toggleLike(reel),
                        ),
                        const SizedBox(height: 16),

                        // تعليقات (💬) — يفتح ReelsCommentsSheet
                        _ActionIcon(
                          icon: Icons.chat_bubble_outline_rounded,
                          count: _formatCount(reel.commentsCount),
                          onTap: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            enableDrag: true,
                            builder: (_) => ReelsCommentsSheet(reel: reel),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // مشاركة (↗️)
                        _ActionIcon(
                          icon: Icons.reply_rounded,
                          count: _formatCount(reel.sharesCount),
                          isMirrored: true,
                          onTap: () => _shareReel(reel),
                        ),
                        const SizedBox(height: 16),

                        // حفظ ومفضلة (🔖)
                        _ActionIcon(
                          icon: reel.isSaved ? Icons.bookmark : Icons.bookmark_border_rounded,
                          count: _formatCount(reel.savesCount),
                          iconColor: reel.isSaved ? AppTheme.primaryYellow : Colors.white,
                          onTap: () => _toggleSave(reel),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),

          // 2. الهيدر العلوي وفلاتر الأقسام فوق الفيديو
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SouqnaHeader(
              selectedCategory: _selectedCategory,
              onCategorySelected: (cat) {
                setState(() {
                  _selectedCategory = cat;
                  _currentIndex = 0;
                });
                reelsProvider.changeCategory(cat);
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionIcon extends StatelessWidget {
  final IconData icon;
  final String count;
  final Color iconColor;
  final bool isMirrored;
  final VoidCallback? onTap;

  const _ActionIcon({
    required this.icon,
    required this.count,
    this.iconColor = Colors.white,
    this.isMirrored = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform(
            alignment: Alignment.center,
            transform: Matrix4.rotationY(isMirrored ? 3.14159 : 0),
            child: Icon(icon, color: iconColor, size: 34),
          ),
          const SizedBox(height: 3),
          Text(
            count,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              fontFamily: 'Cairo',
            ),
          ),
        ],
      ),
    );
  }
}

/// مشغل الفيديو الحقيقي للريلز (Auto-play loop + Cover fallback)
class ReelVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final String thumbnailUrl;
  final bool isCurrent;

  const ReelVideoPlayer({
    super.key,
    required this.videoUrl,
    required this.thumbnailUrl,
    required this.isCurrent,
  });

  @override
  State<ReelVideoPlayer> createState() => _ReelVideoPlayerState();
}

class _ReelVideoPlayerState extends State<ReelVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _isPlaying = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  void _initVideo() {
    final videoUrl = widget.videoUrl.trim();
    if (videoUrl.isEmpty) return;
    if (mounted) setState(() => _hasError = false);

    // توحيد روابط الميديا المحلية لتعمل مع السيرفر المحدد في AppConfig
    String cleanUrl = videoUrl;
    if (cleanUrl.startsWith('/')) {
      cleanUrl = '${AppConfig.mediaBaseUrl}$cleanUrl';
    } else if (cleanUrl.contains('localhost:8000') || cleanUrl.contains('127.0.0.1:8000')) {
      final parsed = Uri.tryParse(cleanUrl);
      if (parsed != null && parsed.path.isNotEmpty) {
        cleanUrl = '${AppConfig.mediaBaseUrl}${parsed.path}';
      }
    }

    final uri = Uri.tryParse(cleanUrl);
    if (uri == null) return;

    _controller = VideoPlayerController.networkUrl(uri)
      ..initialize().then((_) {
        if (!mounted) return;
        _controller?.setLooping(true);
        _controller?.setVolume(1.0);
        if (widget.isCurrent) {
          _controller?.play();
        }
        setState(() {
          _isInitialized = true;
          _hasError = false;
          _isPlaying = widget.isCurrent;
        });
      }).catchError((err) {
        debugPrint('Video player error for $cleanUrl: $err');
        if (mounted) setState(() => _hasError = true);
      });
  }

  @override
  void didUpdateWidget(covariant ReelVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.videoUrl != oldWidget.videoUrl) {
      _controller?.dispose();
      _controller = null;
      _isInitialized = false;
      _isPlaying = false;
      _initVideo();
    } else if (widget.isCurrent != oldWidget.isCurrent) {
      if (widget.isCurrent) {
        if (_isInitialized) {
          _controller?.play();
          setState(() => _isPlaying = true);
        }
      } else {
        _controller?.pause();
        setState(() => _isPlaying = false);
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlay() {
    if (!_isInitialized || _controller == null) return;
    setState(() {
      if (_controller!.value.isPlaying) {
        _controller!.pause();
        _isPlaying = false;
      } else {
        _controller!.play();
        _isPlaying = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _togglePlay,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Poster Cover Image
          if (widget.thumbnailUrl.isNotEmpty)
            Image.network(
              widget.thumbnailUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: const Color(0xFF132B2A),
                child: const Center(
                  child: Icon(Icons.movie, size: 60, color: Colors.white24),
                ),
              ),
            ),

          // 2. Real Video Player
          if (_isInitialized && _controller != null)
            SizedBox.expand(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller!.value.size.width > 0 ? _controller!.value.size.width : 720,
                  height: _controller!.value.size.height > 0 ? _controller!.value.size.height : 1280,
                  child: VideoPlayer(_controller!),
                ),
              ),
            ),

          // 3. Loading Buffering Spinner or Retry on Error
          if (!_isInitialized && widget.videoUrl.isNotEmpty)
            Center(
              child: _hasError
                  ? ElevatedButton.icon(
                      onPressed: () {
                        _controller?.dispose();
                        _controller = null;
                        _initVideo();
                      },
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('إعادة تحميل الفيديو'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryYellow,
                        foregroundColor: Colors.black,
                      ),
                    )
                  : const SizedBox(
                      width: 44,
                      height: 44,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: AppTheme.primaryYellow,
                      ),
                    ),
            ),

          // 4. Video Progress Bar at the bottom
          if (_isInitialized && _controller != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: VideoProgressIndicator(
                _controller!,
                allowScrubbing: true,
                padding: EdgeInsets.zero,
                colors: const VideoProgressColors(
                  playedColor: AppTheme.primaryYellow,
                  bufferedColor: Colors.white30,
                  backgroundColor: Colors.transparent,
                ),
              ),
            ),

          // 5. Pause Indicator Icon
          if (_isInitialized && !_isPlaying)
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Colors.black45,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.play_arrow_rounded,
                  size: 56,
                  color: Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
