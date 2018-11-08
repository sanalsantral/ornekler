package tr.com.sanalsantral.websocketdemo;

import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

public class WebsocketListener extends WebSocketListener { private static final int NORMAL_CLOSURE_STATUS = 1000;


    // Socket açıldığında çalışacak olan method
    @Override
    public void onOpen(WebSocket webSocket, Response response) {
        // Santral api giriş komutu
        webSocket.send("{komut: \"giris\", api_key: \"12345\", santral_id: \"1234\", dahili: \"1234\"}");
        // Socket bağlantısı sonlandırılır
        webSocket.close(NORMAL_CLOSURE_STATUS, "Bağlantı sonlandırıldı");
    }


    // Socket'e mesaj düştüğünde çalışacak olan method
    @Override
    public void onMessage(WebSocket webSocket, String text) {
        System.out.println("Gelen: " + text);
    }

    // Socket kapandığında çalışacak olan method
    @Override
    public void onClosing(WebSocket webSocket, int code, String reason) {
        webSocket.close(NORMAL_CLOSURE_STATUS, null);
        System.out.println("Kapatılıyor: " + code + " " + reason);
    }

    // Socket hata durumunda çalışacak olan method
    @Override
    public void onFailure(WebSocket webSocket, Throwable t, Response response) {
        t.printStackTrace();
    }

}
