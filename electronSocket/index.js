const path = require('path');
const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    ipcMain,
    dialog,
    shell,
    ipcRenderer,
} = require('electron');
const shellJs = require('shelljs');
const fs = require('fs');
const url = require('url');
const axios = require('axios');
const WebSocket = require('ws');
const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const originalFs = require('original-fs');

if (handleSquirrelEvent(app)) {
    return;
}


let tray = null;

let appPath = "";
// process.noAsar = true;

if (process.platform === "win32") {
    appPath = app.getAppPath().split('\\')
} else {
    appPath = app.getAppPath().split('/')
}
function logla(str) {
    return new Promise((resolve, reject) => {
        let date = new Date(Date.now());
        let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        if (appPath[appPath.length - 1] === 'electronSocket' || appPath[appPath.length - 1] === 'app') {
            fs.appendFile(path.resolve(__dirname, 'gelenCagrilar.txt'), str + ' ' + formatted_date + "\n", function (err) {
                if (err) {
                    reject();
                    return;
                }
                resolve();
                return;
            });
        } else {
            fs.appendFile(app.getAppPath() + '\\..\\..\\gelenCagrilar.txt', str + ' ' + formatted_date + "\n", function (err) {
                if (err) {
                    reject();
                    return;
                }
                resolve();
                return;
            });
        }
    });
}

async function createDatabase(arg) {
    try {
        let yol = `${moment(arg.baslangic_tarih).format('DD.MM.YYYY')}-${moment(arg.bitis_tarih).format('DD.MM.YYYY')}`
        let conn = {
            filename: path.join(__dirname, `/${yol}/${yol}.db`)
        };
        let knex = require('knex')
            ({
                client: 'sqlite3',
                connection: conn,
                useNullAsDefault: true,
                pool: {
                    min: 1,
                    max: 3,
                }
            });
        await knex.schema.raw('CREATE TABLE `cdr` (`cagri_yonu`	varchar ( 255 ),`caller_id`	varchar ( 255 ),`cevaplayanlar`	varchar ( 255 ),`defter_adi`	varchar ( 255 ),`durum`	varchar ( 255 ),`hedef`	varchar ( 255 ),`kaynak`	varchar ( 255 ),`linkedid`	varchar ( 255 ),`ses_var`	boolean,`sure`	integer,`unique_id`	integer,`zaman`	varchar ( 255 ));')
        /*
        await knex.schema.createTable('cdr', (table) => {
            logla("table")
            table.string('cagri_yonu')
            table.string('caller_id')
            table.string('cevaplayanlar')
            table.string('defter_adi')
            table.string('durum')
            table.string('hedef')
            table.string('kaynak')
            table.string('linkedid')
            table.boolean('ses_var')
            table.integer('sure')
            table.integer('unique_id')
            table.string('zaman')
        })
        */
        logla("tablo oluşturuldu")
    } catch (err) {
        knex('cdr').del().then(() => {
            logla("tablodaki veriler başarılı bir şekilde silindi.")
        })
    }
}

