// lib/screens/auth/phone_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../home/home_screen.dart';
import 'otp_screen.dart';

class PhoneScreen extends StatefulWidget {
  const PhoneScreen({super.key});

  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  final _phoneCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    await auth.sendOtp(_phoneCtrl.text.trim());
    if (!mounted) return;
    if (auth.state == AuthState.otpSent) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const OtpScreen()),
      );
    } else {
      // في حالة تعذر الوصول للشبكة المحلية، المتابعة بنمط التجربة المباشر
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('تعذر الوصول للسيرفر المحلي - جاري المتابعة برقمك في نمط التجربة 🚀'),
          backgroundColor: AppTheme.primaryOrange,
          duration: Duration(seconds: 2),
        ),
      );
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const OtpScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A0A00), AppTheme.background],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 60),
                  // لوجو
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Center(
                      child: Text('🍽️', style: TextStyle(fontSize: 40)),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'أهلاً بيك! 👋',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textLight,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'ادخل رقم موبايلك وهنبعتلك كود تحقق',
                    style: TextStyle(
                      fontSize: 15,
                      color: AppTheme.textGrey,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 48),
                  // رقم الموبايل
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    textDirection: TextDirection.ltr,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    maxLength: 11,
                    style: const TextStyle(
                      color: AppTheme.textLight,
                      fontSize: 20,
                      letterSpacing: 3,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'رقم الموبايل',
                      hintText: '010XXXXXXXX',
                      counterText: '',
                      prefixIcon: Icon(Icons.phone_android, color: AppTheme.primary),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'ادخل رقم الموبايل';
                      if (v.length < 10) return 'رقم غير صحيح';
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),
                  // زر
                  ElevatedButton(
                    onPressed: auth.state == AuthState.loading ? null : _submit,
                    child: auth.state == AuthState.loading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('ابعت الكود'),
                  ),
                  const SizedBox(height: 16),
                  // تخطي كزائر
                  TextButton(
                    onPressed: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                      );
                    },
                    child: const Text(
                      'تخطي والتصفح كزائر ←',
                      style: TextStyle(
                        color: AppTheme.primaryYellow,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                  const Spacer(),
                  // Footer
                  const Padding(
                    padding: EdgeInsets.only(bottom: 24),
                    child: Text(
                      'سوقنا .. لقطة في كل حاجة',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppTheme.textGrey,
                        fontSize: 13,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
