function Page(pageSize, margins, dpiFactor){
	var page = {}
	page.canvas = document.createElement('canvas');
	page.ctx = page.canvas.getContext('2d');
	/// set canvas size representing 300 DPI
	page.canvas.width = pageSize.width;
	page.canvas.height = pageSize.height;

	/// scale all content to fit the 96 DPI display (DPI doesn't really matter here)
	page.canvas.style.width = pageSize.width/dpiFactor/4 + 'px';
	page.canvas.style.height = pageSize.height/dpiFactor/4 + 'px';
	page.canvas.style.margin = 10 + 'px';
	page.canvas.style.border = "1px solid black";

	page.paintPosition = {
		x: margins.left,
		y: margins.top
	}
 
	page.maxPaintPosition = {
		x:  pageSize.width - margins.left - margins.right,
		y:  pageSize.height - margins.bottom
	};

	fontSize = (40 * dpiFactor).toFixed(0);
	page.fontFamily = "Times New Roman, serif"
	page.lineHeight = fontSize * 1.5;

	page.ctx.font = fontSize + 'px' + " " + page.fontFamily;
	page.ctx.fillStyle = '#000';

	page.addBackground = function(){
		destinationCanvas = document.createElement("canvas");
		destinationCanvas.width = pageSize.width;
		destinationCanvas.height = pageSize.height;
		destinationCanvas.style = page.canvas.style;

		destCtx = destinationCanvas.getContext('2d');

		//create a rectangle with the desired color
		destCtx.fillStyle = "#ffffff";
		destCtx.fillRect(0,0,pageSize.width,pageSize.height);

		//draw the original canvas onto the destination canvas
		destCtx.drawImage(page.canvas, 0, 0);
		page.canvas = destinationCanvas;
		page.ctx = destCtx;
		page.canvas.style.width = pageSize.width/dpiFactor/4 + 'px';
	page.canvas.style.height = pageSize.height/dpiFactor/4 + 'px';
	}

	page.wrapText = function(text, options, langStyle) {
		var continuing = false;
		if(typeof text == "string"){
			var re = /([\s.!?:;\\/-_\(\)][\w\d]*|[\w\d]*[\s.!?:;\\/-_\(\)]|.)/g;

			var words = text.match(re);
		}
		else if(typeof text[0] !== "undefined"){
			var words = text;
			continuing = true;
		}

		var maxWidth = page.maxPaintPosition.x;
		var xPos = this.paintPosition.x;
		if(langStyle == "latin"){
			var line = ' ';
		}
		else{
			var line = '';
		}
		var bulletItem = false;
		var bottomMargin = page.lineHeight*2;

		if(typeof options !== "undefined"){
			if(options.bulletItem && !continuing){
				bulletItem = true;
				line = "•   ";
				maxWidth -= 45;
				xPos += 45;
			}
			if(options.bulletItem && continuing){
				bulletItem = true;
				maxWidth -= 45+40;
				xPos += 45+40;
			}
			if(options.noBottomMargin){
				bottomMargin = page.lineHeight;
			}
		}
		firstNewLineDone = false;

		for(var n = 0; n < words.length; n++) {
			var testLine = line + words[n] + '';
			var metrics = this.ctx.measureText(testLine);
			var testWidth = metrics.width;
			if (testWidth > maxWidth && n > 0) {
				this.ctx.fillText(line, xPos, this.paintPosition.y);
				if(bulletItem && !firstNewLineDone && !continuing){

					maxWidth -= 42;
					xPos += 42;
					firstNewLineDone = true;
				}
				line = words[n] + ' ';
				this.paintPosition.y += page.lineHeight;
				if(this.paintPosition.y >= page.maxPaintPosition.y){
					return words.slice(n);
				}
			}
			else {
				line = testLine;
			}
		}
		this.ctx.fillText(line, xPos, this.paintPosition.y);
		this.paintPosition.y += bottomMargin;
		return null;
	}

	return page;
}

