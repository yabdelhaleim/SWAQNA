// lib/screens/profile/edit_profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  String? _phone;
  Map<String, dynamic>? _profileData;

  // أفاتار افتراضي
  String _selectedAvatarEmoji = '👤';
  final List<String> _avatarPresets = ['👤', '👨‍🍳', '👩‍🍳', '🍔', '🍕', '🍰', '🍣', '🌮'];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getProfile();
      if (!mounted) return;
      setState(() {
        _profileData = data;
        _nameCtrl.text = data['full_name']?.toString() ?? '';
        _emailCtrl.text = data['email']?.toString() ?? '';
        _phone = data['phone_number']?.toString();
        _selectedAvatarEmoji = data['avatar_url']?.toString() ?? '👤';
        _isLoading = false;
      });
    } catch (_) {
      // Fallback للقيم المخزنة محلياً في AuthProvider
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      setState(() {
        _nameCtrl.text = auth.userName ?? '';
        _phone = auth.phone;
        _isLoading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final fullName = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();

    try {
      final updated = await ApiService.updateProfile(
        fullName: fullName,
        email: email.isNotEmpty ? email : null,
        avatarUrl: _selectedAvatarEmoji,
      );

      if (!mounted) return;
      // تحديث AuthProvider محلياً لمزامنة كل شاشات التطبيق فوراً
      await context.read<AuthProvider>().updateUserName(fullName);

      setState(() => _isSaving = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'تم حفظ التعديلات بنجاح ✨',
              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
            ),
            backgroundColor: Color(0xFF2E7D32),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context, updated);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceAll('Exception: ', ''),
            style: const TextStyle(fontFamily: 'Cairo'),
          ),
          backgroundColor: Colors.red.shade700,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showAvatarPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'اختر صورتك الرمزية المفضلة ✨',
              style: TextStyle(
                fontFamily: 'Cairo',
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: _avatarPresets.map((emoji) {
                final isSelected = emoji == _selectedAvatarEmoji;
                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedAvatarEmoji = emoji);
                    Navigator.pop(ctx);
                  },
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primaryYellow.withAlpha(50) : const Color(0xFF22252A),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryYellow : Colors.white12,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(emoji, style: const TextStyle(fontSize: 26)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text(
          'تعديل الملف الشخصي',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryYellow))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    const SizedBox(height: 10),

                    // ═══ صورة الحساب التفاعلية ════════════════════════════
                    Center(
                      child: Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          GestureDetector(
                            onTap: _showAvatarPicker,
                            child: Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: const LinearGradient(
                                  colors: [AppTheme.primaryYellow, AppTheme.primaryOrange],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.primaryYellow.withAlpha(50),
                                    blurRadius: 18,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                _selectedAvatarEmoji,
                                style: const TextStyle(fontSize: 48),
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: _showAvatarPicker,
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppTheme.primaryYellow, width: 2),
                              ),
                              child: const Icon(Icons.camera_alt_rounded, size: 16, color: AppTheme.primaryYellow),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: _showAvatarPicker,
                      child: const Text(
                        'تغيير الصورة الرمزية',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          color: AppTheme.primaryYellow,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ═══ بطاقات الإحصائيات السريعة ═════════════════════════
                    if (_profileData != null)
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatItem('طلباتي', '${_profileData!['orders_count'] ?? 0}', '📦'),
                            _buildVerticalDivider(),
                            _buildStatItem('العناوين', '${_profileData!['saved_addresses_count'] ?? 0}', '📍'),
                            _buildVerticalDivider(),
                            _buildStatItem('المفضلة', '${_profileData!['favorites_count'] ?? 0}', '❤️'),
                          ],
                        ),
                      ),

                    const SizedBox(height: 24),

                    // ═══ حقل الاسم ════════════════════════════════════════
                    _buildInputField(
                      controller: _nameCtrl,
                      label: 'الاسم بالكامل',
                      hint: 'مثال: أحمد الشاذلي',
                      icon: Icons.person_outline_rounded,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'من فضلك أدخل اسمك';
                        if (val.trim().length < 2) return 'الاسم قصير جداً';
                        return null;
                      },
                    ),

                    const SizedBox(height: 18),

                    // ═══ حقل الهاتف (للقراءة فقط مع إشعار أمان) ═════════════
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'رقم الهاتف المرتبط',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            color: Colors.white70,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF131619),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Colors.white10),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.phone_android_rounded, color: Colors.white38, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _phone ?? '01000000000',
                                  textDirection: TextDirection.ltr,
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 15,
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const Icon(Icons.lock_outline_rounded, color: Colors.white30, size: 18),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'رقم الهاتف مؤكد ولا يمكن تغييره لحماية أمان حسابك',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            color: Colors.white38,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // ═══ حقل البريد الإلكتروني ════════════════════════════
                    _buildInputField(
                      controller: _emailCtrl,
                      label: 'البريد الإلكتروني (اختياري)',
                      hint: 'example@domain.com',
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      textDirection: TextDirection.ltr,
                      validator: (val) {
                        if (val != null && val.trim().isNotEmpty) {
                          final regex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                          if (!regex.hasMatch(val.trim())) return 'بريد إلكتروني غير صالح';
                        }
                        return null;
                      },
                    ),

                    const SizedBox(height: 36),

                    // ═══ زر الحفظ ═════════════════════════════════════════
                    ElevatedButton(
                      onPressed: _isSaving ? null : _saveProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryYellow,
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 4,
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                color: Colors.black,
                                strokeWidth: 2.5,
                              ),
                            )
                          : const Text(
                              'حفظ التعديلات ✨',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatItem(String label, String value, String icon) {
    return Column(
      children: [
        Text(
          '$icon $value',
          style: const TextStyle(
            fontFamily: 'Cairo',
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            color: Colors.white54,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      width: 1,
      height: 28,
      color: Colors.white12,
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    TextDirection? textDirection,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            color: Colors.white70,
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textDirection: textDirection,
          style: const TextStyle(
            fontFamily: 'Cairo',
            color: Colors.white,
            fontSize: 15,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.white30, fontFamily: 'Cairo', fontSize: 13),
            prefixIcon: Icon(icon, color: AppTheme.primaryYellow.withAlpha(200), size: 20),
            filled: true,
            fillColor: AppTheme.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppTheme.primaryYellow, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.redAccent),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
            ),
          ),
          validator: validator,
        ),
      ],
    );
  }
}
