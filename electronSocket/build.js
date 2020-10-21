var electronInstaller = require('electron-winstaller');

// In this case, we can use relative paths
var settings = {

    appDirectory: './sanalsantralSocket-win32-x64',

    outputDirectory: './sanalsantralSocket-Built',

    authors: 'Sanal Santral',

    exe: './sanalsantralSocket.exe'
};

resultPromise = electronInstaller.createWindowsInstaller(settings);
 
resultPromise.then(() => {
    console.log("Uygulama başarılı bir şekilde oluşturuldu!");
}, (e) => {
    console.log(`Build edilirken hata oluştu: ${e.message}`)
});