// lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../auth/phone_screen.dart';
import '../favorites/favorites_screen.dart';
import '../notifications/notifications_screen.dart';
import '../orders/my_orders_screen.dart';
import 'addresses_screen.dart';
import 'edit_profile_screen.dart';
import 'support_sheet.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    // ─── Guest Mode ─────────────────────────────────────────────────────────
    if (!auth.isAuthenticated) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          title: const Text('حسابي'),
          backgroundColor: AppTheme.surface,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.darkTeal, AppTheme.surface],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    border: Border.all(
                        color: AppTheme.primaryYellow.withAlpha(80), width: 2),
                  ),
                  child: const Center(
                    child: Text('👋', style: TextStyle(fontSize: 52)),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'أهلاً بك في سوقنا!',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.textLight,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                const Text(
                  'سجل دخولك لمتابعة طلباتك\nومفضلاتك وعناوينك 📍',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.textGrey,
                    fontSize: 15,
                    height: 1.6,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.login_rounded),
                    label: const Text(
                      'سجل دخولك دلوقتي 🚀',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryYellow,
                      foregroundColor: AppTheme.background,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PhoneScreen()),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'سوقنا — لقطة في كل حاجة ..',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.textGrey,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // ─── Authenticated Mode ──────────────────────────────────────────────────
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(title: const Text('حسابي')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 20),
            // أفاتار
            Container(
              width: 90,
              height: 90,
              decoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text('👤', style: TextStyle(fontSize: 44)),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              auth.userName ?? 'عميل',
              style: const TextStyle(
                color: AppTheme.textLight,
                fontFamily: 'Cairo',
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              auth.phone ?? '',
              style: const TextStyle(
                color: AppTheme.textGrey,
                fontFamily: 'Cairo',
                fontSize: 15,
              ),
              textDirection: TextDirection.ltr,
            ),
            const SizedBox(height: 10),
            // زر تعديل الملف الشخصي السريع
            OutlinedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                );
              },
              icon: const Icon(Icons.edit_outlined, size: 16, color: AppTheme.primaryYellow),
              label: const Text(
                'تعديل الحساب',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.primaryYellow,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.primaryYellow.withAlpha(120)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              ),
            ),
            const SizedBox(height: 24),
            const Divider(color: AppTheme.surface),
            // خيارات
            _ProfileTile(
              icon: Icons.person_outline,
              label: 'تعديل الملف الشخصي ✏️',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const EditProfileScreen()),
              ),
            ),
            _ProfileTile(
              icon: Icons.receipt_long,
              label: 'طلباتي',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyOrdersScreen()),
              ),
            ),
            _ProfileTile(
              icon: Icons.favorite_border,
              label: 'أكلاتي المفضلة والمحفوظات ❤️',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const FavoritesScreen()),
              ),
            ),
            _ProfileTile(
              icon: Icons.location_on_outlined,
              label: 'عناويني المحفوظة 📍',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddressesScreen()),
              ),
            ),
            _ProfileTile(
              icon: Icons.notifications_none_outlined,
              label: 'الإشعارات والتنبيهات 🔔',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              ),
            ),
            _ProfileTile(
              icon: Icons.support_agent_outlined,
              label: 'المساعدة والدعم الفني 🎧',
              onTap: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => const SupportSheet(),
              ),
            ),
            _ProfileTile(
              icon: Icons.info_outline,
              label: 'عن سوقنا',
              onTap: () => showAboutDialog(
                context: context,
                applicationName: 'سوقنا',
                applicationVersion: '1.0.0',
                applicationLegalese: 'لقطة في كل حاجة ..',
              ),
            ),
            const SizedBox(height: 20),
            const Divider(color: AppTheme.surface),
            // تسجيل الخروج
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text(
                'تسجيل الخروج',
                style: TextStyle(
                  color: Colors.red,
                  fontFamily: 'Cairo',
                  fontSize: 16,
                ),
              ),
              onTap: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    backgroundColor: AppTheme.surface,
                    title: const Text('تسجيل الخروج؟',
                        style: TextStyle(
                            fontFamily: 'Cairo', color: AppTheme.textLight)),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('لا',
                            style: TextStyle(color: AppTheme.textGrey)),
                      ),
                      ElevatedButton(
                        onPressed: () async {
                          Navigator.pop(ctx);
                          await auth.logout();
                          if (context.mounted) {
                            Navigator.pushAndRemoveUntil(
                              context,
                              MaterialPageRoute(
                                  builder: (_) => const PhoneScreen()),
                              (_) => false,
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red),
                        child: const Text('اتخرج'),
                      ),
                    ],
                  ),
                );
              },
            ),
            const Spacer(),
            const Text(
              'سوقنا — لقطة في كل حاجة ..',
              style: TextStyle(
                color: AppTheme.textGrey,
                fontFamily: 'Cairo',
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primary),
      title: Text(
        label,
        style: const TextStyle(
          color: AppTheme.textLight,
          fontFamily: 'Cairo',
          fontSize: 16,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios,
          color: AppTheme.textGrey, size: 16),
      onTap: onTap,
    );
  }
}
