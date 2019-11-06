### printerPos

Yazıcıdan sipariş yazdırılmasını sağlar.Uygulamayı çalıştırmak için repo indirilir.Reponun içine auth.js dosyası oluşturulur.

### Örnek Auth.js

```
const kullaniciBilgiler = {
    ePosta:"*******",
    sifre:"********",
    printerIp:"***.***.**.***"
}; 
```

module.exports = kullaniciBilgiler;

npm install ile kütüphaneler yüklenilir.

Terminalden node index.js ile uygulama çalıştırılır.
