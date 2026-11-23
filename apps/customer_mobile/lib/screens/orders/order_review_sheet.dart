// lib/screens/orders/order_review_sheet.dart
import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class OrderReviewSheet extends StatefulWidget {
  final String orderId;
  final String storeName;
  final Map<String, dynamic>? existingReview;
  final VoidCallback onReviewSubmitted;

  const OrderReviewSheet({
    super.key,
    required this.orderId,
    required this.storeName,
    this.existingReview,
    required this.onReviewSubmitted,
  });

  @override
  State<OrderReviewSheet> createState() => _OrderReviewSheetState();
}

class _OrderReviewSheetState extends State<OrderReviewSheet> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  final Set<String> _selectedTags = {};
  bool _isSubmitting = false;

  static const List<String> _availableTags = [
    'الأكل سخن مولع 🔥',
    'تغليف ممتاز ومحكم 📦',
    'التوصيل سريع ⚡',
    'الكمية مشبعة وكريمة 🍲',
    'الملح والبهارات مظبوطين 🧂',
    'نظافة وجودة عالية ✨',
    'شيف محترف 👨‍🍳',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.existingReview != null) {
      _rating = (widget.existingReview!['rating'] as num?)?.toInt() ?? 5;
      _commentCtrl.text = widget.existingReview!['comment']?.toString() ?? '';
      final tags = widget.existingReview!['tags'];
      if (tags is List) {
        _selectedTags.addAll(tags.map((t) => t.toString()));
      }
    }
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  String _getRatingLabel(int r) {
    switch (r) {
      case 1:
        return 'سيء جداً 😞';
      case 2:
        return 'مقبول 😐';
      case 3:
        return 'جيد وطيب 🙂';
      case 4:
        return 'ممتاز ولذيذ 😋';
      case 5:
        return 'عالمي فوق الخيال! 👑';
      default:
        return '';
    }
  }

  Future<void> _submitReview() async {
    setState(() => _isSubmitting = true);

    try {
      await ApiService.submitOrderReview(
        orderId: widget.orderId,
        rating: _rating,
        comment: _commentCtrl.text.trim().isEmpty ? null : _commentCtrl.text.trim(),
        tags: _selectedTags.isEmpty ? null : _selectedTags.toList(),
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'شكراً لتقييمك! رأيك بيساعدنا نقدملك أحسن أكل دايماً ❤️',
            style: TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: AppTheme.primary,
        ),
      );

      widget.onReviewSubmitted();
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // عنوان المودال
            Text(
              'إيه رأيك في طلبك من ${widget.storeName}؟ 🍽️',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Cairo',
                color: AppTheme.textLight,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'تقييمك الحقيقي بيفرق جداً مع الشيف ومجتمع حواديت',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Cairo',
                color: Colors.white60,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 20),

            // النجوم
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final starNum = index + 1;
                final isSelected = starNum <= _rating;
                return GestureDetector(
                  onTap: () => setState(() => _rating = starNum),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: AnimatedScale(
                      scale: isSelected ? 1.15 : 1.0,
                      duration: const Duration(milliseconds: 150),
                      child: Icon(
                        isSelected ? Icons.star_rounded : Icons.star_border_rounded,
                        color: isSelected ? AppTheme.primaryYellow : Colors.white24,
                        size: 42,
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 8),

            // نص وصف التقييم
            Center(
              child: Text(
                _getRatingLabel(_rating),
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.primaryYellow,
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // شارات الإعجاب السريعة
            const Text(
              'إيه أكتر حاجة عجبتك؟ (اختياري)',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: AppTheme.textLight,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableTags.map((tag) {
                final isSelected = _selectedTags.contains(tag);
                return FilterChip(
                  label: Text(
                    tag,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      color: isSelected ? Colors.black : Colors.white70,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _selectedTags.add(tag);
                      } else {
                        _selectedTags.remove(tag);
                      }
                    });
                  },
                  backgroundColor: AppTheme.surface,
                  selectedColor: AppTheme.primaryYellow,
                  checkmarkColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: BorderSide(
                      color: isSelected ? AppTheme.primaryYellow : Colors.white12,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // حقل التعليق
            const Text(
              'اكتب تعليقك للشيف (اختياري)',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: AppTheme.textLight,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _commentCtrl,
              textDirection: TextDirection.rtl,
              maxLines: 3,
              style: const TextStyle(
                fontFamily: 'Cairo',
                color: AppTheme.textLight,
                fontSize: 13,
              ),
              decoration: InputDecoration(
                hintText: 'مثلاً: الأكل تسلم إيد الشيف كان سخن ومظبوط، بس ياريت المرة الجاية الليمون زيادة شوية...',
                hintStyle: const TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white38,
                  fontSize: 12,
                ),
                filled: true,
                fillColor: AppTheme.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.primaryYellow),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // زر الإرسال
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitReview,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryYellow,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.black,
                      ),
                    )
                  : Text(
                      widget.existingReview != null ? 'تحديث التقييم ✨' : 'إرسال التقييم 🌟',
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
