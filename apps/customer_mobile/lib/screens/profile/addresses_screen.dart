// lib/screens/profile/addresses_screen.dart
import 'package:flutter/material.dart';
import '../../models/address_model.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class AddressesScreen extends StatefulWidget {
  final bool selectMode;

  const AddressesScreen({super.key, this.selectMode = false});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  List<AddressModel> _addresses = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await ApiService.getAddresses();
      if (mounted) {
        setState(() {
          _addresses = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _setDefault(AddressModel address) async {
    try {
      await ApiService.setDefaultAddress(address.id);
      _loadAddresses();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'تم تعيين "${address.title}" كعنوان افتراضي 🌟',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll('Exception: ', ''),
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteAddress(AddressModel address) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text(
          'حذف العنوان؟',
          style: TextStyle(fontFamily: 'Cairo', color: AppTheme.textLight),
        ),
        content: Text(
          'هل أنت متأكد من رغبتك في حذف "${address.title}"؟',
          style: const TextStyle(fontFamily: 'Cairo', color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('حذف', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await ApiService.deleteAddress(address.id);
      _loadAddresses();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'تم حذف العنوان بنجاح',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll('Exception: ', ''),
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _openAddressSheet([AddressModel? address]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AddEditAddressSheet(
        address: address,
        onSaved: () {
          Navigator.pop(ctx);
          _loadAddresses();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Text(widget.selectMode ? 'اختر عنوان التوصيل' : 'عناويني المحفوظة 📍'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppTheme.textLight),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddressSheet(),
        backgroundColor: AppTheme.primaryYellow,
        icon: const Icon(Icons.add_location_alt, color: Colors.black),
        label: const Text(
          'إضافة عنوان جديد',
          style: TextStyle(
            fontFamily: 'Cairo',
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryYellow),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.location_off_outlined, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontFamily: 'Cairo', color: Colors.white70),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadAddresses,
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      );
    }

    if (_addresses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white12),
                ),
                child: const Center(
                  child: Text('📍', style: TextStyle(fontSize: 44)),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'مافيش عناوين محفوظة لسه',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'احفظ عناوينك زي البيت والشغل علشان تطلب بنقرة واحدة وتوصلك أكلتك سخنة ومظبوطة!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: Colors.white60,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => _openAddressSheet(),
                icon: const Icon(Icons.add, color: Colors.black),
                label: const Text(
                  'إضافة عنوانك الأول 🏠',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: Colors.black,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryYellow,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAddresses,
      color: AppTheme.primaryYellow,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        itemCount: _addresses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final addr = _addresses[index];
          return _AddressCard(
            address: addr,
            isSelectMode: widget.selectMode,
            onSelect: () => Navigator.pop(context, addr),
            onSetDefault: () => _setDefault(addr),
            onEdit: () => _openAddressSheet(addr),
            onDelete: () => _deleteAddress(addr),
          );
        },
      ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  final AddressModel address;
  final bool isSelectMode;
  final VoidCallback onSelect;
  final VoidCallback onSetDefault;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _AddressCard({
    required this.address,
    required this.isSelectMode,
    required this.onSelect,
    required this.onSetDefault,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isSelectMode ? onSelect : null,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: address.isDefault ? AppTheme.primaryYellow : Colors.white12,
            width: address.isDefault ? 1.5 : 1.0,
          ),
          boxShadow: address.isDefault
              ? [
                  BoxShadow(
                    color: AppTheme.primaryYellow.withAlpha(25),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withAlpha(50),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      address.labelIcon,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            address.title,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              color: AppTheme.textLight,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (address.isDefault) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primaryYellow.withAlpha(40),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: AppTheme.primaryYellow,
                                  width: 1,
                                ),
                              ),
                              child: const Text(
                                'الافتراضي ⭐',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  color: AppTheme.primaryYellow,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(
                        '${address.area} • ${address.city}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          color: AppTheme.primaryYellow,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isSelectMode)
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert, color: Colors.white60),
                    color: AppTheme.surface,
                    onSelected: (val) {
                      if (val == 'default') onSetDefault();
                      if (val == 'edit') onEdit();
                      if (val == 'delete') onDelete();
                    },
                    itemBuilder: (ctx) => [
                      if (!address.isDefault)
                        const PopupMenuItem(
                          value: 'default',
                          child: Text(
                            'تعيين كافتراضي 🌟',
                            style: TextStyle(fontFamily: 'Cairo', color: Colors.white),
                          ),
                        ),
                      const PopupMenuItem(
                        value: 'edit',
                        child: Text(
                          'تعديل ✏️',
                          style: TextStyle(fontFamily: 'Cairo', color: Colors.white),
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Text(
                          'حذف 🗑️',
                          style: TextStyle(fontFamily: 'Cairo', color: Colors.red),
                        ),
                      ),
                    ],
                  )
                else
                  const Icon(
                    Icons.arrow_forward_ios,
                    color: AppTheme.primaryYellow,
                    size: 16,
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              address.formattedAddress,
              style: const TextStyle(
                fontFamily: 'Cairo',
                color: Colors.white70,
                fontSize: 13,
                height: 1.4,
              ),
            ),
            if (address.phone != null && address.phone!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.phone_iphone, size: 14, color: Colors.white54),
                  const SizedBox(width: 4),
                  Text(
                    address.phone!,
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      color: Colors.white54,
                      fontSize: 12,
                    ),
                    textDirection: TextDirection.ltr,
                  ),
                ],
              ),
            ],
            if (isSelectMode) ...[
              const SizedBox(height: 10),
              Container(
                alignment: Alignment.centerLeft,
                child: const Text(
                  'اضغط للاختيار والتوصيل هنا 🛵',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.primaryYellow,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AddEditAddressSheet extends StatefulWidget {
  final AddressModel? address;
  final VoidCallback onSaved;

  const AddEditAddressSheet({super.key, this.address, required this.onSaved});

  @override
  State<AddEditAddressSheet> createState() => _AddEditAddressSheetState();
}

class _AddEditAddressSheetState extends State<AddEditAddressSheet> {
  final _formKey = GlobalKey<FormState>();
  late String _selectedLabel;
  late TextEditingController _titleCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _areaCtrl;
  late TextEditingController _streetCtrl;
  late TextEditingController _buildingCtrl;
  late TextEditingController _floorCtrl;
  late TextEditingController _apartmentCtrl;
  late TextEditingController _landmarkCtrl;
  late TextEditingController _phoneCtrl;
  late bool _isDefault;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final a = widget.address;
    _selectedLabel = a?.label ?? 'home';
    _titleCtrl = TextEditingController(text: a?.title ?? (_selectedLabel == 'home' ? 'المنزل' : (_selectedLabel == 'work' ? 'العمل' : 'عنوان آخر')));
    _cityCtrl = TextEditingController(text: a?.city ?? 'القاهرة');
    _areaCtrl = TextEditingController(text: a?.area ?? '');
    _streetCtrl = TextEditingController(text: a?.street ?? '');
    _buildingCtrl = TextEditingController(text: a?.building ?? '');
    _floorCtrl = TextEditingController(text: a?.floor ?? '');
    _apartmentCtrl = TextEditingController(text: a?.apartment ?? '');
    _landmarkCtrl = TextEditingController(text: a?.landmark ?? '');
    _phoneCtrl = TextEditingController(text: a?.phone ?? '');
    _isDefault = a?.isDefault ?? true;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _cityCtrl.dispose();
    _areaCtrl.dispose();
    _streetCtrl.dispose();
    _buildingCtrl.dispose();
    _floorCtrl.dispose();
    _apartmentCtrl.dispose();
    _landmarkCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _onLabelChanged(String label, String defaultTitle) {
    setState(() {
      _selectedLabel = label;
      if (_titleCtrl.text.isEmpty ||
          _titleCtrl.text == 'المنزل' ||
          _titleCtrl.text == 'العمل' ||
          _titleCtrl.text == 'أخرى') {
        _titleCtrl.text = defaultTitle;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final payload = {
      'label': _selectedLabel,
      'title': _titleCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'area': _areaCtrl.text.trim(),
      'street': _streetCtrl.text.trim(),
      'building': _buildingCtrl.text.trim().isEmpty ? null : _buildingCtrl.text.trim(),
      'floor': _floorCtrl.text.trim().isEmpty ? null : _floorCtrl.text.trim(),
      'apartment': _apartmentCtrl.text.trim().isEmpty ? null : _apartmentCtrl.text.trim(),
      'landmark': _landmarkCtrl.text.trim().isEmpty ? null : _landmarkCtrl.text.trim(),
      'phone': _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      'is_default': _isDefault,
    };

    try {
      if (widget.address == null) {
        await ApiService.createAddress(payload);
      } else {
        await ApiService.updateAddress(widget.address!.id, payload);
      }
      widget.onSaved();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().replaceAll('Exception: ', ''),
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
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
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      child: Form(
        key: _formKey,
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
              Text(
                widget.address == null ? 'إضافة عنوان جديد 📍' : 'تعديل العنوان ✏️',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppTheme.textLight,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              // اختيار نوع العنوان
              Row(
                children: [
                  _TypeChip(
                    icon: '🏠',
                    label: 'المنزل',
                    selected: _selectedLabel == 'home',
                    onTap: () => _onLabelChanged('home', 'المنزل'),
                  ),
                  const SizedBox(width: 8),
                  _TypeChip(
                    icon: '🏢',
                    label: 'العمل',
                    selected: _selectedLabel == 'work',
                    onTap: () => _onLabelChanged('work', 'العمل'),
                  ),
                  const SizedBox(width: 8),
                  _TypeChip(
                    icon: '📍',
                    label: 'أخرى',
                    selected: _selectedLabel == 'other',
                    onTap: () => _onLabelChanged('other', 'عنوان آخر'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // اسم العنوان
              _InputField(
                controller: _titleCtrl,
                label: 'اسم العنوان (مثلاً: بيت العيلة، مكتبي)',
                icon: Icons.bookmark_border,
                validator: (v) => v == null || v.trim().isEmpty ? 'ادخل اسم العنوان' : null,
              ),
              const SizedBox(height: 12),
              // المنطقة والمدينة
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: _InputField(
                      controller: _areaCtrl,
                      label: 'المنطقة / الحي (مثلاً: المعادي)',
                      icon: Icons.map_outlined,
                      validator: (v) => v == null || v.trim().isEmpty ? 'ادخل المنطقة' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 1,
                    child: _InputField(
                      controller: _cityCtrl,
                      label: 'المدينة',
                      icon: Icons.location_city,
                      validator: (v) => v == null || v.trim().isEmpty ? 'ادخل المدينة' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // الشارع
              _InputField(
                controller: _streetCtrl,
                label: 'اسم الشارع (مثلاً: شارع 9)',
                icon: Icons.add_road,
                validator: (v) => v == null || v.trim().isEmpty ? 'ادخل اسم الشارع' : null,
              ),
              const SizedBox(height: 12),
              // العمارة والدور والشقة
              Row(
                children: [
                  Expanded(
                    child: _InputField(
                      controller: _buildingCtrl,
                      label: 'رقم العمارة',
                      icon: Icons.apartment,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _InputField(
                      controller: _floorCtrl,
                      label: 'الدور',
                      icon: Icons.stairs,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _InputField(
                      controller: _apartmentCtrl,
                      label: 'رقم الشقة',
                      icon: Icons.door_front_door_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // علامة مميزة
              _InputField(
                controller: _landmarkCtrl,
                label: 'علامة مميزة (مثلاً: بجوار صيدلية العزبي)',
                icon: Icons.flag_outlined,
              ),
              const SizedBox(height: 12),
              // رقم هاتف إضافي
              _InputField(
                controller: _phoneCtrl,
                label: 'رقم هاتف إضافي للتواصل (اختياري)',
                icon: Icons.phone,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 12),
              // تعيين كافتراضي
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                activeColor: AppTheme.primaryYellow,
                checkColor: Colors.black,
                title: const Text(
                  'تعيين كعنوان افتراضي للطلبات القادمة ⭐',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    color: AppTheme.textLight,
                    fontSize: 13,
                  ),
                ),
                value: _isDefault,
                onChanged: (val) => setState(() => _isDefault = val ?? false),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
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
                        widget.address == null ? 'حفظ العنوان 📍' : 'تحديث العنوان ✨',
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
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TypeChip({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppTheme.primaryYellow.withAlpha(40) : AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppTheme.primaryYellow : Colors.white12,
              width: selected ? 1.5 : 1.0,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  color: selected ? AppTheme.primaryYellow : Colors.white70,
                  fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType keyboardType;

  const _InputField({
    required this.controller,
    required this.label,
    required this.icon,
    this.validator,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      textDirection: TextDirection.rtl,
      keyboardType: keyboardType,
      style: const TextStyle(
        fontFamily: 'Cairo',
        color: AppTheme.textLight,
        fontSize: 14,
      ),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          fontFamily: 'Cairo',
          color: Colors.white54,
          fontSize: 12,
        ),
        prefixIcon: Icon(icon, color: AppTheme.primaryYellow, size: 20),
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
    );
  }
}
