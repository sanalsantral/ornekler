Yazıcıdan sipariş yazdırılmasını sağlar.Uygulamayı çalıştırmak için repo indirilir.Reponun içine auth.js dosyası oluşturulur.
Autj.js örneği

const kullaniciBilgiler = {
    ePosta:"*******",
    sifre:"********",
    printerIp:"***.***.**.***"
};  

module.exports = kullaniciBilgiler;

npm install ile kütüphaneler yüklenilir.

Terminalden node index.js ile uygulama çalıştırılır.