function fileCopy(arg) {
    return new Promise((resolve, reject) => {
        // console.log(arg.numara.substring(1,arg.numara.length))
        fs.mkdir(path.resolve(__dirname, `../../${arg.numara.substring(1,arg.numara.length)}_${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}`), function () {
            logla("klasör oluşturuldu:" + __dirname);
            fs.mkdir(path.resolve(__dirname, `../../${arg.numara.substring(1,arg.numara.length)}_${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}/sesler`), function () {
                logla("klasör oluşturuldu:" + path.resolve(__dirname, `../../${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}/sesler`));
                let copyPath = `${arg.numara.substring(1,arg.numara.length)}_${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}`;
                fs.mkdirSync(path.resolve(__dirname, `../../${copyPath}/db`));
                let src;
                let dbSrc;
                let dist = path.join(__dirname, `../../${copyPath}/SanalSantralPlayer.exe`);
                let dbDist = path.join(__dirname, `../../${copyPath}/db/cdr.db`);
                if (process.platform === 'linux') {
                    src = path.join(__dirname, '/kayitDinle/SanalSantralPlayer.exe');
                    dbSrc = path.join(__dirname, '/db/cdr.db');
                    shellJs.cp('-R', src, dist);
                    shellJs.cp('-R', dbSrc, dbDist);
                    logla('recordListen başarıyla kopyalandı.')
                    resolve() 
                } else {
                    src = path.join(__dirname, '/kayitDinle/SanalSantralPlayer.exe');
                    dbSrc = path.join(__dirname, '/db/cdr.db');
                    logla('recordListen uygulaması;' + src + ' konumundan ' + dist + ' hedefine kopyalanacak.');
                    logla('record db;' + dbSrc + ' konumundan ' + dbDist + ' hedefine kopyalanacak.');
                    try {
                        fs.writeFileSync(dist, fs.readFileSync(src));
                        fs.writeFileSync(dbDist, fs.readFileSync(dbSrc));
                    } catch (err) {
                        logla('Player ve DB kopyalama hatası:' + err.message);
                    }
                    logla('recordListen başarıyla kopyalandı.');
                    resolve();
                }
            })
        })
    })
}

let baglandi = false;
let ws;
let win

