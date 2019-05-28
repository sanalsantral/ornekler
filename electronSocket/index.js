const path = require("path")
const { app, BrowserWindow ,Tray ,Menu,ipcMain} = require('electron')
var fs = require('fs')
const { shell } = require('electron')
const WebSocket = require("ws")
const { dialog } = require('electron')
let tray = null;
let count=0; 
function wsMain(newSocketData) {
   
    console.log(newSocketData)
    if( newSocketData.api_key  !=='' && 
        newSocketData.dahili_ayrac !=='' &&
        newSocketData.dahili_no !== '' &&
        newSocketData.santral_id !== ''
    ){
        let msg = {
            api_key:newSocketData.api_key,
            dahili_ayrac: newSocketData.dahili_ayrac,
            dahili_no:newSocketData.dahili_no,
            komut: 'giris',
            santral_id: newSocketData.santral_id,
        };
        const ws = new WebSocket('wss://api.sanal.link/comm', {
            perMessageDeflate: false
        });
        msg = JSON.stringify(msg);
        const randomId = Math.floor(Math.random() * 10000);
        const message = typeof msg === typeof ''
            ? { msg, id: randomId }
            : Object.assign({}, msg, {
                id: msg.id || randomId,
            });
        ws.on('open', function open() {
            ws.send(message.msg);
        });
        
        ws.on('message', function incoming(e) {
            const wssmessage = JSON.parse(JSON.parse(decodeURIComponent(e)).message);
            if(wssmessage.hata===true){
                dialog.showErrorBox('Hata', wssmessage.aciklama);
            }else{
                if(wssmessage.komut==='giris')
                { 
                    console.log("soket baglantisi gerceklesti")
                    const options = {
                        message: 'Soket Bağlantısı Gerçekleşti',
                    };
                    fs.writeFileSync(path.resolve(__dirname,'info.json'),JSON.stringify(message.msg, null, 2) , 'utf-8');
                    dialog.showMessageBox(null,options)
                }
                if (wssmessage.olay === 'dial' && wssmessage.aranan===JSON.parse(message.msg).dahili_no) {
                    shell.openItem('infinia:'+wssmessage.arayan);
                }
                
            }
        });
        ws.on('error', function (err) {
            count++;
            if(count===3){
                dialog.showErrorBox('Hata','Soket bağlantısı sağlanamadı tekrar çalıştırınız.');
                count=0;    
            }else{
                dialog.showErrorBox('Hata', err.message);
                wsMain(newSocketData)
            }
            
        });
        
    }else{
        dialog.showErrorBox('Hata','Boş Gönderilemez');
    }
}

let newSocketData="";

function main() {
    try {
    let win = new BrowserWindow({
        width: 400, height: 650, 
        webPreferences: {
            nodeIntegration: true
        },
        title:'Sanal Santral',
        icon: path.resolve(__dirname, 'image', 'amblem.png')
    })
    fs.readFile(path.resolve(__dirname,'info.json'),"utf8",function(err,data){
        if(data===undefined){
            win.show()
        }else{
            ipcMain.on('infoData',(event,arg)=>{
                event.sender.send('infoRes',JSON.parse(JSON.parse(data)))
            })
            wsMain(JSON.parse(JSON.parse(data)))
            win.hide()
        }
    })
    
    tray = new Tray(path.resolve(__dirname, 'image', 'amblem.png'));
    tray.on('click', () => {
        win.isVisible() ? win.hide() : win.show()
    })
    tray.setContextMenu(Menu.buildFromTemplate([{
        label: 'Exit',
        click: () => {
            process.exit(0);
        },
    }]))
    win.setMenu(null)
    const fpath = path.join(__dirname, 'websocket.html')
    win.loadURL(fpath)
    ipcMain.on('socketData', function(event,arg) {
        wsMain(arg)
     });
    win.on('close', function(e){
        e.preventDefault();
        win.hide();
    });
    return win;
    } catch (err) {
        dialog.showErrorBox('Ana Pencere Hata', err.message);
        app.quit();
    }
}

app.on('ready', main)

app.on('quit', function () {
    process.exit(0);
})