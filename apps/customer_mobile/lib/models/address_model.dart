// lib/models/address_model.dart

class AddressModel {
  final String id;
  final String userId;
  final String label; // home, work, other
  final String title;
  final String city;
  final String area;
  final String street;
  final String? building;
  final String? floor;
  final String? apartment;
  final String? landmark;
  final String? phone;
  final double? latitude;
  final double? longitude;
  final bool isDefault;
  final String formattedAddress;
  final String labelIcon;

  AddressModel({
    required this.id,
    required this.userId,
    required this.label,
    required this.title,
    required this.city,
    required this.area,
    required this.street,
    this.building,
    this.floor,
    this.apartment,
    this.landmark,
    this.phone,
    this.latitude,
    this.longitude,
    required this.isDefault,
    required this.formattedAddress,
    required this.labelIcon,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    String computedFormatted = json['formatted_address'] ?? '';
    if (computedFormatted.isEmpty) {
      final parts = <String>[];
      if (json['street'] != null && json['street'].toString().isNotEmpty) {
        parts.add(json['street'].toString());
      }
      if (json['building'] != null && json['building'].toString().isNotEmpty) {
        parts.add('عمارة ${json['building']}');
      }
      if (json['floor'] != null && json['floor'].toString().isNotEmpty) {
        parts.add('الدور ${json['floor']}');
      }
      if (json['apartment'] != null && json['apartment'].toString().isNotEmpty) {
        parts.add('شقة ${json['apartment']}');
      }
      if (json['area'] != null && json['area'].toString().isNotEmpty) {
        parts.add(json['area'].toString());
      }
      if (json['city'] != null && json['city'].toString().isNotEmpty) {
        parts.add(json['city'].toString());
      }
      if (json['landmark'] != null && json['landmark'].toString().isNotEmpty) {
        parts.add('(علامة: ${json['landmark']})');
      }
      computedFormatted = parts.join('، ');
    }

    String labelVal = json['label']?.toString().toLowerCase() ?? 'home';
    String iconVal = json['label_icon'] ?? (labelVal == 'work' ? '🏢' : (labelVal == 'home' ? '🏠' : '📍'));

    return AddressModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      label: labelVal,
      title: json['title']?.toString() ?? 'عنواني',
      city: json['city']?.toString() ?? 'القاهرة',
      area: json['area']?.toString() ?? '',
      street: json['street']?.toString() ?? '',
      building: json['building']?.toString(),
      floor: json['floor']?.toString(),
      apartment: json['apartment']?.toString(),
      landmark: json['landmark']?.toString(),
      phone: json['phone']?.toString(),
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      isDefault: json['is_default'] == true || json['is_default'] == 1 || json['is_default'] == '1',
      formattedAddress: computedFormatted,
      labelIcon: iconVal,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'label': label,
      'title': title,
      'city': city,
      'area': area,
      'street': street,
      'building': building,
      'floor': floor,
      'apartment': apartment,
      'landmark': landmark,
      'phone': phone,
      'latitude': latitude,
      'longitude': longitude,
      'is_default': isDefault,
    };
  }
}
