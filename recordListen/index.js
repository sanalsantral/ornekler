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
   let filterObj = {
    aranan:"",
    arayan:"",
    baslangic_tarih:"",
    bitis_tarih:"",
    durum:"Hepsi",
   } 
    getRecord(filterObj,1);
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
let index = 0
async function getRecord(filterData,page) {
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
        let length = await knex.select().from("cdr").count('unique_id')
        let res = "";
        if(Object.values(length[0])[0] > index){
            let baseQuery = knex.select().from("cdr").limit(20).offset(index)
            let baslangic = Date.parse(filterData.baslangic_tarih)
            let bitis = Date.parse(filterData.bitis_tarih)
            if(!isNaN(baslangic) && !isNaN(bitis)){
                baslangic = moment(baslangic).format('DD.MM.YYYY');
                bitis = moment(bitis).format('DD.MM.YYYY');
                baseQuery.where('zaman','>=',baslangic).where('zaman','<',bitis)
                if (filterData.durum !== "Hepsi"){
                    if(filterData.arayan !== "" && filterData.aranan !== ""){
                        res = await baseQuery.where('durum',filterData.durum).where('hedef','like',`%${filterData.aranan}%`).where('kaynak','like',`%${filterData.arayan}%`)
                        index += 20
                    }else if(filterData.arayan !== "" && filterData.aranan === ""){
                        res = await baseQuery.where('durum',filterData.durum).where('kaynak','like',`%${filterData.arayan}%`)
                        index += 20
                    }else if(filterData.arayan === "" && filterData.aranan !== ""){
                        res = await baseQuery.where('durum',filterData.durum).where('hedef','like',`%${filterData.aranan}%`)
                        index += 20
                    }else{
                        res = await baseQuery.where('durum',filterData.durum)
                        index += 20
                    }
                }else{
                    if(filterData.arayan !== "" && filterData.aranan !== ""){
                        res = await baseQuery.where('hedef','like',`%${filterData.aranan}%`).where('kaynak','like',`%${filterData.arayan}%`)
                        index += 20
                    }else if(filterData.arayan !== "" && filterData.aranan === ""){
                        res = await baseQuery.where('kaynak','like',`%${filterData.arayan}%`)
                        index += 20
                    }else if(filterData.arayan === "" && filterData.aranan !== ""){
                        res = await baseQuery.where('hedef','like',`%${filterData.aranan}%`)
                        index += 20
                    }else{
                        res = await baseQuery
                        index += 20
                    }
                }
            }else{
                res = await baseQuery
                index += 20
            }
        }
        if(res.length !== 0){
            let result = res.filter(instance => instance.data !== null);
            for (let r of result) {
                let obj = {
                    url: `${fetchUrl}/${r.linkedid}.wav`
                };
                Object.assign(r, r, obj);
            }
            cdr = result;
            win.webContents.send('getRes',result,page);
        }else{
            win.webContents.send('getRes',res,page);
        }
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
    ipcMain.on('newData',(event,arg,page)=>{
        index = 0;
        getRecord(arg,page);
    })
    ipcMain.on('changeData',(event,arg,page)=>{
        getRecord(arg,page);
    })
}

app.on('ready', main);

app.on('quit', function () {
    process.exit(0);
});