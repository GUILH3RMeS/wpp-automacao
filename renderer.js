const { ipcRenderer } = require("electron")


// variaveis para seleção e apresentação dos arquivos para o usuario
var arquivos = document.getElementById("filepath")
var labelarquivos = document.getElementById("labelfilepath")

var planilha = document.getElementById("sheetpath")
var labelplanilha = document.getElementById("labelsheetpath")

var backup = document.getElementById("copypath")
var labelbackup = document.getElementById("labelcopypath")

var title = document.getElementById('titleText')

var body = document.getElementById('bodyText')

var wwp = document.getElementById('wwpText')

// botão e chamada para iniciar o programa
let iniciar = document.getElementById('iniciar')

iniciar.addEventListener('click',()=>{
    var saveArquivos = labelarquivos.innerHTML.replaceAll('\\','/')
    var savePlanilha = labelplanilha.innerHTML.replaceAll('\\','/')
    var savebackup = labelbackup.innerHTML.replaceAll('\\','/')
    var saveTitle = title.value
    var saveBody = body.value
    var saveWpp = wwp.value
    var jsonData = [{filepath: saveArquivos}, {sheetpath: savePlanilha}, {copypath: savebackup}, {title: saveTitle}, {body: saveBody}, {wwp: saveWpp}, "fim"]

    for(i = 0 ; i < jsonData.length ; i++){
        ipcRenderer.send('iniciar-programa',jsonData[i])  
    }
})

// comunicação com o backend
arquivos.addEventListener('click', (event)=>{
    ipcRenderer.send('dialog-open', {button: "arquivos"})
})

planilha.addEventListener('click', (event)=>{
    ipcRenderer.send('dialog-open', {button: "planilha"})
})

backup.addEventListener('click', (event)=>{
    ipcRenderer.send('dialog-open', {button: "backup"})
})

// impressão dos dados referentes a config
ipcRenderer.on('resposta-arquivos', (event, args)=>{
    labelarquivos.innerHTML = `${args}`
})
ipcRenderer.on('resposta-planilha', (event, args)=>{
    labelplanilha.innerHTML = `${args}`
})
ipcRenderer.on('resposta-backup', (event, args)=>{
    labelbackup.innerHTML = `${args}`
})

// exibir o log do programa na tela
painel = document.getElementById("painel-texto")
inter = document.getElementById("interface")
text_tela = document.getElementById("text-tela")

ipcRenderer.on("console-na-tela", (event, messages)=>{
    console.log(messages)
    if(messages === "iniciando automacao"){
        inter.style.display = "none"
        text_tela.style.display = "flex"
        ipcRenderer.send("console-na-tela", "iniciando")
    }else{
        painel.innerHTML += `${messages} <br>`
    }
})