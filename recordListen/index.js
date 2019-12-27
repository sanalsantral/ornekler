const { app, BrowserWindow, ipcMain, ipcRenderer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let win;
let connectUrl;
let fetchUrl;
let knex;
let cdr;

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
            fs.appendFile(path.resolve(__dirname, 'general.log'), str + ' ' + formatted_date + "\n", function (err) {
                if (err) {
                    reject();
                    return;
                }
                resolve();
                return;
            });
        } else {
            fs.appendFile(app.getAppPath() + '\\..\\..\\general.log', str + ' ' + formatted_date + "\n", function (err) {
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

function readDir() {
    //logla(path.join(__dirname, './'));
    connectUrl = path.join(__dirname, '../../db');
    fetchUrl = path.join(__dirname, '../../sesler');
    //logla(`connectUrl:${connectUrl}`);
    //logla(`fetchUrl:${fetchUrl}`);    
    getRecord();
    /* try {
        fs.readdir(path.join(__dirname, './'), function (err, files) {
            if (err)
                throw err;
            for (var index in files) {
                if (files[index].includes("db")) {
                    logla(path.join(__dirname, files[index]))
                    connectUrl = path.join(__dirname, files[index])
                } else if (files[index].includes("sesler")) {
                    logla(path.join(__dirname, files[index]))
                    fetchUrl = path.join(__dirname, files[index])
                } else {
                    logla(files[index]);
                }
            }
            getRecord();
        });
    } catch (err) {
        logla('readDir:Hata:' + err.stack);
    } */
}

async function getRecord() {
    try {
        knex = require("knex")({
            client: "sqlite3",
            connection: {
                filename: `${connectUrl}/cdr.db`
            },
            useNullAsDefault: true,
            pool: {
                min: 1,
                max: 2,
            },
        });
        const res = await knex.select().from("cdr")
        //logla("Cdr kayıt:"+res[0])
        let result = res.filter(instance => instance.data !== null);
        for (let r of result) {
            let obj = {
                url: `${fetchUrl}/${r.linkedid}.wav`
            };
            Object.assign(r, r, obj);
        }
        cdr = result;
        win.webContents.send('getFilterRes', result);
    } catch (err) {
       logla('getRecord:' + err.stack);
    }
}


function main() {
    win = new BrowserWindow({
        width: 600,
        height: 650,
        title: 'Sanal Santral',
        webPreferences: {
            nodeIntegration: true
        }
    });
    // win.webContents.openDevTools();
    const fpath = path.join(__dirname, 'home.html');
    if (process.platform === 'linux') {
        win.loadURL(`file:${fpath}`);
    } else if (process.platform === 'darwin') {
        win.loadURL(`file:${fpath}`);
    } else {
        win.loadURL(fpath);
    }
    ipcMain.on('ready', (event, arg) => {
        readDir();
    });
    ipcMain.on('getFilter', (event, arg) => {
        let baslangic = Date.parse(arg.baslangic_tarih)
        let bitis = Date.parse(arg.bitis_tarih)
        let filter = []
        if(!isNaN(baslangic) && !isNaN(bitis)){
            cdr.map(arama => {
                var date = arama.zaman.split(".");
                date[2] = date[2].substring(0, 4);
                var yeniFormat = new Date(date[2], date[1] - 1, date[0]);
                let zaman = Date.parse(yeniFormat)
                if (arg.durum !== "Hepsi") {
                    if (baslangic <= zaman && bitis >= zaman && arg.durum === arama.durum) {
                        if(arg.arayan !== "" && arg.aranan !== ""){
                            if(arama.kaynak.includes(arg.arayan) && arama.hedef.includes(arg.aranan)){
                                filter.push(arama)
                            }
                        }else if(arg.arayan !== "" && arg.aranan === ""){
                            if(arama.kaynak.includes(arg.arayan)){
                                filter.push(arama)
                            }
                        }else if(arg.arayan === "" && arg.aranan !== ""){
                            if(arama.hedef.includes(arg.aranan)){
                                filter.push(arama)
                            }
                        }else{
                            filter.push(arama)
                        }
                    }
                } else {
                    if (baslangic <= zaman && bitis >= zaman) {
                        if(arg.arayan !== "" && arg.aranan !== ""){
                            if(arama.kaynak.includes(arg.arayan) && arama.hedef.includes(arg.aranan)){
                                filter.push(arama)
                            }
                        }else if(arg.arayan !== "" && arg.aranan === ""){
                            if(arama.kaynak.includes(arg.arayan)){
                                filter.push(arama)
                            }
                        }else if(arg.arayan === "" && arg.aranan !== ""){
                            if(arama.hedef.includes(arg.aranan)){
                                filter.push(arama)
                            }
                        }else{
                            filter.push(arama)
                        }
                    }
                }
            })
            if (filter.length !== 0) {
                win.webContents.send('getFilterRes', filter);
            } else {
                dialog.showErrorBox('Uyarı', 'Arama kaydı yok.')
            }
        }else{
            dialog.showErrorBox('Uyarı', 'Filtreleme için tarih aralığı giriniz.')
        }
    })

}

app.on('ready', main);

app.on('quit', function () {
    process.exit(0);
});