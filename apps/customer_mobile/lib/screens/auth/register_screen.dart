// lib/screens/auth/register_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../home/home_screen.dart';

class RegisterScreen extends StatefulWidget {
  final String otp;
  const RegisterScreen({super.key, required this.otp});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final ok = await auth.register(_nameCtrl.text.trim(), widget.otp);
    if (!mounted) return;
    if (ok) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (_) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'حدث خطأ'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
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
                  const Text(
                    'مرحباً بيك! 🎉',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textLight,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'اسمك إيه؟ عشان نعرف نناديك صح 😊',
                    style: TextStyle(
                      fontSize: 15,
                      color: AppTheme.textGrey,
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 48),
                  TextFormField(
                    controller: _nameCtrl,
                    textDirection: TextDirection.rtl,
                    style: const TextStyle(color: AppTheme.textLight, fontSize: 18),
                    decoration: const InputDecoration(
                      labelText: 'الاسم',
                      hintText: 'مثلاً: أحمد محمد',
                      prefixIcon: Icon(Icons.person, color: AppTheme.primary),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'ادخل اسمك';
                      if (v.trim().length < 2) return 'الاسم قصير أوي';
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: auth.state == AuthState.loading ? null : _register,
                    child: auth.state == AuthState.loading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text('يلا نبدأ! 🚀'),
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
