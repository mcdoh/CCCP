#!/usr/bin/env node

var fs = require('fs');
var _ = require('underscore');

var dfxpTemplate = fs.readFileSync('templates/dfxp.xml').toString();

var args = process.argv;
var srtDir = args.length > 2 ? args[2] : '';

if (srtDir) {
	if (fs.existsSync(srtDir)) {
		var filenames = fs.readdirSync(srtDir);
		filenames = _.filter(filenames, function(filename) { return filename.indexOf('.srt') > 0; });
		filenames = _.map(filenames, function(filename) { return srtDir + '/' + filename; });

		_.each(filenames, function(srtFile) {
			var infile = fs.readFileSync(srtFile, 'utf8');

			if (infile) {
				console.log(srtFile);
				var dfxpFilename = srtFile.replace('.srt','.dfxp');

				// remove the utf-8 bom if found
				var srt = infile.toString().replace(/^\uFEFF/, '');

				// standardize newlines
				srt = srt.replace(/(\r\n)/g, '\n').replace(/\r/g, '\n');

				// found a file that had three newlines in a row
				srt = srt.replace(/(\n\n\n)/g, '\n\n');

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

				fs.writeFileSync(dfxpFilename, _.template(dfxpTemplate, {captions: captions}), 'utf8');
			}
			else {
				console.log('ERROR READING FILE: ' + srtFile);
			}
		});
	}
	else {
		console.log('ERROR: PATH DOES NOT EXIST');
	}
}
else {
	console.log('no srt file specified');
}
