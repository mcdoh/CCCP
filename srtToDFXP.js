#!/usr/bin/env node

var fs = require('fs');
var _ = require('underscore');

var dfxpTemplate = fs.readFileSync('templates/dfxp.xml').toString();

var args = process.argv;
var srtFile = args.length > 2 ? args[2] : '';

if (srtFile) {
	if (srtFile.indexOf('.srt') === -1) {
		console.log('Expected .srt file extension');
		console.log(srtFile);
	}
	else {
		fs.readFile(srtFile, function(err, data) {
			if (err) {
				console.log('ERROR READING FILE');
				console.log(err);
			}
			else {
				var dfxpFilename = srtFile.replace('.srt','.dfxp');

				// standardize newlines and remove the utf-8 bom if found
				var srt = data.toString().replace(/(\r\n)/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');;
				var blocks = srt.split('\n\n');
				var captions = []

				var blocksLength = blocks.length;
				console.log('blocksLength: ' + blocksLength);
				for (var i=0; i<blocksLength; i++) {
					if (blocks[i]) {
						var lines = blocks[i].split('\n');

						var linesLength = lines.length;
						var caption = {};
						var captionID = parseInt(lines[0], 10);
						var captionTimes = lines[1].split(' ');
						var captionBegin = captionTimes[0].replace(',','.');
						var captionEnd = captionTimes[2].replace(',','.');
						var captionText = lines[2];
						for (var k=3; k<linesLength; k++) {
							captionText += '<br/>' + lines[k];
						}

						caption.id = captionID;
						caption.begin = captionBegin;
						caption.end = captionEnd;
						caption.text = captionText;

						captions.push(caption);
					}
				}

				fs.writeFile(dfxpFilename, _.template(dfxpTemplate, {captions: captions}), function(err) {
					if (err) {
						console.log('ERROR WRITING FILE');
						console.log(err);
					}
				});
			}
		});
	}
}
else {
	console.log('no srt file specified');
}
