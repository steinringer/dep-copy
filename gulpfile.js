var gulp = require('gulp'),
	print = require('gulp-print'),
	Installer = require('./dep-copy.js');

var deployPath = './tests/testDeployFolder';
var packageName = "EXAMPLE";

var basePath = 'tests/testInputs';
var filesToBeInstalled = [
    './tests/testInputs/App/**/*.*',
    './tests/testInputs/Configuration/**/*.json',
    './tests/testInputs/bin/**/somedll.dll',
    './tests/testInputs/bin/**/*' + packageName + '*.dll'
];

gulp.task('install', function () {
    var installer = new Installer(basePath, packageName, deployPath);

	gulp.src(filesToBeInstalled, { base: basePath })
		.pipe(print())
		.pipe(installer.copyFiles())
		.pipe(installer.addToIndexFile());
});