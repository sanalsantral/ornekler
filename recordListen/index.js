const { app ,BrowserWindow ,ipcMain ,ipcRenderer ,dialog } = require('electron');
    const fs = require('fs');
    const path = require('path');
    const moment = require('moment');
    let win
    let connectUrl
    let fetchUrl
    let knex 
    let cdr
    
    fs.readdir(path.join(__dirname,'./../../../'), function (err, files) {
        if (err)
        throw err;
        for (var index in files) {
            if(files[index].includes("db")){
                connectUrl = path.join(__dirname,`./../../../${files[index]}`)
            }else if(files[index].includes("sesler")){
                fetchUrl = path.join(__dirname,`./../../../${files[index]}`)
            }else{
                console.log(files[index]);
            }
        }
    });
    

    function getRecord(){
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
        knex.select().from("cdr")
            .then((res) => {
                let result = res.filter(instance => instance.data !== null);
                fs.readdir(`${fetchUrl}`,function (err, files) {
                    if (err)
                       throw err;
                    for (let index in files) {
                        result.map((instance,i)=>{
                            if(files[index].includes(instance.linkedid)) 
                            {
                                let obj = {
                                    url:`${fetchUrl}/${files[index]}`
                                }
                                Object.assign(result[i],instance,obj)
                            }
                        })
                    }
                    cdr = result;
                    win.webContents.send('getFilterRes',result);
                });
            })
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
        win.setMenuBarVisibility(false)
        win.webContents.openDevTools();
        const fpath = path.join(__dirname, 'home.html');
        if (process.platform === 'linux') {
            win.loadURL(`file:${fpath}`);
        } else if (process.platform === 'darwin') {            
            win.loadURL(`file:${fpath}`);
        } else {
            win.loadURL(fpath);
        }
        ipcMain.on('ready',(event,arg) =>{ 
            getRecord()
        });
        ipcMain.on('getFilter',(event,arg) =>{
            let baslangic = Date.parse(arg.baslangic_tarih)
            let bitis = Date.parse(arg.bitis_tarih)
            let filter = []
            cdr.map(arama=>{
                var date = arama.zaman.split(".");
                date[2] = date[2].substring(0, 4);
                var yeniFormat = new Date(date[2],date[1]-1,date[0]);
                let zaman = Date.parse(yeniFormat) 
                if(arg.durum !== "Hepsi"){
                    if(baslangic <= zaman && bitis >= zaman && arg.durum === arama.durum){
                        filter.push(arama)
                    }
                }else{
                    if(baslangic <= zaman && bitis >= zaman){
                        filter.push(arama)
                    }
                }
            })
            if(filter.length !== 0){
                win.webContents.send('getFilterRes', filter);
            }else{
                dialog.showErrorBox('Uyarı','Girilen tarihler arası arama kaydı yok.')
            }
        })
        
    }

    app.on('ready', main);

    app.on('quit', function() {
        process.exit(0);
    });