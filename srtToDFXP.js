#!/usr/bin/env node

////////////////////////////////////////////////////////////////////////////////
// TODO: support capitalized extensions
// TODO: support etensions in path (e.g. /var/my.srts/myfile.srt)
// TODO: add better logging support
// TODO: modularize to load as a library
// TODO: separate file parsing and file construction
// TODO: add DFXP reader
// TODO: add SRT writer
// TODO: store subs in DB
// TODO: support single file conversion (not in a directory)
////////////////////////////////////////////////////////////////////////////////

var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var SOURCE_EXTENSION = '.srt';
var TARGET_EXTENSION = '.dfxp';
var DFXP_TEMPLATE = fs.readFileSync('templates/dfxp.xml').toString();

var args = process.argv;
var sourceDir = args.length > 2 ? args[2] : '';
var targetDir = args.length > 3 ? args[3] : '';

var srt2dfxp = function(infile, outfile) {
	var sourceContents = fs.readFileSync(infile, 'utf8');

	if (sourceContents) {
//		console.log(infile + ' -> ' + outfile);

		// remove the utf-8 bom if found
		var srt = sourceContents.toString().replace(/^\uFEFF/, '');

		// standardize newlines
		srt = srt.replace(/(\r\n)/g, '\n').replace(/\r/g, '\n');

		// found a file that had three newlines in a row
		srt = srt.replace(/(\n\n\n)/g, '\n\n');

		var blocks = srt.split('\n\n');
		var captions = [];

		var blocksLength = blocks.length;
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

		fs.writeFileSync(outfile, _.template(DFXP_TEMPLATE, {captions: captions}), 'utf8');
	}
	else {
		console.log('ERROR READING FILE: ' + infile);
	}
};

var parseDir = function(source, destination) {
	if (fs.existsSync(source)) {

		if (!fs.existsSync(destination)) {
			fs.mkdirSync(destination);
		}

		var contents = fs.readdirSync(source);
		var directoryNames = _.filter(contents, function(item) { return fs.statSync(path.join(source, item)).isDirectory(); });
		var fileNames = _.filter(contents, function(item) { return fs.statSync(path.join(source, item)).isFile(); });
		fileNames = _.filter(fileNames, function(fileName) { return fileName.indexOf(SOURCE_EXTENSION) !== -1; });

		_.each(directoryNames, function(directoryName) {
			var newSource = path.join(source, directoryName);
			var newDestination = path.join(destination, directoryName);

			parseDir(newSource, newDestination);
		});

		_.each(fileNames, function(fileName) {
			var infile = path.join(source, fileName);
			var outfile = path.join(destination, fileName.replace(SOURCE_EXTENSION, TARGET_EXTENSION));

			try {
				srt2dfxp(infile, outfile);
			}
			catch(e) {
				console.log('ERROR CONVERTING FILE');
				console.log('INFILE:  ' + infile);
				console.log('OUTFILE: ' + outfile);
				console.log(e);
			}
		});
	}
	else {
		console.log('ERROR: PATH DOES NOT EXIST');
		console.log(source);
	}
};

if (sourceDir) {
	if (targetDir) {
		var cwd = process.cwd();
		sourceDir = path.join(cwd, sourceDir);
		targetDir = path.join(cwd, targetDir);

		try {
			parseDir(sourceDir, targetDir);
		}
		catch(e) {
			console.log('ERROR PARSING DIR');
			console.log('Source:    ' + sourceDir);
			console.log('Destination: ' + targetDir);
			console.log(e);
		}
	}
	else {
		console.log('No target directory specified');
		console.log('Usage: ./srtToDFXP.js <source dir> <target dir>');
	}
}
else {
	console.log('No source directory specified');
	console.log('Usage: ./srtToDFXP.js <source dir> <target dir>');
}

