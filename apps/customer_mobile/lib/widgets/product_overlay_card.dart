// lib/widgets/product_overlay_card.dart
import 'package:flutter/material.dart';
import '../models/reel_model.dart';
import '../theme/app_theme.dart';

class ProductOverlayCard extends StatelessWidget {
  final ReelModel reel;
  final VoidCallback onOrderNow;

  const ProductOverlayCard({
    super.key,
    required this.reel,
    required this.onOrderNow,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 250,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(245),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(89),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              // صورة المنتج المصغرة
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 58,
                  height: 58,
                  color: Colors.grey.shade200,
                  child: reel.thumbnailUrl.isNotEmpty
                      ? Image.network(reel.thumbnailUrl, fit: BoxFit.cover)
                      : const Icon(Icons.fastfood, color: Colors.grey),
                ),
              ),
              const SizedBox(width: 10),

              // الاسم والتقييم والسعر
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      reel.productTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppTheme.textDark,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Cairo',
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                        const SizedBox(width: 2),
                        Text(
                          '${reel.rating}',
                          style: const TextStyle(
                            color: Colors.black87,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Colors.black45, size: 12),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          '${reel.price.toInt()} ج.م',
                          style: const TextStyle(
                            color: Color(0xFFD32F2F), // أحمر السعر
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Cairo',
                          ),
                        ),
                        if (reel.originalPrice != null) ...[
                          const SizedBox(width: 6),
                          Text(
                            '${reel.originalPrice!.toInt()} ج.م',
                            style: const TextStyle(
                              color: Colors.grey,
                              fontSize: 11,
                              decoration: TextDecoration.lineThrough,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // زر "اطلب الآن 🛒" الأصفر المميز
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton.icon(
              onPressed: onOrderNow,
              icon: const Icon(Icons.shopping_cart_outlined, color: Colors.black, size: 18),
              label: const Text(
                'اطلب الآن',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryYellow,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
