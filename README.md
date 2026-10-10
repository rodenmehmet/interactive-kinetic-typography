# Word in Motion — Yönetim panelli tam proje
10 Ekim 2026. Mevcut sitenin güncel görünümü, 45 ana videosu, telefon sürümleri, logo, kart ve slider görselleri dahil edilmiştir.

## Bilgisayarda çalıştırma
1. Node.js 22 veya üzeri kurulu olmalıdır.
2. Windows'ta BASLAT.cmd dosyasına çift tıklayın. Alternatif: npm start.
3. Tarayıcıdan http://localhost:3000 adresini açın.
4. Yönetim paneli: http://localhost:3000/admin.
5. İlk çalıştırmada yönetim şifresi otomatik oluşturulur; admin-password.txt dosyasındadır. Bu dosyayı GitHub'a yüklemeyin.

## Panel
Video ekleme/değiştirme/silme, kelime adı ve isteğe bağlı Türkçe karşılık, telefon videosu, logo, kart ve slider görselleri, tasarım ayarları ve sloganlar çalışır. Giriş bu bağımsız kopyada yönetim şifresiyle yapılır; ChatGPT hesabına bağlı değildir. Ana sitedeki öğrenci izleme akışı korunur.

## GitHub ve hosting
Bu tam proje GitHub'a konabilir; GitHub Pages'te sunucu çalışmaz. Yayın için Node.js 22 destekli sunucu veya Docker hosting kullanın.
Başlatma komutu: npm start. İnternette NODE_ENV=production, güçlü ADMIN_PASSWORD ve doğru PUBLIC_ORIGIN ayarlayın. HTTPS kullanın. DATA_DIR değerini kalıcı diskte bir klasöre bağlayın. Docker için /data kalıcı disk olmalıdır. Şifreyi ortam değişkeninden verin; repoya yazmayın.
Başlangıç videoları initial-data klasöründedir. Yüklenen/değiştirilen dosyalar ve ayarlar DATA_DIR altında kalır. Kalıcı disk olmadan yeniden dağıtımda değişiklikler kaybolabilir. Yalnızca tek sunucu örneği bu diske yazmalıdır.

## Yedek
initial-data başlangıç arşividir; değiştirmeyin. Güncel kayıtları korumak için storage (veya DATA_DIR) klasörünün tamamını yedekleyin. Sonradan değiştirilmiş eski dosyalar veri kaybını önlemek için depolamada tutulur. Yerel yönetim şifresi ve oturumlar GitHub'a dahil edilmez; sunucu yeniden başlayınca tekrar giriş yapılır.
Mevcut chatgpt.site yayınına bağlı değildir ve orayı değiştirmez. Panelde bu kopyada yaptığınız değişiklikler yalnızca bu kopyada görünür.
