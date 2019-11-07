const axios = require('axios');
const escpos = require('escpos');
const kullaniciBilgiler = require('../printerPos/auth')


const headers = {
    'Content-Type':'application/json',
    'User-Agent':'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36',
    'Origin':'https://reyhanpastanesi.bulut4.com',
    'Accept':'application/json;charset=UTF-8',
    'x-access-token':''
};

function print(ip, detay) {
    return new Promise((resolve,reject) => {
        const options = { encoding: "CP857" };
        try {
            const device = new escpos.Network(ip, 9100);
            const printer = new escpos.Printer(device, options);
            device.open(err =>{
                console.log('Yazıcı açıldı.');
                if (err) {
                    reject(err.message);
                } else {
                    printer
                        .font('a')
                        .align('lt')
                        .size(1,2)
                        .text(detay)
                        .cut()
                        .close(()=>{
                            resolve();
                            console.log('Yazdırıldı');
                        });
                }
            });
        } catch (err) {
            console.log(`Ağ yazıcı tanımlanırken hata oluştu: ${err.message}`);
            reject(`Ağ yazıcı tanımlanırken hata oluştu: ${err.message}`);
        }
    });
}

async function islemler(Kisidata) {
    const result = await axios.post('https://reyhanpastanesi.bulut4.com/func/login/girisToken', {
            ePosta: Kisidata.ePosta,
            sifre: Kisidata.sifre,                         
        }, {
            headers:headers
        });
    if (result.data.hata) {   
        return result.data.aciklama;
    } else {
        axios.defaults.headers.common = {
            'x-access-token':result.data.token
        };
        const res = await axios.get('https://reyhanpastanesi.bulut4.com/func/finans/siparis/liste', {
            params: {
                take: 20,
                skip: 0,
                page: 1,
                pageSize: 20
            }
        }, { headers:headers });
        if (res.data.veri.length === 0) {
            console.log('Sipariş yok.');
            return '';
        } else {
            let veri = [];
            res.data.veri.map(instance => {
                if (instance.durum === 'Yeni Sipariş') {
                    veri.push({
                        siparisBilgi: instance,
                        siparisID: instance.id,
                        tutar: instance.tutar,
                        kullaniciId: instance.kullanici_id
                    });
                }
            });
            if (veri.length === 0){
                return 'Yazdırılacak Sipariş Yok';
            } else console.log(`Bulunan sipariş sayısı: ${veri.length}`);
            let obj = {
                data: veri,
                ip: Kisidata.ip,
                token: result.data.token
            };
            headers["x-access-token"] = obj.token;
            let data = {
                urun:'',
                ip:''
            };
            try {
                for (let sip of obj.data) {
                    let instance = {
                        tutar: sip.tutar,
                        id: sip.siparisID,
                        adi: sip.siparisBilgi.adi_soyadi,
                        kullaniciId: sip.kullaniciId,
                        teslimatAdresId: sip.siparisBilgi.teslimat_adres_id
                    };
                    const resAdres = await axios.get(`https://reyhanpastanesi.bulut4.com/func/crm/musteri/adres/${instance.kullaniciId}`);
                    const result = await axios.get(`https://reyhanpastanesi.bulut4.com/func/crm/musteri/iletisim/${instance.kullaniciId}`);
                    const resDetay = await axios.get(`https://reyhanpastanesi.bulut4.com/func/finans/siparis/detayListe/${instance.id}`);
                    let adresler = resAdres.data.veri;
                    let telefonlar=result.data.veri;
                    let spaceTitle="\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0";
                    let spaceTitle2="\xa0\xa0\xa0"
                    let spaceFiyat="\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0"
                    let adi="Ürün Adı";
                    let adet="Adet";
                    let space="\xa0";
                    
                    let Detay="Müşteri Adı:"+instance.adi+"\n\n";
                    Detay=Detay.concat("Müşteri Telefon:"+telefonlar[0].deger+"\n\n")
                    for(i=0;i<adresler.length;i++){
                        if(adresler[i].id===instance.teslimatAdresId){
                            Detay=Detay.concat("Müşteri Adresi:"+adresler[i].adres+"\n\n")
                        }
                    }
                    Detay=Detay.concat("Sipariş No:"+instance.id+"\n\n");
                    Detay=Detay.concat(adi+spaceTitle+adet+spaceTitle2+"Fiyat\n\n");
                    resDetay.data.veri.map(i=>{
                        let length1=spaceTitle.length+adi.length-i.kalem_stok_adi.length;
                        let length2=spaceTitle2.length+adet.length-i.adet
                        oneSpace="\xa0";
                        twoSpace="\xa0";
                        for(j=0;j<length1-1;j++)
                        {
                            oneSpace=oneSpace+"\xa0"
                        }
                        for(k=0;k<length2-1;k++){
                            twoSpace=twoSpace+"\xa0"
                        }
                        if(i.kalem_stok_adi.length<33)
                        {
                            Detay=Detay.concat(i.kalem_stok_adi+oneSpace+i.adet+twoSpace+i.fiyat+"\n");
                        }
                        else{
                            thirdSpace="\xa0";
                            let parca1=i.kalem_stok_adi.substring(0,i.kalem_stok_adi.search(" "));
                            let parca2=i.kalem_stok_adi.substring(i.kalem_stok_adi.search(" ")+1,i.kalem_stok_adi.length);
                            let length3=spaceTitle.length+adi.length-parca2.length;
                            for(m=0;m<length3-1;m++){
                                thirdSpace=thirdSpace+"\xa0"
                            }
                            Detay=Detay.concat(parca1+"\n"+parca2+thirdSpace+i.adet+twoSpace+i.fiyat+"\n");
                        }
                    });
                    Detay=Detay.concat("\n"+spaceFiyat+"Toplam Fiyat:"+instance.tutar+"\n\n\n");
                    data = {
                        urun: res,
                        ip: obj.ip
                    };
                    try {
                        await print(obj.ip, Detay);
                    } catch (err) {
                        console.log(`Printer hatası: ${err}`);
                        throw new Error(`Printer hatası: ${err}`);
                    }
                }
            } catch (err) {
                console.log(`Sipariş okunması sırasında hata oluştu: ${err.message}`);
                return false;
            }
            try {
                obj.data.map(async instance => {
                    await axios.post(`https://reyhanpastanesi.bulut4.com/func/finans/siparis/bilgi/update/${instance.siparisBilgi.id}`,{
                            adi_soyadi:instance.siparisBilgi.adi_soyadi,
                            id:instance.siparisBilgi.id,
                            siparis_tarihi:instance.siparisBilgi.siparis_tarihi,
                            tutar:instance.siparisBilgi.tutar,
                            sirket_unvani:instance.siparisBilgi.sirket_unvani,
                            fatura_id:instance.siparisBilgi.fatura_id,
                            fatura_tarihi:instance.siparisBilgi.fatura_tarihi,
                            fatura_kesildi:instance.siparisBilgi.fatura_kesildi,
                            durum:9063,
                            onay:instance.siparisBilgi.onay,
                            kullanici_id:instance.siparisBilgi.kullanici_id,
                            odendi:instance.siparisBilgi.odendi
                        }, { headers:headers });
                });
            } catch (err) {
                console.log(`Sipariş güncelleme sırasında hata oluştu: ${err.message}`);
                return false;
            }
        }
    }
    
}

if (kullaniciBilgiler.sifre && kullaniciBilgiler.ePosta) {
    let Kisidata={
        ePosta:kullaniciBilgiler.ePosta,
        sifre:kullaniciBilgiler.sifre,
        ip:kullaniciBilgiler.printerIp
    };
    islemler(Kisidata)
        .then(res => console.log(res));
}
