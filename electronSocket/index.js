const path = require('path');
const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    ipcMain,
    dialog
} = require('electron');
const fs = require('fs');
const url = require('url');
const {
    shell
} = require('electron');
const WebSocket = require('ws');
let tray = null;
let count = 0;

function logla(str) {
    return new Promise((resolve, reject) => {
        let date = new Date(Date.now());
        let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        fs.appendFile(path.resolve(__dirname, 'gelenCagrilar.txt'), str + ' ' + formatted_date + '\n', function (err) {
            if (err) {
                reject();
                return;
            }
            resolve();
            return;
        });
    });
}

let baglandi = false;
let ws;
let win

function wsMain(newSocketData) {

    if (newSocketData.api_key !== '' &&
        newSocketData.dahili_ayrac !== '' &&
        newSocketData.dahili_no !== '' &&
        newSocketData.santral_id !== ''
    ) {
        let msg = {
            api_key: newSocketData.api_key,
            dahili_ayrac: newSocketData.dahili_ayrac,
            dahili_no: newSocketData.dahili_no,
            komut: 'giris',
            santral_id: newSocketData.santral_id,
        };
        ws = new WebSocket('wss://api.sanal.link/comm', {
            perMessageDeflate: false
        });
        msg = JSON.stringify(msg);
        const randomId = Math.floor(Math.random() * 10000);
        const message = typeof msg === typeof '' ? {
                msg,
                id: randomId
            } :
            Object.assign({}, msg, {
                id: msg.id || randomId,
            });
        ws.on('open', function open() {
            ws.send(message.msg);
        });
        ws.on('message', function incoming(e) {            
            try {
                const wssmessage = JSON.parse(JSON.parse(decodeURIComponent(e)).message);
                if (wssmessage.hata === true) {
                    logla('Hata:' + wssmessage.aciklama);
                } else {
                    if (wssmessage.komut === 'giris') {            
                        logla('Socket bağlantısı sağlandı.');
                        baglandi=true
                        win.hide()
                    } else if (baglandi && wssmessage.komut === 'arayan') {
                        if (wssmessage.olay === 'dial') {
                            let donus = shell.openItem(`infinia:${wssmessage.arayan}`);
                            if (donus) {
                                logla('Çalıştırıldı:' + wssmessage.arayan);
                            } else logla('Çalışmadı!!! - ' + wssmessage.arayan);
                        }
                    }
                }
            } catch (err) {
                logla('Parse hatası:' + err.message);
            }
        });
        ws.on('error', function (err) {
            count++;
            if (count === 3) {
                dialog.showErrorBox('Hata', 'Soket bağlantısı sağlanamadı. Uygulamayı tekrar çalıştırınız.');
                count = 0;
            } else {
                wsMain(newSocketData);
            }
        });
    } else {
        dialog.showErrorBox('Hata', 'Ayarlar geçersiz. Lütfen tekrar kontrol ediniz.');
    }
}

let newSocketData = "";

async function main() {
    try {
        win = new BrowserWindow({
            width: 400,
            height: 650,
            webPreferences: {
                nodeIntegration: true
            },
            title: 'Sanal Santral',
            icon: path.resolve(__dirname, 'image', 'amblem32x32.png'),
            show: false
        });
        win.webContents.openDevTools();
        const gotTheLock = app.requestSingleInstanceLock()
        await logla('Uygulama başladı.');
        if (!gotTheLock) {
            app.quit();
            dialog.showErrorBox('Hata', 'Uygulama çalışmaktadır.');     
        }
        tray = new Tray(path.resolve(__dirname, 'image', 'amblem32x32.png'));
        tray.on('click', () => {
            win.isVisible() ? win.hide() : win.show()
        })
        tray.setContextMenu(Menu.buildFromTemplate([{
            label: 'Exit',
            click: () => {
                process.exit(0);
            },
        },
        {
            label: 'Open',
            click: () => {
                win.show()
            },
        }
        ]))
        win.setMenu(null);
        const fpath = path.join(__dirname, 'websocket.html');
        if (process.platform === 'linux') {
            win.loadURL(`file:${fpath}`);
        } else if (process.platform === 'darwin') {            
            win.loadURL(`file:${fpath}`);
        } else {
            win.loadURL(fpath);
        }
        win.on('close', function (e) {
            e.preventDefault();
            win.hide();
        });
        
        ipcMain.on('socketData', function (event, arg) {
            fs.writeFileSync(path.resolve(__dirname, 'info.json'), JSON.stringify(arg, null, 2), 'utf-8');
            wsMain(arg);
            if (baglandi) ws.close();
        });
        let bilgiler;
        try {
            let data = fs.readFileSync(path.resolve(__dirname, 'info.json'), "utf8");
            if (data === undefined) {
                win.show();
            } else {
                bilgiler = JSON.parse(data);
                ipcMain.on('infoData', (event, arg) => {
                    event.sender.send('infoRes', bilgiler);
                });
                wsMain(bilgiler);
                win.hide();
            }
        } catch (err) {
            await logla('Dosya okunurken hata oluştu:' + err.message);
            win.show();
        }
        return win;
    } catch (err) {
        dialog.showErrorBox('Ana Pencere Hata', err.message);
        app.quit();
    }
}

app.on('ready', main);

app.on('quit', function() {
    process.exit(0);
});