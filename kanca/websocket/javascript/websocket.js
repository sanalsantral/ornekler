var deneme = new WebSocket("wss://api.sanal.link/ws");
deneme.onopen = function() {
    var mesaj = {};
    mesaj["komut"] = "giris";
    mesaj["api_key"] = "111111111";
    mesaj["santral_id"] = "200";
    mesaj["dahili"] = "1007";
    deneme.send(JSON.stringify(mesaj));
};
deneme.onmessage = function(msg) {
    console.log(decodeURI(msg.data));
    var mesaj = JSON.parse(decodeURI(msg.data));
    if (mesaj.komut === "arayan") {
        console.log("Arayan:"+mesaj.komut);
        console.log("Tipi:"+mesaj.tipi);
    }
};