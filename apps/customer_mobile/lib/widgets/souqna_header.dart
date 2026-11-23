// lib/widgets/souqna_header.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/reels_provider.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/explore/explore_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../theme/app_theme.dart';

class SouqnaHeader extends StatelessWidget {
  final String selectedCategory;
  final Function(String) onCategorySelected;

  const SouqnaHeader({
    super.key,
    required this.selectedCategory,
    required this.onCategorySelected,
  });

  static const List<Map<String, dynamic>> categories = [
    {'title': 'الكل', 'icon': Icons.grid_view_rounded},
    {'title': 'مطاعم', 'icon': Icons.restaurant_rounded},
    {'title': 'أكل بيتي', 'icon': Icons.soup_kitchen_rounded},
    {'title': 'أزياء وموضة', 'icon': Icons.checkroom_rounded},
    {'title': 'تجميل', 'icon': Icons.brush_rounded},
    {'title': 'إلكترونيات', 'icon': Icons.phone_android_rounded},
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.headerTeal.withAlpha(242),
            AppTheme.headerTeal.withAlpha(217),
            Colors.transparent,
          ],
          stops: const [0.0, 0.7, 1.0],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // الشريط العلوي (بروفايل + لوجو + بحث وإشعارات)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  // صورة بروفايل المستخدم (ديناميك من الـ auth)
                  CircleAvatar(
                    radius: 21,
                    backgroundColor: AppTheme.primaryYellow,
                    child: Text(
                      (auth.userName ?? 'ع').substring(0, 1),
                      style: const TextStyle(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const Spacer(),

                  // لوجو "سوقنا" مع السلوجان
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.shopping_bag, color: AppTheme.primaryYellow, size: 22),
                          const SizedBox(width: 4),
                          RichText(
                            text: const TextSpan(
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                              ),
                              children: [
                                TextSpan(text: 'سـ', style: TextStyle(color: Color(0xFF26A69A))),
                                TextSpan(text: 'وقـ', style: TextStyle(color: Color(0xFFE8521A))),
                                TextSpan(text: 'نا', style: TextStyle(color: Color(0xFF26A69A))),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Text(
                        'لقطة في كل حاجة ..',
                        style: TextStyle(
                          color: AppTheme.primaryYellow,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                  ),

                  const Spacer(),

                  // زر البحث — يفتح شاشة الاستكشاف والبحث
                  IconButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ExploreScreen()),
                      );
                    },
                    icon: const Icon(Icons.search, color: Colors.white, size: 26),
                  ),

                  // زر الإشعارات
                  IconButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationsScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.notifications_none_outlined, color: Colors.white, size: 26),
                  ),

                  // زر السلة مع البادج التفاعلي
                  Consumer<CartProvider>(
                    builder: (context, cart, _) {
                      return Stack(
                        clipBehavior: Clip.none,
                        children: [
                          IconButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (_) => const CartScreen()),
                              );
                            },
                            icon: const Icon(Icons.shopping_bag_outlined,
                                color: Colors.white, size: 26),
                          ),
                          if (cart.itemCount > 0)
                            Positioned(
                              right: 6,
                              top: 6,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: AppTheme.primaryYellow,
                                  shape: BoxShape.circle,
                                ),
                                constraints: const BoxConstraints(
                                  minWidth: 18,
                                  minHeight: 18,
                                ),
                                child: Text(
                                  '${cart.itemCount}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: Colors.black,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo',
                                  ),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 6),

            // شريط التصنيفات الأفقي (Category Filter Chips) — ديناميك مع ReelsProvider
            SizedBox(
              height: 44,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: categories.length,
                itemBuilder: (context, index) {
                  final cat = categories[index];
                  // ✅ نقرأ الكاتيجوري من ReelsProvider مش من local state
                  final activeCat = context.watch<ReelsProvider>().selectedCategory;
                  final isSelected = activeCat == cat['title'];

                  return GestureDetector(
                    onTap: () {
                      context.read<ReelsProvider>().changeCategory(cat['title'] as String);
                      onCategorySelected(cat['title'] as String);
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primaryYellow : AppTheme.darkTeal.withAlpha(204),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isSelected ? AppTheme.primaryYellow : Colors.white24,
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            cat['icon'] as IconData,
                            size: 18,
                            color: isSelected ? Colors.black : Colors.white,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            cat['title'] as String,
                            style: TextStyle(
                              color: isSelected ? Colors.black : Colors.white,
                              fontSize: 13,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
