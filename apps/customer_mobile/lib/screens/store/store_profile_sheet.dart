// lib/screens/store/store_profile_sheet.dart
import 'package:flutter/material.dart';
import '../../models/reel_model.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../product/product_detail_sheet.dart';

class StoreProfileSheet extends StatefulWidget {
  final String vendorId;
  final String vendorName;

  const StoreProfileSheet({
    super.key,
    required this.vendorId,
    required this.vendorName,
  });

  @override
  State<StoreProfileSheet> createState() => _StoreProfileSheetState();
}

class _StoreProfileSheetState extends State<StoreProfileSheet> {
  bool _isLoading = true;
  Map<String, dynamic>? _storeData;
  List<dynamic> _products = [];

  @override
  void initState() {
    super.initState();
    _loadStore();
  }

  Future<void> _loadStore() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.getMerchantDetails(widget.vendorId);
      if (mounted) {
        setState(() {
          _storeData = res['data'];
          _products = res['data']?['products'] ?? [];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openProductOptions(dynamic p) {
    final reel = ReelModel(
      id: p['id'].toString(),
      videoUrl: '',
      thumbnailUrl: p['image_url'] ?? '',
      productId: p['id'].toString(),
      productTitle: p['name'] ?? 'وجبة',
      productDescription: p['description'] ?? '',
      price: double.tryParse(p['price']?.toString() ?? '100') ?? 100.0,
      category: 'أكل بيتي',
      vendorId: widget.vendorId,
      vendorName: _storeData?['name'] ?? widget.vendorName,
      vendorAvatar: _storeData?['logo'] ?? '',
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProductDetailSheet(reel: reel),
    );
  }

  void _addToCart(dynamic p) {
    _openProductOptions(p);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Color(0xFF101216),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // مقبض السحب
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 8),

          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primaryYellow),
                  )
                : _storeData == null
                    ? const Center(
                        child: Text(
                          'تعذر تحميل بيانات المتجر',
                          style: TextStyle(color: Colors.white60, fontFamily: 'Cairo'),
                        ),
                      )
                    : CustomScrollView(
                        slivers: [
                          // الغلاف ومعلومات المتجر
                          SliverToBoxAdapter(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // صورة الكفر مع اللوجو العائم
                                Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Container(
                                      height: 140,
                                      width: double.infinity,
                                      decoration: BoxDecoration(
                                        image: DecorationImage(
                                          image: NetworkImage(
                                            _storeData!['cover'] ??
                                                'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
                                          ),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      height: 140,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          end: Alignment.bottomCenter,
                                          colors: [
                                            Colors.transparent,
                                            Colors.black.withAlpha(178),
                                          ],
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      bottom: -28,
                                      right: 20,
                                      child: Container(
                                        width: 72,
                                        height: 72,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: AppTheme.primaryYellow,
                                            width: 2.5,
                                          ),
                                          image: DecorationImage(
                                            image: NetworkImage(
                                              _storeData!['logo'] ?? '',
                                            ),
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 38),

                                // الاسم والتقييم
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 20),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  _storeData!['name'] ?? widget.vendorName,
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 20,
                                                    fontWeight: FontWeight.w900,
                                                    fontFamily: 'Cairo',
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                const Icon(Icons.verified,
                                                    color: Color(0xFF29B6F6), size: 18),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                const Icon(Icons.star_rounded,
                                                    color: Colors.amber, size: 18),
                                                const SizedBox(width: 4),
                                                Text(
                                                  '${_storeData!['rating'] ?? 4.9} (${_storeData!['reviews_count'] ?? 100}+ تقييم)',
                                                  style: const TextStyle(
                                                    color: Colors.white70,
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                const SizedBox(width: 12),
                                                const Icon(Icons.location_on_outlined,
                                                    color: Colors.white54, size: 16),
                                                const SizedBox(width: 2),
                                                Text(
                                                  _storeData!['address'] ?? 'القاهرة',
                                                  style: const TextStyle(
                                                    color: Colors.white54,
                                                    fontSize: 12,
                                                    fontFamily: 'Cairo',
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 16),
                                const Divider(color: Colors.white12),

                                // عنوان قائمة الطعام
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                  child: Text(
                                    'قائمة الطعام (${_products.length} صنف) 🍽️',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Cairo',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // قائمة الأصناف
                          SliverPadding(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (ctx, idx) {
                                  final p = _products[idx];
                                  final price = p['price'] ?? 0;
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: AppTheme.surface,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: Colors.white12),
                                    ),
                                    child: Row(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(12),
                                          child: Image.network(
                                            p['image_url'] ?? '',
                                            width: 70,
                                            height: 70,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(
                                              width: 70,
                                              height: 70,
                                              color: Colors.white10,
                                              child: const Icon(Icons.fastfood, color: Colors.white24),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                p['name'] ?? 'صنف',
                                                style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                  fontFamily: 'Cairo',
                                                ),
                                              ),
                                              if (p['description'] != null) ...[
                                                const SizedBox(height: 2),
                                                Text(
                                                  p['description'],
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: const TextStyle(
                                                    color: Colors.white54,
                                                    fontSize: 12,
                                                    fontFamily: 'Cairo',
                                                  ),
                                                ),
                                              ],
                                              const SizedBox(height: 6),
                                              Text(
                                                '$price جنيه',
                                                style: const TextStyle(
                                                  color: AppTheme.primaryYellow,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                  fontFamily: 'Cairo',
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        ElevatedButton(
                                          onPressed: () => _addToCart(p),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppTheme.primaryYellow,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 14, vertical: 8),
                                          ),
                                          child: const Text(
                                            '+ أضف',
                                            style: TextStyle(
                                              color: Colors.black,
                                              fontWeight: FontWeight.bold,
                                              fontFamily: 'Cairo',
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                                childCount: _products.length,
                              ),
                            ),
                          ),
                          const SliverToBoxAdapter(child: SizedBox(height: 20)),
                        ],
                      ),
          ),
        ],
      ),
    );
  }
}
