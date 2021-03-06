#!/usr/bin/env node

////////////////////////////////////////////////////////////////////////////////
// TODO: support capitalized extensions
// TODO: support etensions in path (e.g. /var/my.dfxps/myfile.dfxp)
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
var htmlparser = require('htmlparser');

var SOURCE_EXTENSIONS = [/\.dfxp$/i, /\.xml$/i]; // in regex format
var TARGET_EXTENSION = '.srt';
var SRT_TEMPLATE = fs.readFileSync('templates/srt.tmpl').toString();

var args = process.argv;
var sourceDir = args.length > 2 ? args[2] : '';
var targetDir = args.length > 3 ? args[3] : '';

var specialCharacters = JSON.parse(fs.readFileSync('specialCharacters.json').toString());

// remove all line breaks
var oneliner = function(lines) {
	return lines.replace(/\r/g, '').replace(/\n/g, '');
};

// reduce all whitespace multiples
var tightenUp = function(spacedOut) {
	return spacedOut.replace(/\s+/g, ' ');
};

// remove whitespace between tags
var touching = function(untouched) {
	return untouched.replace(/ </g, '<').replace(/> /g, '>');
};

// it's easier to search and replace breaks than to parse the xml
var breakdown = function(breaks) {
	return breaks.replace(/<br\s*\/>/g, '\n');
};

// convert special characters
var unspecial = function(snowflakes) {
	_.each(specialCharacters, function(special) {
		if (special.numberCode && special.glyph) {
			var rx = new RegExp(special.numberCode,'g');
			snowflakes = snowflakes.replace(rx, special.glyph);
		}
	});

	return snowflakes;
};

// remove any extraneous spaces
var spaceCadet = function(spacey) {
	return spacey.trim().replace(/[^\S\n]+/g, ' ').replace(/^[^\S\n]/, ''); // not-not-whitespace or not-newline
};

// handle inner tags such as 'text text <span tts:fontStyle="italic">fancy text</span> text'
var reduction = function(memo, node) {
	if (node.type === 'text') {
		return memo + node.data;
	}
	else if (node.attribs['tts:fontStyle']) {
		switch (node.attribs['tts:fontStyle']) {
			case 'italic':
				return memo + ' <i>' + _.reduce(node.children, reduction, '') + '</i> ';
			case 'bold':
				return memo + ' <b>' + _.reduce(node.children, reduction, '') + '</b> ';
		}
	}
};

var dfxp2srt = function(infile, outfile) {
	var sourceContents = fs.readFileSync(infile, 'utf8');

	if (sourceContents) {

		// remove the utf-8 bom if found
		var dfxp = sourceContents.toString().replace(/^\uFEFF/, '');

		// clean up the source
		dfxp = unspecial(breakdown(touching(tightenUp(oneliner(dfxp)))));

		var handler = new htmlparser.DefaultHandler(function(err, res) {
			if (err) {
				console.log(err);
			}
			else {
				var nodes = res[0].children[1].children[0].children;

				var captions = _.map(nodes, function(node, i) {
					var caption = {};

					caption.id = i + 1;
					caption.begin = node.attribs.begin.replace('.', ',');
					caption.end = node.attribs.end.replace('.', ',');
					caption.text = _.reduce(node.children, reduction, '');

					// clean up extra spacing from our <i> and <b> tags
					caption.text = spaceCadet(caption.text);

					return caption;
				});

				fs.writeFileSync(outfile, _.template(SRT_TEMPLATE, {captions: captions}), 'utf8');
			}
		});

		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(dfxp);
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
		fileNames = _.filter(fileNames, function(fileName) { // any filenames...
			return _.some(SOURCE_EXTENSIONS, function(ext) { // that match any of these file extensions
				return fileName.search(ext) !== -1;
			})
		});

		_.each(directoryNames, function(directoryName) {
			var newSource = path.join(source, directoryName);
			var newDestination = path.join(destination, directoryName);

			parseDir(newSource, newDestination);
		});

		_.each(fileNames, function(fileName) {
			var infile = path.join(source, fileName);
			var outfile = path.join(destination, fileName.replace(_.find(SOURCE_EXTENSIONS, function(ext) { return fileName.search(ext) !== -1; }), TARGET_EXTENSION));

			try {
				dfxp2srt(infile, outfile);
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
		console.log('Usage: ./dfxpToSRT.js <source dir> <target dir>');
	}
}
else {
	console.log('No source directory specified');
	console.log('Usage: ./dfxpToSRT.js <source dir> <target dir>');
}

