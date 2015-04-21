'use strict';

describe('dep-copy', function () {
	var DepCopy = require('../dep-copy.js'),
		fs = require('fs'),
		path = require('path'),
		through = require('through2');

	var dependencyIndexFile = 'dependency-index.json';
	var packageName = 'testPackage';
	var deployDir = './tests/testDeployFolder';
	var basePath = 'tests/testInputs';
	var installer;

	beforeEach(function () {
		installer = new DepCopy(basePath, packageName, deployDir);
	});

	describe('basic functionality', function () {

		it('getIndexFilePath should concatenate with basePath', function () {
			//Arrange

			//Act
			var result = installer.getIndexFilePath(dependencyIndexFile);

			//Assert
			expect(result).toEqual('tests\\testDeployFolder\\' + dependencyIndexFile);
		});

		it('registerDependency to undefined object', function () {
			//Arrange
			var indexObject;

			//Act
			var result = installer.registerDependency(indexObject, "somedll.dll");

			//Assert
			var expectedResult = {
				"somedll.dll": [packageName]
			};

			expect(result).toEqual(expectedResult);

		});

		it('registerDependency to empty object', function () {
			//Arrange
			var indexObject = {};
			//Act
			var result = installer.registerDependency(indexObject, "somedll.dll");

			//Assert
			var expectedResult = {
				"somedll.dll" : [packageName]
			};

			expect(result).toEqual(expectedResult);
		});

		it('registerDependency to object already containing some dependencies for this package', function () {
			//Arrange
			var indexObject = {
				"previouslyAddedDll.dll" : [packageName]
			};

			//Act
			var result = installer.registerDependency(indexObject, "somedll.dll");

			//Assert
			var expectedResult = {
				"previouslyAddedDll.dll": [packageName],
				"somedll.dll": [packageName]
			};
			expect(result).toEqual(expectedResult);
		});

		it('registerDependency should add another package to dependency from some other package', function() {
			//Arrange
			var indexObject = {
				"previouslyAddedDll.dll": ["PreviouslyAddedPackage"]
			};
			
			//Act
			var result = installer.registerDependency(indexObject, "previouslyAddedDll.dll");

			//Assert
			var expectedResult = {
				"previouslyAddedDll.dll": ["PreviouslyAddedPackage", packageName]
			};
			expect(result).toEqual(expectedResult);
		});

		it('registerDependency should not add duplicate', function () {
			//Arrange
			var indexObject = {
				"duplicatedll.dll" : [packageName]
			};

			//Act
			var result = installer.registerDependency(indexObject, "duplicatedll.dll");

			//Assert
			var expectedResult = {
				"duplicatedll.dll" : [packageName]
			};
			expect(result).toEqual(expectedResult);
		});

		it('unregisterDependency - only this package is dependent - should remove completely', function() {
			//Arrange

			var indexObject = {
				"bin\\somedll.dll": [packageName]
			}

			console.log(indexObject);

			//Act
			installer.unregisterDependency(indexObject, "bin\\somedll.dll");

			//Assert
			expect(indexObject).toEqual({});
			expect(indexObject["bin\\somedll.dll"]).toBeUndefined();

		});

		it('unregisterDependency - more packages dependent - should remove package dependency', function() {
			//Arrange
			var indexObject = {
				"bin\\somedll.dll": [packageName, "otherPackage"]
			}
			
			//Act
			installer.unregisterDependency(indexObject, "bin\\somedll.dll");

			//Assert
			expect(indexObject).toEqual({ "bin\\somedll.dll": ["otherPackage"] });
			expect(indexObject["bin\\somedll.dll"].length).toEqual(1);
		});
	});

	describe('file misc functions', function () {
		beforeEach(function () {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '{}');
		});

		afterEach(function () {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '{}');
		});

		it('indexFileExists should return true', function () {
			//Arrange

			//Act
			var result = installer.indexFileExists(dependencyIndexFile);

			//Assert
			expect(result).toEqual(true);
		});

		it('indexFileExists should return false if no such file exists', function () {
			//Arrange

			//Act
			var result = installer.indexFileExists("file.json");

			//Assert
			expect(result).toEqual(false);
		});

		it('getIndexFileContent shoudl return empty object if file is blank', function() {
			//Arrange
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '');
			
			//Act
			var result = installer.getIndexFileContent(dependencyIndexFile);

			//Assert
			expect(result).toEqual({});
		});

		it('getIndexFileContent should return content of indexFile', function () {
			//Arrange

			//Act
			var result = installer.getIndexFileContent(dependencyIndexFile);

			//Assert
			expect(result).toEqual({});
		});

		it('getIndexFileContent should return null if no file', function () {
			//Arrange

			//Act
			var result = installer.getIndexFileContent("no-file.json");

			//Assert
			expect(result).toEqual(null);
		});

		it('setIndexFileContent should set new content to an existing file', function () {
			//Arrange
			var newContent = {};
			newContent["dependency1.dll"] = [packageName];
			newContent["dependency2.dll"] = [packageName];

			//Act
			installer.setIndexFileContent(dependencyIndexFile, newContent, function() {
				var content = installer.getIndexFileContent(dependencyIndexFile);
				expect(content).toEqual(newContent);
			});

			//Assert
			
		});

		it('setIndexFileContent should throw if file doesnt exist', function () {
			//Arrange
			var content = {};

			//Act

			expect(function () { installer.setIndexFileContent("new-file.json", content); }).toThrow(new Error("Index file new-file.json does not exist"));

			//Assert

		});
	});

	describe('file end-to-end tests', function () {
		beforeEach(function () {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '{}');
		});

		afterEach(function () {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '{}');
		});

		it('addPackageDependency should add dependency to existing file', function () {
			//Arrange

			//Act
			installer.addPackageDependency(dependencyIndexFile, "somedll.dll", function () {

				//Assert
				var content = installer.getIndexFileContent(dependencyIndexFile);
				var newContent = {
					"somedll.dll": [packageName]
				};
				expect(content).toEqual(newContent);
			});
		});

		it('addPackageDependency should create new file if does not exist', function () {
			//Arrange
			var newFileName = "some-file-name.json";

			//Act
			installer.addPackageDependency(newFileName, "somedll.dll", function() {
				//Assert
				var content = installer.getIndexFileContent(newFileName);
				var newContent = {
					"somedll.dll": [packageName]
				};
				expect(content).toEqual(newContent);
				cleanup();
			});

			var cleanup = function() {
				//cleanup
				var filePath = installer.getIndexFilePath(newFileName);
				fs.unlinkSync(filePath);
			}
		});
	});

	describe('removeFromIndexFile tests', function () {
		var writeToFile = function(indexFileObject) {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, JSON.stringify(indexFileObject, null, 4));
		}

		afterEach(function () {
			var filePath = installer.getIndexFilePath(dependencyIndexFile);
			fs.writeFileSync(filePath, '{}');

		});

		it('removeFromIndexFile should remove dependency from file', function () {
			//Arrange
			var indexFileObject = {
				"somedll.dll": [packageName]
			}
			writeToFile(indexFileObject);

			//Act
			installer.removeFromIndexFile(function() {
				//Assert
				var content = installer.getIndexFileContent(dependencyIndexFile);
				expect(content).toEqual({});
			});
		});

		it('removeFromIndexFile should deregister dependency if more packages are dependent on file', function() {
			//Arrange
			var indexFileObject = {
				"somedll.dll": [packageName, "otherPackage"]
			}
			writeToFile(indexFileObject);

			//Act
			installer.removeFromIndexFile(function() {
				//Assert
				var content = installer.getIndexFileContent(dependencyIndexFile);
				expect(content).toEqual({
					"somedll.dll": ["otherPackage"]
				});
			});
		});

		it('removeFromIndexFile should remove and deregister dependency', function() {
			//Arrange
			var indexFileObject = {
				"somedll1.dll": [packageName, "otherPackage"],
				"somedll2.dll": [packageName]
			}
			writeToFile(indexFileObject);

			//Act
			installer.removeFromIndexFile(function () {
				//Assert
				var content = installer.getIndexFileContent(dependencyIndexFile);
				expect(content).toEqual({
					"somedll1.dll": ["otherPackage"]
				});
			});
		});

		it('copyFiles should not fail', function() {
			//Arrange
			var stream = through({objectMode: true});
			var filePath = 'App/Packages/someController.js';			

			//Act
			stream.pipe(installer.copyFiles());

			stream.write({relative: filePath});

			//Assert
			var completeFilePath = path.join(deployDir, filePath);
			console.log(completeFilePath);
		});
	});

});



