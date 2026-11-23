// lib/theme/app_theme.dart
import 'package:flutter/material.dart';

class AppTheme {
  // ألوان سوقنا الأساسية
  static const Color primaryYellow = Color(0xFFFFB800);
  static const Color primaryOrange = Color(0xFFE8521A);
  static const Color darkTeal = Color(0xFF132B2A);
  static const Color headerTeal = Color(0xFF0F2423);
  static const Color background = Color(0xFF0B0D0E);
  static const Color cardBg = Color(0xFFF9F9F9);
  static const Color darkCardBg = Color(0xFF1A1C1E);
  static const Color surface = Color(0xFF18181D);
  static const Color textLight = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF1E1E1E);
  static const Color textGrey = Color(0xFF8E8E93);
  static const Color redDiscount = Color(0xFFE53935);
  static const Color gold = Color(0xFFFFB800);
  static const Color primary = Color(0xFFFFB800);

  static ThemeData get theme => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: background,
        primaryColor: primaryYellow,
        colorScheme: const ColorScheme.dark(
          primary: primaryYellow,
          secondary: primaryOrange,
          surface: surface,
        ),
        fontFamily: 'Cairo',
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: textLight,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFF121417),
          selectedItemColor: primaryYellow,
          unselectedItemColor: Color(0xFF757575),
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
        ),
      );
}
