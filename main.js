const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs');
const { type } = require('os');

const configData = fs.readFileSync(__dirname + "/configuracao.json", 'utf8');
const config = JSON.parse(configData.toString('utf8').replace(/^\uFEFF/, ''));

var mainWindow = null
async function createWindow(){
	mainWindow = new BrowserWindow({
		width:700,
		height:650,
		webPreferences:{
			nodeIntegration: true,
			contextIsolation: false
		}
	})
	mainWindow.setMenuBarVisibility(false)
	await mainWindow.loadFile('./index.html')
	
	mainWindow.webContents.send('console-na-tela', "")
	
}


app.whenReady().then(createWindow)

app.on('activate', ()=>{
	if(BrowserWindow.getAllWindows().length === 0){
		createWindow();
	}
})
ipcMain.on('dialog-open', async (event, args)=>{
    let button = args.button

        if(button == "planilha"){
            const {filePaths, canceled} = await dialog.showOpenDialog({properties: ['openFile']})
            if(button == "planilha"){
                if(canceled){
                    event.reply('resposta-planilha', "nenhum caminho encontrado")
                }else{
                event.reply('resposta-planilha', filePaths)
                }
            }
        }else{
            const {filePaths, canceled} = await dialog.showOpenDialog({properties: ['openDirectory']})
            
            if(button == "arquivos"){
                if(canceled){
                    event.reply('resposta-arquivos', "nenhum caminho encontrado")
                }else{
                    event.reply('resposta-arquivos', filePaths)
                }
            }else if(button == "backup"){
                if(canceled){
                    event.reply('resposta-backup', "nenhum caminho encontrado")
                }else{
                event.reply('resposta-backup', filePaths)
                }
            }
        }
})
let data = []
ipcMain.on("iniciar-programa", async(event, args)=>{
	if(args != "fim"){
        data.push(args)
    }else{

        config.filePath = data[0].filepath
        config.sheetPath = data[1].sheetpath
        config.copyPath = data[2].copypath
		config.mailTitle = data[3].title
		config.mailBody = data[4].body
		config.whatsMessage = data[5].wwp
		fs.writeFileSync(__dirname + "/configuracao.json", JSON.stringify(config), 'utf-8', (error, result)=>{
			if(error){
				console.error(error)
			}
		})
      }
	  if(args === "fim"){
		await event.sender.send("console-na-tela", "iniciando automacao")
		automacao()
	  }
})