function Document(paperType, margins, langStyle){
	var self = this;
	self.pages = [];

	// Paper types expressed as pixel values at 300ppi
	// self.paperTypes = {
	// 	"letter": {width: 2550, height: 3300},
	// 	"legal": {width: 2550, height: 4200},
	// 	"A4": {width: 2480, height: 3508}
	// }
	self.langStyle = 'en';
	if(typeof langStyle !== "undefined"){
		self.langStyle = langStyle;
	}
	self.paperTypes = {
		"letter": {width: 2550/(3.125/2), height: 3300/(3.125/2), pdfSize: {width: 612, height: 792}},
		"legal": {width: 2550/(3.125/2), height: 4200/(3.125/2), pdfSize: {width: 612, height: 1008}},
		"A4": {width: 2480/(3.125/2), height: 3508/(3.125/2), pdfSize: {width: 595.28, height: 841.89}}
	}
	try{
		self.paperType = self.paperTypes[paperType];
		self.paperType.width = self.paperType.width;
		self.paperType.height = self.paperType.height;
	}
	catch(e){
		throw new Error("Paper type " + paperType + " not supported");
	}

	// DPI factor sets it to 300 relative to default 96
	// var dpiFactor = 300 / 96;
	var dpiFactor = 1;

	var marginCalc = function(pageSize, margins){
		return {
			top: pageSize.width * margins[0] / 100,
			right: pageSize.width * margins[1] / 100,
			bottom: pageSize.width * margins[2] / 100,
			left: pageSize.width * margins[3] / 100
		}
	}
	self.activePageIndex = 0;

	self.getActivePageIndex = function(){
		return self.activePageIndex;
	}

	// Set page widths in pixels relative to DPI factor
	self.pageSize = {
		width: self.paperType.width * dpiFactor,
		height: self.paperType.height * dpiFactor
	}
	self.margins = marginCalc(self.pageSize, margins);

	// Add first page
	self.pages.push(new Page(self.pageSize, self.margins, dpiFactor));

	self.writeText = function(text, options){
		activePage = self.pages[self.getActivePageIndex()];
		text = activePage.wrapText(text, options, self.langStyle);
		if(text == null){
			return;
		}
		else{
			console.log('new page')
			// Add new page, and keep writing
			self.pages.push(new Page(self.pageSize, self.margins, dpiFactor));
			self.activePageIndex += 1;
			self.writeText(text, options);
		}
	}

	self.parseHTMLBlockLevelElements = function(containerEl, selector){
		// strip out spans
		containerEl.innerHTML = containerEl.innerHTML.replace(/<\/?span[^>]*>/g,"");

		nodes = self.getDescendants(containerEl);
		return nodes;
	}
	self.getDescendants = function(node, accum, textNodes) {
	    var i;
	    accum = accum || [];
	    for (i = 0; i < node.children.length; i++) {
	    	accum.push({el: node.children[i], parentTagName: node.tagName, tagName: node.tagName});
	        self.getDescendants(node.children[i], accum);
	    }
	    return accum;
	}

	self.parseEl = function(el){
		var pdfContent = [];
		nodes = self.parseHTMLBlockLevelElements(el);

		for(var i=0; i < nodes.length; i++){
			if(nodes[i].el.children.length === 0 && nodes[i].el.innerText.length > 0){
				pdfContent.push({
					'tag': nodes[i].el.tagName,
					'text': nodes[i].el.innerText
				});
			}
		}
		for(var i=0; i < pdfContent.length; i++){
			pdfContent[i].options = {};
			if(pdfContent[i].tag == "LI"){
				pdfContent[i].options.bulletItem = true;
				if(pdfContent[i+1].tag == "LI"){
					pdfContent[i].options.noBottomMargin = true;
				}
			}
		}
		return pdfContent
	}
	self.writeHTMLtoDoc = function(el){
		pdfContent = self.parseEl(el);
		for(var i=0; i < pdfContent.length; i++){
			self.writeText(pdfContent[i].text, pdfContent[i].options);
		}
		for (var i = 0; i < self.pages.length; i++) {
			self.pages[i].addBackground();
			self.pages[i].dataURL = self.pages[i].canvas.toDataURL("image/jpeg");
		}
	}

	self.createPDF = function(){
		var dd = {
			pageSize: paperType,
			content: [],
			pageMargins: 1
		}
		// Add our canvas pages to the PDF, scale to size
		for (var i = 0; i < self.pages.length; i++) {
			console.log("adding page " + i);
			dd.content.push({
				image: self.pages[i].dataURL,
				width: self.paperType.pdfSize.width-(dd.pageMargins*2),
				alignment: 'center'
			})
		}
		self.pdf = pdfMake.createPdf(dd);
	}
	self.openPDF = function(){
		self.pdf.open();
	}
	self.savePDF = function(){
		self.pdf.download();
	}
}