const { app, BrowserWindow, ipcMain, ipcRenderer, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
let win;
let connectUrl;
let fetchUrl;
let dateUrl;
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

function readDir(dateData) {
    connectUrl = path.join(__dirname, '../../db');
    fetchUrl = path.join(__dirname, '../../sesler');
   let filterObj = {
    aranan:"",
    arayan:"",
    baslangic_tarih:dateData.baslangicDate,
    bitis_tarih: dateData.bitisDate,
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
            let baslangic = moment(filterData.baslangic_tarih).unix();
            let bitis = moment(filterData.bitis_tarih).add(1,'day').unix();
            if (bitis < baslangic){
                dialog.showErrorBox('Hata', 'Başlangıç tarihi bitiş tarihinden büyük olamaz.');
            }else {
                baslangic = moment(filterData.baslangic_tarih).format('DD-MM-YYYY HH:mm:ss');
                bitis = moment(filterData.bitis_tarih).format('DD-MM-YYYY 59:59:59');
                if(baslangic !== 'Invalid date' && bitis !== 'Invalid date'){
                    let baseQuery = knex.whereBetween('zaman', [baslangic,bitis]).select().from("cdr").limit(20).offset(index)
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
                    dialog.showErrorBox('Hata', 'Lütfen Tarih Seçiniz.');
                }
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
            result.map((r,i)=>{
                result[i].zaman = moment(r.zaman).format("DD-MM-YYYY HH:mm:ss")
                result[i].downloadField = r.unique_id+r.url
            })
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
        dateUrl = path.join(__dirname, '../../').split('_')
        let dateData = {
            baslangicDate : moment(dateUrl[dateUrl.length-2]).format('YYYY-MM-DD'),
            bitisDate : process.platform === "win32" 
                ? moment(dateUrl[dateUrl.length-1].replace("\\","")).format('YYYY-MM-DD') 
                : moment(dateUrl[dateUrl.length-1].replace("/","")).format('YYYY-MM-DD') 
        }
        readDir(dateData);
        win.webContents.send('dateSet',dateData)
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