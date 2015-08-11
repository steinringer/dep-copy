'use strict';
var fs = require('fs'),
    fse = require('fs-extra'),
    path = require('path'),
    through = require('through2');

var DepCopy = function (baseDirectory, packageName, deployDir, options) {
    this.baseDirectory = baseDirectory;
    this.packageName = packageName;
    this.deployDir = deployDir;
    this.indexFileName = "dependency-index.json";
    
    this.options = {
	    preserveTree : true
    }
    for (var name in options) {
        if (options.hasOwnProperty(name)) {
	        this.options[name] = options[name];
        }
    }
};

DepCopy.prototype.copyFiles = function () {
    var self = this;
    return through({ objectMode: true }, function (data, enc, callback) {
        var th = this;
        self.deploy(data.relative, self.deployDir, function () {
            th.push(data);
            callback();
        });
    });
}

DepCopy.prototype.addToIndexFile = function () {
    var self = this;
    return through({ objectMode: true }, function (data, enc, callback) {
	    var filePath = data.relative;
	    console.log("Adding to index file: " + filePath);
	    self.addPackageDependency(self.indexFileName, filePath);
        
        this.push(data);
        callback();
    });
}

DepCopy.prototype.readIndexFile = function () {
    var self = this;
    var content = this.getIndexFileContent(this.indexFileName);
    var dependencies = Object.keys(content);
    
    var stream = through({ objectMode: true });
    
    dependencies.forEach(function (dependency) {
        console.log("Reading dependency: " + dependency);
        stream.write(dependency);
    });
    return stream;
}

DepCopy.prototype.removeFromIndexFile = function () {
    var self = this;
    
    return through({ objectMode: true }, function (data, enc, callback) {
        var th = this;
        var content = self.getIndexFileContent(self.indexFileName);
        self.unregisterDependency(content, data);
        self.setIndexFileContent(self.indexFileName, content, function () {
	        callback();
	        th.push(data);
        });
    });
}

DepCopy.prototype.removeFile = function () {
    var self = this;
    
    return through({ objectMode: true }, function (data, enc, callback) {
        var filePath = path.join(self.deployDir, data.toString());
        fse.remove(filePath, function (err) {
            if (err) return console.error(err);
            return console.log("Deleted file: " + filePath);
        });
        
        this.push(data);
        callback();
    });
}

DepCopy.prototype.unregisterDependency = function (indexObject, dependency) {
    var dependencyArray = indexObject[dependency];
    if (dependencyArray.length == 1 && dependencyArray[0] == this.packageName) {
        delete indexObject[dependency];
    } else {
	    var indexOf = dependencyArray.indexOf(this.packageName);
        if (indexOf > -1) {
            indexObject[dependency].splice(indexOf, 1);
        }
    }
};

DepCopy.prototype.abandonTree = function (destPath) {
    var self = this;
    if (self.options.preserveTree === false) {
	    destPath = destPath.substring(destPath.lastIndexOf("/"));
    }
	return destPath;
}

DepCopy.prototype.deploy = function (file, deployDir, callback) {
    var self = this;
    var sourcePath = path.join(this.baseDirectory, file);

	var destFile = self.abandonTree(file);
    var destPath = path.join(deployDir, destFile);
    fse.copy(sourcePath, destPath, function (err) {
        if (err) return console.error("ERROR", err);
        callback();
        return console.log("Copied: " + sourcePath + " to: " + destPath);
    });
}

//checks if file with provided name exists
DepCopy.prototype.indexFileExists = function (indexFileName) {
    var indexFilePath = this.getIndexFilePath(indexFileName);
    var exists = fs.existsSync(indexFilePath);
    return exists;
}

//returns joined patha of baseDirectory and indexFile
DepCopy.prototype.getIndexFilePath = function (indexFileName) {
    return path.join(this.deployDir, indexFileName);
}

//returns content of indexFile as parsed JSON object
DepCopy.prototype.getIndexFileContent = function (indexFileName) {
    if (this.indexFileExists(indexFileName)) {
        var indexFilePath = this.getIndexFilePath(indexFileName);
        var fileContent = fs.readFileSync(path.resolve(indexFilePath));
        var parsedJson;
        try {
            parsedJson = JSON.parse(fileContent);
        } catch (e) {
            parsedJson = {};
        }
        return parsedJson;
    }
    return null;
}

//adds new dependency to an JSON object
DepCopy.prototype.registerDependency = function (indexObject, dependency) {
    
    if (!indexObject) indexObject = {};
    
    var packageDependency = indexObject[dependency];
    if (packageDependency) {
        if (packageDependency.indexOf(this.packageName) == -1)
            packageDependency.push(this.packageName);
    } else {
        packageDependency = [this.packageName];
    }
    indexObject[dependency] = packageDependency;
    return indexObject;
}

//saves an JSON object to indexFile
DepCopy.prototype.setIndexFileContent = function (indexFileName, content, callback) {
    if (!this.indexFileExists(indexFileName)) throw new Error("Index file " + indexFileName + " does not exist");
    
    var filePath = this.getIndexFilePath(indexFileName);
    fs.truncateSync(filePath, 0);
    var jsonString = JSON.stringify(content, null, 4);
    fs.writeFile(filePath, jsonString, function (err) {
        if (err) return console.log(err);
        if (typeof callback == "function") callback();
    });
}

//creates new indexFile with indexFileName
DepCopy.prototype.createIndexFile = function (indexFileName) {
    var filePath = this.getIndexFilePath(indexFileName);
    fs.closeSync(fs.openSync(filePath, 'w'));
}

//main method called from the addToIndexFile function that processes streams
DepCopy.prototype.addPackageDependency = function (indexFileName, dependency, callback) {
    dependency = this.abandonTree(dependency);
    var content = this.getIndexFileContent(indexFileName);
    if (content != null) {
        content = this.registerDependency(content, dependency);
    } else {
        this.createIndexFile(indexFileName);
        content = this.registerDependency(null, dependency);
    }
    this.setIndexFileContent(indexFileName, content, callback);
}



module.exports = DepCopy;
