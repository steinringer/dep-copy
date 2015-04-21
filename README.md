# dep-copy [![NPM version](https://badge.fury.io/js/dep-copy.png)](http://badge.fury.io/js/dep-copy)

Module provides methods to copy and remove files to a destination with having track of what has been copied in an index file. Can be used in an gulp task.

We have following app structure: 

```
.
+-- App
|   +-- Js
|   |   +-- SomeJs.js
|   +-- Templates
|   |   +-- Template.cshtml
+-- Configuration
|   +-- Config.json
+-- bin
|   +-- SomeDll.dll
+-- notImportantFile.txt

```

Example gulp task:
```javascript

var DepCopy = require('dep-copy'),
    referenceName = "AppPlugin",
    basePath = ".",
    destPath = '198.1.1.1\\deployFolder';

gulp.task('install', function() {
    var patterns = [ 
        'App/**/*.*',
        'Configuration/**/*.json',
        'bin/**/*.dll'
    ];

    var installer = new DepCopy(basePath, referenceName, destPath);

    gulp.src(patterns, { base: basePath })
		.pipe(installer.copyFiles())
		.pipe(installer.addToIndexFile());
});

gulp.task('uninstall', function () {

    var installer = new DepCopy(basePath, packageName, destPath);
    installer.readIndexFile()
		.pipe(installer.removeFromIndexFile())
		.pipe(installer.removeFile());
});

```

Running
```
gulp install
```
Will take all files matched by patterns, copy them to target directory. Each copied file will create an entry in a file named dependency-index.json in the target directory in format of:
```javascript
"App\\Js\\SomeJs.js" : [
    "AppPlugin"
]
```
Where the key is full path to the file, and value is array of dependent plugins on that file.

Running
```
gulp uninstall
```
Will parse that file, remove all files copied to that directory that have only one dependency 'AppPlugin' and leave rest intact.
