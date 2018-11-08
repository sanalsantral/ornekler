package tr.com.sanalsantral.websocketdemo;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.WebSocket;


public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Client oluşturulur.
        OkHttpClient client = new OkHttpClient();

        // Request objesi oluşturulur.
        Request request = new Request.Builder()
                .url("wss://api.sanal.link/ws")
                // "Origin" header'ı ayarlanır.
                .header("Origin", "socket.doyadoyaal.com")
                .build();

        // Dinleyici sınıfı atanır
        WebsocketListener listener = new WebsocketListener();

        // Websocket başlatılır
        WebSocket ws = client.newWebSocket(request, listener);

        client.dispatcher().executorService().shutdown();
    }
}