function wsMain(newSocketData) {
    ws = null;
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
        ws.isAlive = true;
        ws.on('open', function open() {
            let t = new setInterval(() => {
                if (!ws.isAlive) {
                    logla('Websocket mefta.');
                    clearInterval(t);
                    ws.terminate();
                    wsMain(newSocketData);
                }
            }, 5000);
            ws.send(message.msg);
            setTimeout(function () {
                if (ws.readyState === 1) {
                    ws.isAlive = false;
                    ws.ping();
                }
            }, 1000);
        });
        ws.on('ping', function () {
            if (ws.readyState === 1) {
                logla('ping geldi');
                ws.pong();
            }
        });
        ws.on('pong', function () {
            ws.isAlive = true;
            setTimeout(function () {
                if (ws.readyState === 1) {
                    ws.isAlive = false;
                    ws.ping();
                }
            }, 10000);
            logla('pong geldi');
        });
        ws.on('message', function incoming(e) {
            try {
                const wssmessage = JSON.parse(JSON.parse(decodeURIComponent(e)).message);
                if (wssmessage.hata === true) {
                    logla('Hata:' + wssmessage.aciklama);
                } else {
                    if (wssmessage.komut === 'giris') {
                        logla('Socket bağlantısı sağlandı.');
                        baglandi = true;
                        win.hide();
                        win.show();
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
        ws.on('close', function (e) {
            //logla(ws.readyState)
            ws.terminate();
            logla('Socket bağlantısı kapandı. Tekrar bağlanıyor...' + JSON.stringify(e));
            setTimeout(() => {
                if (ws.readyState === 3 || ws.readyState === 2) {
                    wsMain(newSocketData);
                }
            }, 5000);
        });
        ws.on('error', function (err) {
            logla('Socket bağlantısı sağlanamadı. Tekrar deneniyor...');
            /*
            setTimeout(() => {
                wsMain(newSocketData);
            }, 1000);*/
        });
    } else {
        dialog.showErrorBox('Hata', 'Ayarlar geçersiz. Lütfen tekrar kontrol ediniz.');
    }
}

async function getRecord(slicedStr, arg, suan, kisim) {
    let yol = `${arg.numara.substring(1,arg.numara.length)}_${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}`;
    logla(`DB Yol: ${path.join(__dirname, `../../${yol}/db/cdr.db`)}`);
    let conn = {
        filename: path.join(__dirname, `../../${yol}/db/cdr.db`)
    };
    let options = {
        client: 'sqlite3',
        connection: conn,
        useNullAsDefault: true,
        pool: {
            min: 1,
            max: 3,
        }
    };
    const knex = require('knex')(options);
    let index = 0;
    for (let instance of slicedStr) {
        /*if(instance.ses_var){*/
        try {
            let response = await axios({
                method: "get",
                url: `https://api.sanal.link/api/cdr/download/${instance.linkedid}/?api_key=${arg.api_key}&santral_id=${arg.santral_id}`,
                responseType: "stream"
            });
            logla(`Ses kayıt yeri; ${path.resolve(__dirname, `../../${yol}/sesler/${instance.linkedid}.wav`)}`);
            response.data.pipe(fs.createWriteStream(path.resolve(__dirname, `../../${yol}/sesler/${instance.linkedid}.wav`)));
            index++;
            let yuzde = index / slicedStr.length;
            obj = {
                yuzde: yuzde,
                kisim: kisim,
                suan: suan
            }
            instance.zaman = Date.parse(moment(instance.zaman).format("DD.MM.YYYY HH:mm:ss"))
            win.webContents.send('progress', obj);
            let res = await knex('cdr').insert(instance);
            logla(res);
        } catch (err) {
            obj = {
                yuzde: 1,
                kisim: 1,
                suan: 1
            };
            win.webContents.send('progress', 1);
            logla('getRecord:' + err);
        }
        /*}else{
            index++;
            let yuzde=index/slicedStr.length;
            obj={
                yuzde:yuzde,
                kisim:kisim,
                suan:suan
            }
            win.webContents.send('progress',obj)
        }*/
    }
}

async function getCdr(arg) {
    let data = fs.readFileSync(path.resolve(__dirname, '../../info.json'), "utf8");
    let yol = `${moment(arg.baslangic_tarih).format('DD.MM.YYYY')}-${moment(arg.bitis_tarih).format('DD.MM.YYYY')}`
    let copyPath = `${arg.numara.substring(1,arg.numara.length)}_${moment(arg.baslangic_tarih).format('YYYYMMDD')}_${moment(arg.bitis_tarih).format('YYYYMMDD')}`;
    arg.api_key = JSON.parse(data).api_key
    arg.santral_id = JSON.parse(data).santral_id
    let diff = Math.floor((Date.parse(arg.bitis_tarih) - Date.parse(arg.baslangic_tarih)) / 86400000);
    if (diff > 31) {
        dialog.showErrorBox('Hata', '1 aydan fazla çağrı geçmişi getiremezsiniz')
    } else {
        try {
            await fileCopy(arg)
            // await createDatabase(arg)
            // console.log(arg)
            let response = await axios.get(`https://api.sanal.link/api/cdr/basit?api_key=${arg.api_key}&santral_id=${arg.santral_id}&baslangic_tarih=${arg.baslangic_tarih}&bitis_tarih=${arg.bitis_tarih}&ikili=${arg.numara}`)
            if (response.data.sayfa_sayisi > 1 && response.data.durum) {
                for (i = 0; i < response.data.sayfa_sayisi; i++) {
                    let res = await axios.get(`https://api.sanal.link/api/cdr/basit?api_key=${arg.api_key}&santral_id=${arg.santral_id}&baslangic_tarih=${arg.baslangic_tarih}&bitis_tarih=${arg.bitis_tarih}&ikili=${arg.numara}&sayfa=${i}`)
                    try {
                        let slicedStr = res.data.sonuclar.slice(0, 3);
                        let recordResponse = await getRecord(slicedStr/*res.data.sonuclar*/, arg, i + 1, response.data.sayfa_sayisi)
                        if (i + 1 === response.data.sayfa_sayisi) {
                            obj = {
                                yuzde: 1,
                                kisim: response.data.sayfa_sayisi,
                                suan: response.data.sayfa_sayisi
                            }
                            // win.webContents.send('progress',obj)
                            win.webContents.send('progressFinish', obj)
                            dialog.showMessageBox(null, {
                                type: 'info',
                                buttons: ['Tamam'],
                                defaultId: 1,
                                title: 'Bilgilendirme',
                                message: `Çağrı geçmişi başarılı bir şekilde çekildi.Kayıtlar ${path.resolve(__dirname, `../../${copyPath}`)} dizinindedir.`,
                                cancelId: 1,
                            }, (response) => {
                                if(response === 0){
                                    shell.openItem(`${path.resolve(__dirname, `../../${copyPath}`)}`)
                                }
                                logla(response);
                            });
                        }
                    } catch (err) {
                        dialog.showErrorBox('Hata', 'Kayıtlar çekilirken hata oluştu')
                        win.webContents.send('progressDelete')
                        logla("Cdrlar cekilemedi.")
                    }
                }
            } else {
                if (response.data.durum) {
                    try {
                        let slicedStr = response.data.sonuclar.slice(0, 3);
                        let recordResponse = await getRecord(slicedStr/*response.data.sonuclar*/, arg, 1, 1)
                        win.webContents.send('progressFinish', obj)
                        dialog.showMessageBox(null, {
                            type: 'info',
                            buttons: ['Tamam'],
                            defaultId: 1,
                            title: 'Bilgilendirme',
                            message: `Çağrı geçmişi başarılı bir şekilde çekildi.Kayıtlar ${path.resolve(__dirname, `../../${copyPath}`)} dizinindedir.`,
                            cancelId: 1,
                        }, (response) => {
                            if(response === 0){
                                shell.openItem(`${path.resolve(__dirname, `../../${copyPath}`)}`)
                            }
                            logla(response);
                        });
                    } catch (err) {
                        dialog.showErrorBox('Hata', 'Kayıtlar çekilirken hata oluştu');
                        win.webContents.send('progressDelete');
                        logla("Cdrlar cekilemedi:" + err.message);
                    }
                } else {
                    dialog.showErrorBox('Hata', 'Kayıt Yok')
                    win.webContents.send('progressDelete')
                }
            }
        } catch (err) {
            dialog.showErrorBox('Hata', 'Kayıtlar çekilirken hata oluştu')
            win.webContents.send('progressDelete')
            logla('getCdr:' + err);
        }
    }
}

let newSocketData = "";

async function main() {
    try {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
        })
        win = new BrowserWindow({
            width: 600,
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
            dialog.showErrorBox('Hata', 'Uygulama çalışmaktadır.');
            app.quit();
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
            logla(path.resolve(__dirname));
            try {
                fs.writeFileSync(path.resolve(__dirname, '../../info.json'), JSON.stringify(arg, null, 2), 'utf-8');
            } catch (err) {
                logla(err.stack);
                dialog.showErrorBox('Hata', 'Dosya kayıt edilirken hata oluştu:' + err.message);
            }
            wsMain(arg);
            if (baglandi) ws.close();
        });
        ipcMain.on('getCdr', (event, arg) => {
            parseBas = Date.parse(arg.baslangic_tarih)
            parseBit = Date.parse(arg.bitis_tarih)
            if(arg.baslangic_tarih === "" || arg.bitis_tarih === ""){
                dialog.showErrorBox('Hata', 'Başlangıç ve bitiş tarihi boş bırakılamaz.')
                win.webContents.send('progressDelete')
            }else{
                if (parseBas >= parseBit) {
                    win.webContents.send('progressDelete')
                    dialog.showErrorBox('Hata', 'Başlangıç tarihi bitiş tarihinden büyük olamaz');
                } else {
                    arg.numara = "*" + arg.numara
                    getCdr(arg)
                }
            }
        });
        ipcMain.on('deleteCdr', (event, arg) => {
            deleteCdr()
        });
        ipcMain.on('openDevTools', (event, arg) => {
            win.webContents.openDevTools();
        });
        let bilgiler;
        try {
            let data = fs.readFileSync(path.resolve(__dirname, '../../info.json'), "utf8");
            if (data === undefined) {
                win.show();
            } else {
                bilgiler = JSON.parse(data);
                ipcMain.on('infoData', (event, arg) => {
                    event.sender.send('infoRes', bilgiler);
                });
                wsMain(bilgiler);
                //win.hide();
                win.show();
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

app.on('quit', function () {
    process.exit(0);
});

function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':

            application.quit();
            return true;
    }
};