////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function automacao(){
	
	ipcMain.on("console-na-tela", (event, args)=>{
		console.log(args)
	const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
  	const nodemailer = require('nodemailer');
 	const qrcode = require('qrcode-terminal');
  	const Excel = require('exceljs');
  
  
  let client;
  
  const configData = fs.readFileSync(__dirname + '/configuracao.json', 'utf8');
  const config = JSON.parse(configData.toString('utf8').replace(/^\uFEFF/, ''));
  const workbook = new Excel.Workbook();
  const mail = nodemailer.createTransport({
	  service: 'gmail',
	  host: 'smtp.gmail.com',
	  secure: false,
		 auth: {
		  user: config.mail,
		  pass: config.password
	  }
  });
  
  const oldMails = []
  const oldNumbers = []

  async function log(message) {
	console.log(message)
	 await event.sender.send("console-na-tela",message);
	  
  }
  
  function createDirs(dirs) {
	  for(let dir of toArray(dirs))
		  if(!fs.existsSync(dir))
			  fs.mkdirSync(dir, { recursive: true });
  }
  
  function toArray(value) {
	  return Array.isArray(value) ? value : [value];
  }
  
  async function sendEmail(to, files) {
	oldMails.push(to)
	let mailOptions
	oldMails.forEach(element => {
		if(element != to){
			 mailOptions = {
				from: config.mail,
				to: to,
				subject: config.mailTitle,
				text: config.mailBody,
				attachments: toArray(files).map(file => ({
					filename: file.name,
					path: file.path
				}))
			};
		}else{
			mailOptions = {
				from: config.mail,
				to: to,
				attachments: toArray(files).map(file => ({
					filename: file.name,
					path: file.path
				}))
			};
		}
	});
  
	  try {
		  await mail.sendMail(mailOptions);
	  } catch(err) {
		  await finalize('[EMAIL] Provável erro de login...');
	  }
  
	   log(`[EMAIL] Arquivos enviados enviado para '${to}'!`);
  }
  
  async function sendMessage(to, docsToSend) {
	  to = (to + '').replace(new RegExp('[+]|-| '), '');
	  const number = to.startsWith('55') && to.length === 13 ? to : '55' + to;
	  const contact = (number + "@c.us").replace(new RegExp('[+]|-| '), '');
	  console.log(contact)
	  for(const doc of docsToSend) {
		const media = MessageMedia.fromFilePath(doc.path);
		media.mimetype = '.pdf';
		media.filename = doc.name;
		let trueFalse = (oldNumbers.indexOf(contact))
			console.log("truefalse" + trueFalse)
			if(trueFalse > -1){
			  await client.sendMessage(contact, config.whatsMessage)
			}else{
				oldNumbers.push(contact)
			}
			await client.sendMessage(contact, media);
	  }
  
	  log(`[WHATSAPP] Arquivos enviados para '${to}'`);
  }
  
  async function finalize(msg) {
	timer = 8000
	log(`<b>${msg}</b>`);
	await setTimeout(() => {
		if(client)
		  client.destroy();
	  process.exit();
	}, timer);
  }
  
  async function initSending() {
	  const { filePath, sheetPath, copyPath } = config;
	  createDirs([ filePath, copyPath ]);
  
	  const docs = fs.readdirSync(config.filePath)
			  .filter(name => name.toLowerCase().endsWith('pdf'))
			  .map(name => ({
				  name,
				  path: filePath + '/' + name
			  }));
	  let validDocs = docs.filter(file => (new RegExp("\\d+-.+",'g')).test(file.name));
	  let invalidDocs = []
	  invalidDocs = docs.filter(file => !(new RegExp("\\d+-.+",'g')).test(file.name));
	  if(!docs.length)
		  await finalize('Não foram encontrados documentos .pdf na pasta apontada...');
  
	  log(`Número de PDF's lidos: ${docs.length}`);
  
	  await workbook.xlsx.readFile(sheetPath);
	  const worksheet = workbook.getWorksheet(1);
	  const column = worksheet.getColumn(1);
  
	  async function copyFiles(files, cod, name, onlyMove = false) {
		  const destiny = `${cod}-${name}`;
		  createDirs(copyPath + '/' + destiny);
		  for(const file of files) {
			  if(onlyMove)
				  await fs.renameSync(file.path, copyPath + '/' +  destiny + '/' + file.name);
			  else
				  await fs.copyFileseSync(file.path, copyPath + '/' +  destiny + '/' + file.name);
		  }
	  }
  
	  function getHeaders(index) {
		  const row = worksheet.getRow(index);
		  let result = [];
  
		  if(row === null || !row.values || !row.values.length) return [];
  
		  for(let i = 1; i < row.values.length; i++) {
			  let cell = row.getCell(i);
			  result.push(cell.text);
		  }
  
		  return result;
	  }
  
	  const headers = getHeaders(1);
  
	  function getCellInRowByColumnHeader(rowNumber, header) {
		  const row = worksheet.getRow(rowNumber);
		  let result;
  
		  row.eachCell((cell, colNumber) => {
			  let fetchedHeader = headers[colNumber - 1];
			  if(fetchedHeader.toLowerCase().trim() === header.toLowerCase().trim())
				  result = cell;
		  });
  
		  return result;
	  }
  
	  let modified = false;
  
	  log('Começando automação...');
	  for(let i = 0; ; i++) {
		  if(invalidDocs.length)
			  log(`\nDocumentos sem número: ${invalidDocs.length}\n`);
		  const contactCell = getCellInRowByColumnHeader(2 + i , headers[0]);
  
		  if(!contactCell) break;
  
		  let contact = contactCell.value?.result || contactCell.value;
  
		  if(!contactCell || !contactCell.value) continue;
  
		  const sendCell = getCellInRowByColumnHeader(2 + i , headers[1]);
		  const nameCell = getCellInRowByColumnHeader(2 + i , headers[2]);
		  const cnpjCell = getCellInRowByColumnHeader(2 + i , headers[3]);
		  const numberCell = getCellInRowByColumnHeader(2 + i , headers[4]);
		  const mailCell = getCellInRowByColumnHeader(2 + i , headers[6]);
  
		  if(sendCell.value.toLowerCase() !== 'sim') continue;
		  log(`Empresa '${nameCell.value}' N°:${contact}...`);
		  let docsToSend = validDocs.filter(file => file.name.startsWith(contact + '-'));
		  console.log(docsToSend)
		  console.log(invalidDocs)
		  if(invalidDocs.length > 0) {
			  log('Usando CNPJ da planilha para tentar verificar documentos sem um código de Empresa.');
			  console.log(cnpjCell)
			  let cnpj = cnpjCell.value + '';
			  console.log(cnpj.length)
			  if(cnpj.length > 8){
				console.log("maior")
				cnpj = cnpj.substring(0,8)
			  }
			  log(`CNPJ da Empresa N°: ${cnpj}`);
			  let cnpjDocs = invalidDocs.filter(file => file.name.includes(cnpj.replace(new RegExp('-|\/|[.]', 'g'), '')));
			  validDocs = validDocs.concat(
				  cnpjDocs.map(file => {
						  let { path, name } = file;
						  name = contact + '-' + file.name;
						  path = filePath + '/' + name;
						  fs.renameSync(file.path, path);
  
						  return { path, name };
					  })
			  );
			  docsToSend = validDocs.filter(file => file.name.startsWith(contact + '-'));
		  }
  
		  if(!docsToSend.length) {
			  log('Nenhum documento achado para essa Empresa, continuando...\n');
			  continue;
		  }
  
		  log(`Número de Documentos à enviar: ${docsToSend.length}`);
			console.log(mailCell)
			if(mailCell != undefined || mailCell != null){
				if(new RegExp(".+@.+").test(mailCell.value)) {
					log(`[EMAIL] Enviando arquivos para ${mailCell.value}...`)
					await sendEmail(mailCell.value, docsToSend);
					sendCell.value = 'NAO';
				}
			}else{
			  log(`[EMAIL] ${nameCell.value} - Email não existente na planilha.`);
		  }
		  if(numberCell != undefined || numberCell != null){
			if(numberCell.value) {
				log(`[WHATSAPP] Enviando arquivos para para ${numberCell.value}...`)
				await sendMessage(numberCell.value, docsToSend);
				sendCell.value = 'NAO';
			}
		  }else {
			  log(`[EMAIL] ${nameCell.value} - Numero não existente na planilha.`);
		  }
  
		  log('Movendo Documentos enviados...')
		  await copyFiles(docsToSend, contact, nameCell.value, true);
		  const row = worksheet.getRow(2 + i);
		  row.commit();
		  modified = true;
	  }
  
	  let warnNumber = toArray(config.warnNumber)[0];
	  if(toArray(config.warnNumber).length === 2 && client.info.me.user === warnNumber.replace(new RegExp('[+]|-| '), ' ')) {
		  warnNumber = toArray(config.warnNumber)[1];
		  log(`Não é possível mandar o aviso ao próprio número, tentando utilizar número secundário (${warnNumber})...`);
	  }
  
	  if(modified) {
		  if(!warnNumber) {
			  log('Nenhum número para aviso encontrado...');
		  }else {
			  client.sendMessage(config.warnNumber, '[BOT] Arquivos Enviados!');
		  }
		  saveWorkbook(workbook);
		  await finalize('Finalizado com sucesso!')
	  }else {
		  await finalize('Nenhum arquivo enviado. Provável erro na planilha.')
	  }
  }
  
  async function saveWorkbook(workbook) {
	  try {
		  workbook.xlsx.writeFile(sheetPath, (error, result)=>{
			if(error){
				console.log(error)
			}
			return;
		  });
	  }catch(err) {
		  log('Erro ao salvar alterações na planilha...');
		  log('Tenha certeza que o arquivo usado não esteja aberto.');
		  saveWorkbook(workbook);
	  }
  }
  
  async function start() {
		
	log("Programa iniciado")
	  if(!fs.existsSync(config.sheetPath))
		  await finalize('Planilha não encontrada...');
  
	  client = new Client({
		  qrTimeoutMs: 0,
		  puppeteer: {
			  headless: !config.window,
			  args: [
				  "--no-sandbox",
				  "--disable-setuid-sandbox",
				  "--unhandled-rejections=strict",
				  "--disable-dev-shm-usage",
				  "--fast-start",
			  ],
			  executablePath: config.browserPath
		  },
		  authStrategy: new LocalAuth()
	  });
  
	  client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
  
	  client.on('ready', async () => {
		  log('Whatsapp Iniciado, pronto para iniciar envios.');
		  initSending();
	  });
  
	  client.initialize();
  }
   start()
})
  }