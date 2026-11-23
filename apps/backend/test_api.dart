import 'dart:convert';
import 'dart:io';

void main() async {
  final client = HttpClient();
  final request = await client.getUrl(Uri.parse('https://true-signs-grow.loca.lt/api/v1/reels'));
  request.headers.set('accept', 'application/json');
  request.headers.set('bypass-tunnel-reminder', 'true');
  final response = await request.close();
  final resBody = await response.transform(utf8.decoder).join();
  client.close();

  final json = jsonDecode(resBody);
  print('API Response success: ${json['success']}');
  final list = json['data'] as List;
  print('Reels count: ${list.length}');
  for (var r in list) {
    print('Reel title: ${r['title']}');
  }
}
