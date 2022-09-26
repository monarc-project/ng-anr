function ImportFileDialogCtrl($scope, $http, $mdDialog, ConfigService, AssetService, ThreatService,
	VulnService, MeasureService, ClientRecommandationService, SOACategoryService, TagService,
	RiskService, MeasureMeasureService, ObjlibService, gettextCatalog, $q, tab, referential,
	recommandationSet) {

	$scope.tab = tab;
	$scope.guideVisible = false;
	$scope.language = $scope.OFFICE_MODE == 'FO' ? $scope.getAnrLanguage() : ConfigService.getDefaultLanguageIndex();
	$scope.defaultLang = angular.copy($scope.language);
	var requiredFields = [];
	var extItemToCreate = [];
	var codes = [];
	var matches = [];
	var allMeasures = [];
	var allTags = [];
	var allLibraryCategories = [];
	var externalItem = null;
	var pluralExtItem = null;
	var extItemField = null;
	var parentIdsPaths = [];
	var externalItemsFound = [];

	switch (tab) {
		case 'Asset types':
			AssetService.getAssets().then(function(data) {
				codes = data.assets.map(asset => asset.code.toLowerCase());
			});
			break;
		case 'Threats':
			externalItem = 'theme';
			pluralExtItem = 'themes';
			ThreatService.getThreats().then(function(data) {
				codes = data.threats.map(threat => threat.code.toLowerCase());
			});
			ThreatService.getThemes().then(function(data) {
				$scope.actualExternalItems = data.themes;
			});
			break;
		case 'Vulnerabilties':
			VulnService.getVulns().then(function(data) {
				codes = data.vulnerabilities.map(vulnerability => vulnerability.code.toLowerCase());
			});
			break;
		case 'Controls':
			externalItem = 'category';
			pluralExtItem = 'categories';
			MeasureService.getMeasures({
				referential: referential
			}).then(function(data) {
				codes = data.measures.map(measure => measure.code.toLowerCase());
			});
			SOACategoryService.getCategories({
				order: $scope._langField('label'),
				referential: referential.uuid
			}).then(function(data) {
				$scope.actualExternalItems = data.categories;
			});
			break;
		case 'Information risks':
			externalItem = 'theme';
			pluralExtItem = 'themes';
			ThreatService.getThemes().then(function(data) {
				$scope.actualExternalItems = data.themes;
			});
			break;
		case 'Tags':
			TagService.getTags().then(function(data) {
				codes = data.tags.map(tag => tag.code.toLowerCase());
			});
			break;
		case 'Operational risks':
			externalItem = 'tag';
			pluralExtItem = 'tags';
			RiskService.getRisks().then(function(data) {
				codes = data.risks.map(risk => risk.code.toLowerCase());
			});
			TagService.getTags().then(data => {
				$scope.actualExternalItems = data.tags;
			});
			break;
		case 'Matches':
			MeasureMeasureService.getMeasuresMeasures().then(function(data) {
				matches = data.MeasureMeasure.map(mm => mm.father.uuid.toLowerCase() + mm.child.uuid.toLowerCase());
			});
			MeasureService.getMeasures().then(function(data) {
				allMeasures = data.measures;
			});
			break;
		case 'Recommendations':
			ClientRecommandationService.getRecommandations({
				anr: recommandationSet.anr.id
			}).then(data => {
				codes = data.recommandations.map(recommandation => recommandation.code.toLowerCase());;
			});
			break;
		case 'Assets library':
			externalItem = 'category';
			pluralExtItem = 'categories';
			AssetService.getAssets().then(function(data) {
				codes = data.assets;
			});
			TagService.getTags().then(function(data) {
				allTags = data.tags;
			})
			ObjlibService.getObjlibsCats().then(function(data) {
				allLibraryCategories = getFlatLibCategories(data.categories);
				allTreeViewCategories = angular.copy(data.categories);
				$scope.actualExternalItems = getLibraryCategoriesPath(data.categories);
			});
			break;
		default:
	}

	$scope.items = getImportFileLayout();

	$scope.parseFile = function(fileContent) {
		$scope.check = false;
		$scope.isProcessing = true;
		if (typeof fileContent === 'object') {
			if (Array.isArray(fileContent)) {
				$scope.importData = checkFile({
					data: fileContent
				});
			} else {
				alertWrongSchema();
			}
		} else {
			Papa.parse(fileContent, {
				header: true,
				skipEmptyLines: true,
				trimHeaders: true,
				beforeFirstChunk: function(chunk) {
					var rows = chunk.split(/\r\n|\r|\n/);
					rows[0] = rows[0].toLowerCase().trim();
					return rows.join('\n');
				},
				complete: function(importData) {
					$scope.importData = checkFile(importData);
				}
			});
		}
	};

	function checkFile(file) {
		extItemToCreate = [];
		if (externalItem) {
			extItemField = $scope.items[tab][externalItem].field;
		}

		for (let index in $scope.items[tab]) {
			if ($scope.items[tab][index].required) {
				requiredFields.push($scope.items[tab][index].field);
			}
		}

		if (!file.meta || file.meta.fields.some(rf => requiredFields.includes(rf)) && file.data.length) {
			if (tab == "Information risks") {
				const amvItems = ['asset', 'threat', 'vulnerability']
				getAllAmvItems().then(function(values) {
					file.data.reduce((acc, current, index, data) => {
						findExternalItem(current, extItemField);
						const duplicate = acc.find(item => item['asset code'] === current['asset code'] &&
							item['threat code'] === current['threat code'] &&
							item['vulnerability code'] === current['vulnerability code']
						);
						if (!duplicate) {
							current.error = '';
							current['asset uuid'] = current['threat uuid'] = current['vulnerability uuid'] = null;
							checkRequiredFields(current);

							amvItems.forEach(function(amvItem, i) {
								let itemFound = values[i].find(item => item.code.toLowerCase() === current[amvItem + ' code'].toLowerCase().trim());
								if (itemFound !== undefined) {
									current[amvItem + ' uuid'] = itemFound.uuid;
								}
							});
							return acc.concat([current]);
						} else {
							current.error = gettextCatalog.getString('This risk is already on the import list');
							$scope.check = true;
							return acc;
						}
					}, []);
					alertCreateNewExternalItems();
				});
			} else if (tab == 'Assets library') {
				var libraryCategoryPaths = [];

				file.data.forEach((row, index) => {
					let isPrimaryAsset = false;
					row.error = '';
					checkRequiredFields(row);

					if (row['asset type code'] && !codes.map(code => code.code.toLowerCase()).includes(row['asset type code'].toLowerCase().trim())) {
						row.error += gettextCatalog.getString('the asset type code does not exist. Create it before import') + "\n";;
						$scope.check = true;
					} else if (row['asset type code']) {
						let assetType = codes.find(code => code.code.toLowerCase() === row['asset type code'].toLowerCase().trim())
						row.asset = assetType.uuid;
						row.isPrimaryAsset = assetType.type == 1 ? true : false;
					}

					if (row['operational risk tag'] && row.isPrimaryAsset) {
						if (!allTags.map(tag => tag.code.toLowerCase()).includes(row['operational risk tag'].toLowerCase().trim())) {
							row.error += gettextCatalog.getString('the operational risk tag does not exist. Create it before import') + "\n";;
							$scope.check = true;
						} else if (row['operational risk tag']) {
							row.rolfTag = allTags.find(tag => tag.code.toLowerCase() === row['operational risk tag'].toLowerCase().trim()).id
						}
					}

					if (row[extItemField]) {
						let path = row[extItemField]
							.split(" ")
							.join("")
							.toLowerCase()
							.trim();

						parentIdsPaths = [];

						if ($scope.OFFICE_MODE == 'FO') {
							let [categoryFound, parentIds] = findExternalObjectsCategory(row[extItemField].split(">>"), allTreeViewCategories);
							row.parentIdsPath = parentIds;

							row.categoriesToCreate = (!categoryFound ? true : false);

							if (!categoryFound && !libraryCategoryPaths.includes(path)) {
								libraryCategoryPaths.push(path);
								extItemToCreate.push(row[extItemField]);
								row.alert = $scope.check ? false : true;
							}
						} else {
							let libraryCategories = [];
							for (let i = 1; i <= 4; i++) {
								let [categoryFound, parentIds] = findExternalObjectsCategory(row[extItemField.slice(0, -1) + i].split(">>"), allTreeViewCategories);
								libraryCategories[i] = categoryFound
								row.parentIdsPath = parentIds;
							}
							row.categoriesToCreate = libraryCategories.every(lc => !lc);

							if (libraryCategories.every(lc => !lc) && !libraryCategoryPaths.includes(path)) {
								libraryCategoryPaths.push(path);
								extItemToCreate.push(row[extItemField]);
								row.alert = $scope.check ? false : true;
							}
						}
					}
				});
			} else if (tab == 'Matches') {
				file.data.forEach(row => {
					row.error = '';
					checkRequiredFields(row);

					if (row.control && row.match) {
						let uuids = allMeasures.map(item => item.uuid);

						if (!uuids.includes(row.control.toLowerCase().trim())) {
							row.control = '-';
							row.error += gettextCatalog.getString('control does not exist') + "\n";
							$scope.check = true;
						} else {
							let measureControl = allMeasures.find(measure => measure.uuid == row.control.toLowerCase().trim());
							row.father = row.control;
							row.control = measureControl.referential['label' + $scope.language] +
								" : " +
								measureControl.code +
								" - " +
								measureControl['label' + $scope.language];
						}

						if (!uuids.includes(row.match.toLowerCase().trim())) {
							row.match = '-';
							row.error += gettextCatalog.getString('match does not exist') + "\n";
							$scope.check = true;
						} else {
							let measureMatch = allMeasures.find(measure => measure.uuid == row.match.toLowerCase().trim());
							row.child = row.match;
							row.match = measureMatch.referential['label' + $scope.language] +
								" : " +
								measureMatch.code +
								" - " +
								measureMatch['label' + $scope.language];
						}

						if (!row.error.length && matches.includes(row.father.toLowerCase().trim() + row.child.toLowerCase().trim())) {
							row.error += gettextCatalog.getString('this matching is already in use') + "\n";
							$scope.check = true;
						}
					}
				});
			} else if (tab == 'Recommendations') {
				let codeList = angular.copy(codes);
				file.data.forEach(row => {
					row.error = '';
					if (row.code) {
						if (codeList.includes(row.code.toLowerCase().trim())) {
							row.error += gettextCatalog.getString('code is already in use') + "\n";;
							$scope.check = true;
						} else {
							codeList.push(row.code.toLowerCase().trim());
						}
					}
					if (row.importance) {
						row.importance = Number(row.importance);
						if (row.importance < 0 || row.importance > 3) {
							row.error += gettextCatalog.getString('importance must be between 1 and 3') + "\n";
							$scope.check = true;
						}
					}
				});
			} else {
				let codeList = angular.copy(codes);
				file.data.forEach(row => {
					row.error = '';
					checkRequiredFields(row)

					if (requiredFields.includes('code') && row.code) {
						if (codeList.includes(row.code.toLowerCase().trim())) {
							row.error += gettextCatalog.getString('code is already in use') + "\n";;
							$scope.check = true;
						} else {
							codeList.push(row.code.toLowerCase().trim());
						}
					}

					if (externalItem && row[extItemField]) {
						if (externalItem == 'tag') {
							if ($scope.OFFICE_MODE == 'FO') {
								let tags = row[extItemField].toString().split("/");
								tags.forEach(tag => {
									tagToSearch = {
										['label' + $scope.language]: tag
									};
									let tagFound = findExternalItem(tagToSearch, ['label' + $scope.language]);
									if (!tagFound) row.alert = $scope.check ? false : true;
								});
							} else {
								let tags = [];
								for (let i = 1; i <= 4; i++) {
									tags[i] = row[extItemField.slice(0, -1) + i].toString().split("/");
								}

								tags[1].map((x, i) => {
									tagToSearch = {};
									tags.map((tag, index) => {
										tagToSearch[extItemField.slice(0, -1) + index] = tag[i]
									})
									let tagFound = findExternalItem(tagToSearch, extItemField);
									if (!tagFound) row.alert = $scope.check ? false : true;
								})
							}
						} else {
							findExternalItem(row, extItemField);
						}
					}
				});
			}
			alertCreateNewExternalItems();
		} else {
			alertWrongSchema();
			return;
		}
		$scope.isProcessing = false;
		return file.data;
	};

	$scope.uploadFile = async function() {
		let filedata = angular.copy($scope.importData);
		let itemFields = [
			'uuid',
			'theme',
			'category',
			'referential',
			'recommandationset'
		];

		let multilangueFields = [
			'label',
			'description',
			'name',
		];

		for (let i = 1; i <= 4; i++) {
			multilangueFields.forEach(field => {
				itemFields.push(field + i);
			});
		}
		switch (tab) {
			case 'Controls':
				itemFields.push('referential');
				break;
			case 'Information risks':
				itemFields.push('asset uuid', 'threat uuid', 'vulnerability uuid');
				break;
			case 'Matches':
				itemFields.push('father', 'child');
				break;
			default:
		}

		for (var index in $scope.items[tab]) {
			itemFields.push($scope.items[tab][index]['field']);
		}

		for await (var [i, row] of filedata.entries()) {
			if (tab == 'Threats') {
				let cia = ['c', 'i', 'a'];
				cia.forEach(criteria => {
					if (!row[criteria] || row[criteria] == 0 || row[criteria].toLowerCase().trim() == 'false') {
						row[criteria] = false;
					} else {
						row[criteria] = true;
					}
				});
				if (row[extItemField]) {
					if (inExternalItemsFound(row[extItemField])) {
						row.theme = inExternalItemsFound(row[extItemField]);
					} else {
						await createTheme(row).then(function(id) {
							row.theme = id;
						});
					}
				}
			}

			if (tab == 'Controls') {
				row.referential = referential;
				if (row[extItemField]) {
					if (inExternalItemsFound(row[extItemField])) {
						row.category = inExternalItemsFound(row[extItemField]);
					} else {
						await createCategory(row).then(function(id) {
							row.category = id;
						});
					}
				}
			}

			if (tab == 'Information risks') {
				let theme = null;
				if (row[extItemField]) {
					if (inExternalItemsFound(row[extItemField])) {
						theme = inExternalItemsFound(row[extItemField]);
					} else {
						await createTheme(row).then(function(id) {
							theme = id;
						});
					}
				}

				filedata[i] = {
					asset: {
						uuid: row['asset uuid'],
						code: row['asset code'].trim(),
						label1: row['asset label1'] ? row['asset label1'].trim() : null,
						label2: row['asset label2'] ? row['asset label2'].trim() : null,
						label3: row['asset label3'] ? row['asset label3'].trim() : null,
						label4: row['asset label4'] ? row['asset label4'].trim() : null,
						type: 2,
						description1: row['asset description1'] ? row['asset description1'].trim() : null,
						description2: row['asset description2'] ? row['asset description2'].trim() : null,
						description3: row['asset description3'] ? row['asset description3'].trim() : null,
						description4: row['asset description4'] ? row['asset description4'].trim() : null,
					},
					threat: {
						uuid: row['threat uuid'],
						code: row['threat code'].trim(),
						label1: row['threat label1'] ? row['threat label1'].trim() : null,
						label2: row['threat label2'] ? row['threat label2'].trim() : null,
						label3: row['threat label3'] ? row['threat label3'].trim() : null,
						label4: row['threat label4'] ? row['threat label4'].trim() : null,
						description1: row['threat description1'] ? row['threat description1'].trim() : null,
						description2: row['threat description2'] ? row['threat description2'].trim() : null,
						description3: row['threat description3'] ? row['threat description3'].trim() : null,
						description4: row['threat description4'] ? row['threat description4'].trim() : null,
						c: (!row['threat c'] || row['threat c'] == 0 || row['threat c'].toLowerCase().trim() == 'false' ? false : true),
						i: (!row['threat i'] || row['threat i'] == 0 || row['threat i'].toLowerCase().trim() == 'false' ? false : true),
						a: (!row['threat a'] || row['threat a'] == 0 || row['threat a'].toLowerCase().trim() == 'false' ? false : true),
						theme: theme
					},
					vulnerability: {
						uuid: row['vulnerability uuid'],
						code: row['vulnerability code'].trim(),
						label1: row['vulnerability label1'] ? row['vulnerability label1'].trim() : null,
						label2: row['vulnerability label2'] ? row['vulnerability label2'].trim() : null,
						label3: row['vulnerability label3'] ? row['vulnerability label3'].trim() : null,
						label4: row['vulnerability label4'] ? row['vulnerability label4'].trim() : null,
						description1: row['vulnerability description1'] ? row['vulnerability description1'].trim() : null,
						description1: row['vulnerability description2'] ? row['vulnerability description2'].trim() : null,
						description1: row['vulnerability description3'] ? row['vulnerability description3'].trim() : null,
						description1: row['vulnerability description4'] ? row['vulnerability description4'].trim() : null,
						['label' + $scope.language]: row['vulnerability label'],
						['description' + $scope.language]: row['vulnerability description']
					}
				}

				if ($scope.OFFICE_MODE == 'FO') {
					filedata[i].asset['label' + $scope.language] = row['asset label'] ? row['asset label'].trim() : null;
					filedata[i].asset['description' + $scope.language] = row['asset description'] ? row['asset description'].trim() : null;
					filedata[i].threat['label' + $scope.language] = row['threat label'] ? row['threat label'].trim() : null;
					filedata[i].threat['description' + $scope.language] = row['threat description'] ? row['threat description'].trim() : null;
					filedata[i].vulnerability['label' + $scope.language] = row['vulnerability label'] ? row['vulnerability label'].trim() : null;
					filedata[i].vulnerability['description' + $scope.language] = row['vulnerability description'] ? row['vulnerability description'].trim() : null;
				}
			}

			if (tab == 'Assets library') {
				libraryCategoryPaths = [];
				let libraryCategories = row[extItemField].toString().split(">>");

				for await (let [index, libraryCategory] of libraryCategories.entries()) {
					if (row.categoriesToCreate && row.parentIdsPath.length - index == 0) {
						let libraryCategoryFound = allLibraryCategories.find(category => {
							let parent = index == 0 ? null : row.parentIdsPath[index - 1];
							return category['label' + $scope.language].toLowerCase().trim() == libraryCategory.toLowerCase().trim() &&
								category.parent == parent;
						});

						if (!libraryCategoryFound) {
							let categoryToCreate = {
								parent: index == 0 ? null : row.parentIdsPath[index - 1],
								implicitPosition: 2,
								position: null,
								['label' + $scope.language]: libraryCategory.trim(),
							};

							if ($scope.OFFICE_MODE == 'BO') {
								categoryToCreate = {
									parent: index == 0 ? null : row.parentIdsPath[index - 1],
									implicitPosition: 2,
									position: null,
									label1: row['category label1'].toString().split(">>")[index] ? row['category label1'].toString().split(">>")[index].trim() : null,
									label2: row['category label2'].toString().split(">>")[index] ? row['category label2'].toString().split(">>")[index].trim() : null,
									label3: row['category label3'].toString().split(">>")[index] ? row['category label3'].toString().split(">>")[index].trim() : null,
									label4: row['category label4'].toString().split(">>")[index] ? row['category label4'].toString().split(">>")[index].trim() : null,
								};
							}
							await createLibraryCategory(categoryToCreate).then(function(id) {
								row.parentIdsPath.push(id);
							});
						} else {
							row.parentIdsPath.push(libraryCategoryFound.id);
						}
					}
				}

				filedata[i] = {
					asset: row.asset,
					category: row.parentIdsPath[row.parentIdsPath.length - 1],
					implicitPosition: 2,
					label1: row.label1 ? row.label1.trim() : null,
					label2: row.label2 ? row.label2.trim() : null,
					label3: row.label3 ? row.label3.trim() : null,
					label4: row.label4 ? row.label4.trim() : null,
					mode: row.mode ? row.mode : null,
					name1: row.name1 ? row.name1.trim() : null,
					name2: row.name2 ? row.name2.trim() : null,
					name3: row.name3 ? row.name3.trim() : null,
					name4: row.name4 ? row.name4.trim() : null,
					rolfTag: row.rolfTag,
					scope: row.isPrimaryAsset ? 1 : row.scope,
				}
			}

			if (tab == 'Recommendations') {
				row.recommandationSet = recommandationSet.uuid;
			}

			if (tab == 'Operational risks') {
				let tagsIds = [];
				let tags = row[extItemField].toString().split("/");
				for await (let [index, tag] of tags.entries()) {
					if (inExternalItemsFound(tag)) {
						tagsIds.push(inExternalItemsFound(tag));
					} else {
						await createTag(tag).then(function(id) {
							tagsIds.push(id);
						});
					}
				}
				row.tags = tagsIds;
			}

			if ($scope.OFFICE_MODE == 'FO') {
				if (row.label) {
					filedata[i]['label' + $scope.language] = row.label.trim();
					delete row.label;
				}

				if (row.description && tab !== 'Recommendations') {
					filedata[i]['description' + $scope.language] = row.description.trim();
					delete row.description;
				}

				if (row.name) {
					filedata[i]['name' + $scope.language] = row.name.trim();
					delete row.name;
				}
			}

			for (let key of Object.keys(row)) {
				if (!itemFields.includes(key.toLowerCase())) {
					delete row[key];
				}
			}
		}

		$mdDialog.hide(filedata);
	};

	$scope.downloadExempleFile = function() {

		let fields = [];
		for (var index in $scope.items[tab]) {
			if ($scope.items[tab][index]['field']) {
				fields.push($scope.items[tab][index]['field']);
			}
		}
		data = encodeURI('data:text/csv;charset=UTF-8,﻿' + fields.join());
		link = document.createElement('a');
		link.setAttribute('href', data);
		link.setAttribute('download', 'ExampleFile.csv');
		document.body.appendChild(link);
		link.click();
	}

	$scope.toggleGuide = function() {
		$scope.guideVisible = !$scope.guideVisible;
	};

	$scope.cancel = function() {
		$mdDialog.cancel();
	};

	function getFlatLibCategories(categories) {
		return categories.reduce((acc, category) => {
			if (category.child && category.child.length) {
				acc.push(category)
				acc = acc.concat(getFlatLibCategories(category.child));
			} else {
				acc.push(category);
			}
			return acc;
		}, []);
	}

	function getLibraryCategoriesPath(categories, parentPath) {
		return categories.reduce((acc, category) => {
			if (parentPath) {
				for (let i = 1; i <= 4; i++) {
					category['label' + i] = parentPath['label' + i] + " >> " + category['label' + i];
				}
			}
			acc.push(category);

			if (category.child && category.child.length) {
				let parentPathLabels = {};
				for (let i = 1; i <= 4; i++) {
					parentPathLabels['label' + i] = category['label' + i]
				}
				acc = acc.concat(getLibraryCategoriesPath(category.child, parentPathLabels));
			}
			return acc;
		}, []);
	};

	function findExternalItem(externalItem, field) {
		let externalItemFound = false;
		if ($scope.OFFICE_MODE == 'FO') {
			externalItemFound = $scope.actualExternalItems.find(actualExternalItem =>
				actualExternalItem['label' + $scope.language] &&
				externalItem[field] &&
				actualExternalItem['label' + $scope.language].toLowerCase().trim() === externalItem[field].toLowerCase().trim()
			)
		} else {
			$scope.actualExternalItems.some(actualExternalItem => {
				for (var i = 1; i <= 4; i++) {
					for (var j = 1; j <= 4; j++) {
						if (actualExternalItem['label' + i] &&
							externalItem[field.slice(0, -1) + j] &&
							actualExternalItem['label' + i].toLowerCase().trim() === externalItem[field.slice(0, -1) + j].toLowerCase().trim()) {
							externalItemFound = actualExternalItem;
							return true;
						}
					}
				}
			})
		}

		if (externalItemFound) {
			addExternalItemFound(externalItem[field], externalItemFound.id);
		}

		if (!externalItemFound && !extItemToCreate.includes(externalItem[field].toLowerCase().trim())) {
			extItemToCreate.push(externalItem[field].toLowerCase().trim());
			externalItem.alert = $scope.check ? false : true;
		}

		return externalItemFound;
	};

	function findExternalObjectsCategory(externalCategory, actualTreeViewsCategories) {
		let categoryFound = false;
		if ($scope.OFFICE_MODE == 'FO') {
			categoryFound = actualTreeViewsCategories.find(category =>
				category['label' + $scope.language] &&
				category['label' + $scope.language].toLowerCase().trim() == externalCategory[0].toLowerCase().trim()
			);
		} else {
			categoryFound = actualTreeViewsCategories.find(category => {
				for (let i = 1; i <= 4; i++) {
					if (category['label' + i] && category['label' + i].toLowerCase().trim() == externalCategory[0].toLowerCase().trim()) {
						return category['label' + i].toLowerCase().trim() == externalCategory[0].toLowerCase().trim();
					}
				}
			});
		}

		if (!categoryFound) return [false, parentIdsPaths];

		if (externalCategory.length == 1) {
			if (!parentIdsPaths.includes(categoryFound.id)) parentIdsPaths.push(categoryFound.id);
			return [true, parentIdsPaths];
		}

		if (externalCategory.length > 1 && categoryFound.child) {
			if (!parentIdsPaths.includes(categoryFound.id)) parentIdsPaths.push(categoryFound.id);
			externalCategory.shift();
			return findExternalObjectsCategory(externalCategory, categoryFound.child)
		} else {
			if (!parentIdsPaths.includes(categoryFound.id)) parentIdsPaths.push(categoryFound.id);
			return [false, parentIdsPaths]
		}
	};

	function inExternalItemsFound(label) {
		if (externalItemsFound[label.toString().toLowerCase().trim()]) {
			return externalItemsFound[label.toString().toLowerCase().trim()];
		}
		return false;
	}

	function addExternalItemFound(label, id) {
		externalItemsFound[label.toString().toLowerCase().trim()] = id;
	}

	function alertCreateNewExternalItems() {
		if (!$scope.check && extItemToCreate.length) {
			var confirm = $mdDialog.confirm()
				.multiple(true)
				.title(gettextCatalog.getPlural(extItemToCreate.length, 'New {{externalItem}}', 'New {{pluralExtItem}}', {
					externalItem: gettextCatalog.getString(externalItem),
					pluralExtItem: gettextCatalog.getString(pluralExtItem)
				}))
				.textContent(gettextCatalog.getPlural(
						extItemToCreate.length,
						'Do you want to create new {{externalItem}} ?',
						'Do you want to create {{count}} new {{pluralExtItem}} ?', {
							count: extItemToCreate.length,
							externalItem: gettextCatalog.getString(externalItem),
							pluralExtItem: gettextCatalog.getString(pluralExtItem)
						}) + '\n\r\n\r' +
					extItemToCreate.toString().replace(/,/g, '\n\r'))
				.theme('light')
				.ok(gettextCatalog.getString('Create & Import'))
				.cancel(gettextCatalog.getString('Cancel'));
			$mdDialog.show(confirm)
				.then(function() {
					$scope.uploadFile();
				}, function(reject) {
					$scope.handleRejectionDialog(reject);
				});
		}
	}

	function alertWrongSchema() {
		let alert = $mdDialog.alert()
			.multiple(true)
			.title(gettextCatalog.getString('File error'))
			.textContent(gettextCatalog.getString('Wrong schema'))
			.theme('light')
			.ok(gettextCatalog.getString('Cancel'))
		$mdDialog.show(alert);
		$scope.check = true;
	}

	function checkRequiredFields(row) {
		requiredFields.forEach(requiredField => {
			if (!row[requiredField]) {
				row.error += requiredField + " " + gettextCatalog.getString('is mandatory') + "\n";;
				$scope.check = true;
			}
		});
	}

	async function getAllAmvItems() {
		let [assets, threats, vulnerabilities] = await Promise.all([
			AssetService.getAssets().then(function(data) {
				return data.assets.map(asset => ({
					code: asset.code,
					uuid: asset.uuid
				}));
			}),
			ThreatService.getThreats().then(function(data) {
				return data.threats.map(threat => ({
					code: threat.code,
					uuid: threat.uuid
				}));
			}),
			VulnService.getVulns().then(function(data) {
				return data.vulnerabilities.map(vulnerability => ({
					code: vulnerability.code,
					uuid: vulnerability.uuid
				}));
			})
		]);
		return [assets, threats, vulnerabilities];
	}

	async function createTheme(row) {
		let promise = $q.defer();
		let themeToCreate = {
			['label' + $scope.language]: row[extItemField].toString().trim()
		}
		let themeLabel = row[extItemField];
		if ($scope.OFFICE_MODE == 'BO') {
			themeToCreate = {
				label1: row['theme label1'] ? row['theme label1'].trim() : null,
				label2: row['theme label2'] ? row['theme label2'].trim() : null,
				label3: row['theme label3'] ? row['theme label3'].trim() : null,
				label4: row['theme label4'] ? row['theme label4'].trim() : null,
			};
			themeLabel = row['theme label' + $scope.defaultLang];
		}

		ThreatService.createTheme(themeToCreate,
			await
			function(result) {
				addExternalItemFound(themeLabel, result.id);
				promise.resolve(result.id);
			});
		return promise.promise
	}

	async function createCategory(row) {
		let promise = $q.defer();
		let categoryToCreate = {
			referential: referential,
			['label' + $scope.language]: row[extItemField].toString().trim()
		}
		let categoryLabel = row[extItemField];
		if ($scope.OFFICE_MODE == 'BO') {
			categoryToCreate = {
				referential: referential,
				label1: row['category label1'] ? row['category label1'].trim() : null,
				label2: row['category label2'] ? row['category label2'].trim() : null,
				label3: row['category label3'] ? row['category label3'].trim() : null,
				label4: row['category label4'] ? row['category label4'].trim() : null,
			}
			categoryLabel = row['category label' + $scope.defaultLang];
		}

		SOACategoryService.createCategory(categoryToCreate, await
			function(result) {
				addExternalItemFound(categoryLabel, result.id);
				promise.resolve(result.id);
			});
		return promise.promise
	}

	async function createLibraryCategory(libraryCategory) {
		var promise = $q.defer();
		ObjlibService.createObjlibCat(libraryCategory, await
			function(result) {
				libraryCategory.id = result.categ.id;
				allLibraryCategories.push(libraryCategory);
				promise.resolve(result.categ.id);
			});
		return promise.promise
	}

	async function createTag(tagLabel) {
		var promise = $q.defer();
		let tagToCreate = {
			code: tagLabel.toString().trim() + "_" + Math.floor(Math.random() * 1000),
			['label' + $scope.language]: tagLabel.toString().trim()
		}
		TagService.createTag(tagToCreate, await
			function(result) {
				addExternalItemFound(tagLabel, result.id);
				promise.resolve(result.id);
			});
		return promise.promise
	}

	function getImportFileLayout() {

		let fo_layout = {
			'Asset types': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Network')
				},
				'description': {
					'field': 'description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any network hardware (router, switch, firewall, etc.)')
				},
				'type': {
					'field': 'type',
					'required': true,
					'type': '1,2',
					'example': '\n1: ' + gettextCatalog.getString('primary asset') + '\n2: ' + gettextCatalog.getString('secondary asset')
				}
			},
			'Threats': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Fire')
				},
				'description': {
					'field': 'description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any situation that could facilitate the conflagration of premises or equipment.')
				},
				'c': {
					'field': 'c',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'i': {
					'field': 'i',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'a': {
					'field': 'a',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'theme': {
					'field': 'theme',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				}
			},
			'Vulnerabilties': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'description': {
					'field': 'description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('IT charter Conditions of use General terms and conditions')
				}
			},
			'Controls': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Access control policy')
				},
				'category': {
					'field': 'category',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				}
			},
			'Information risks': {
				'asset_code': {
					'field': 'asset code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'asset_label': {
					'field': 'asset label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Network')
				},
				'asset_description': {
					'field': 'asset description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any network hardware (router, switch, firewall, etc.)')
				},
				'threat_code': {
					'field': 'threat code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'threat_label': {
					'field': 'threat label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Fire')
				},
				'threat_description': {
					'field': 'threat description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any situation that could facilitate the conflagration of premises or equipment.')
				},
				'threat_c': {
					'field': 'threat c',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'threat_i': {
					'field': 'threat i',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'threat_a': {
					'field': 'threat a',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'theme': {
					'field': 'threat theme',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				},
				'vulnerability_code': {
					'field': 'vulnerability code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'vulnerability_label': {
					'field': 'vulnerability label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'vulnerability_description': {
					'field': 'vulnerability description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('IT charter Conditions of use General terms and conditions')
				}
			},
			'Tags': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Governance')
				}
			},
			'Operational risks': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('The applicable legal and regulatory requirements are not determined, understood and consistently met')
				},
				'description': {
					'field': 'description',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Product Compliance Customer agreement')
				},
				'tag': {
					'field': 'tags',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Separed by /') + $scope.actualExternalItems
				}
			},
			'Matches': {
				'control': {
					'field': 'control',
					'required': true,
					'type': 'uuid',
					'example': ''
				},
				'match': {
					'field': 'match',
					'required': true,
					'type': 'uuid',
					'example': ''
				}
			},
			'Recommendations': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'description': {
					'field': 'description',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Periodically review access permissions.')
				},
				'importance': {
					'field': 'importance',
					'required': false,
					'type': 'integer',
					'example': '1, 2 ' + gettextCatalog.getString('or') + ' 3'
				}
			},
			'Assets library': {
				'name': {
					'field': 'name',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'asset_type': {
					'field': 'asset type code',
					'required': true,
					'type': 'text',
					'example': 'Asset type code must exist in the Knowledge Base'
				},
				'scope': {
					'field': 'scope',
					'required': true,
					'type': '1,2',
					'example': '\n1: ' + gettextCatalog.getString('local') + '\n2: ' + gettextCatalog.getString('global')
				},
				'rolfTag': {
					'field': 'operational risk tag',
					'required': false,
					'type': 'text',
					'example': 'Only one operational risk tag can be linked and must exist in the Knowledge Base'
				},
				'category': {
					'field': 'category',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				},
			},
		};

		let bo_layout = {
			'Asset types': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Network')
				},
				'description': {
					'field': 'description1\ndescription2\ndescription3\ndescription4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any network hardware (router, switch, firewall, etc.)')
				},
				'type': {
					'field': 'type',
					'required': true,
					'type': '1,2',
					'example': '\n1: ' + gettextCatalog.getString('primary asset') + '\n2: ' + gettextCatalog.getString('secondary asset')
				},
				'mode': {
					'field': 'mode',
					'required': true,
					'type': '0,1',
					'example': '\n0: ' + gettextCatalog.getString('generic') + '\n1: ' + gettextCatalog.getString('specific')
				}
			},
			'Threats': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Fire')
				},
				'description': {
					'field': 'description1\ndescription2\ndescription3\ndescription4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any situation that could facilitate the conflagration of premises or equipment.')
				},
				'c': {
					'field': 'c',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'i': {
					'field': 'i',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'a': {
					'field': 'a',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'mode': {
					'field': 'mode',
					'required': true,
					'type': '0,1',
					'example': '\n0: ' + gettextCatalog.getString('generic') + '\n1: ' + gettextCatalog.getString('specific')
				},
				'theme': {
					'field': 'theme label' + $scope.defaultLang,
					'fieldBis': 'theme label1\ntheme label2\ntheme label3\ntheme label4',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				}
			},
			'Vulnerabilties': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'description': {
					'field': 'description1\ndescription2\ndescription3\ndescription4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('IT charter Conditions of use General terms and conditions')
				},
				'mode': {
					'field': 'mode',
					'required': true,
					'type': '0,1',
					'example': '\n0: ' + gettextCatalog.getString('generic') + '\n1: ' + gettextCatalog.getString('specific')
				}
			},
			'Controls': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Access control policy')
				},
				'category': {
					'field': 'category label' + $scope.defaultLang,
					'fieldBis': 'category label1\ncategory label2\ncategory label3\ncategory label4',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				}
			},
			'Information risks': {
				'asset_code': {
					'field': 'asset code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'asset_label': {
					'field': 'asset label' + $scope.defaultLang,
					'fieldBis': 'asset label1\nasset label2\nasset label3\nasset label4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Network')
				},
				'asset_description': {
					'field': 'asset description1\nasset description2\nasset description3\nasset description4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any network hardware (router, switch, firewall, etc.)')
				},
				'threat_code': {
					'field': 'threat code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'threat_label': {
					'field': 'threat label' + $scope.defaultLang,
					'fieldBis': 'threat label1\nthreat label2\nthreat label3\nthreat label4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Fire')
				},
				'threat_description': {
					'field': 'threat description1\nthreat description2\nthreat description3\nthreat description4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Any situation that could facilitate the conflagration of premises or equipment.')
				},
				'threat_c': {
					'field': 'threat c',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'threat_i': {
					'field': 'threat i',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'threat_a': {
					'field': 'threat a',
					'required': false,
					'type': 'Boolean',
					'example': '0,1,false,true'
				},
				'theme': {
					'field': 'threat theme label' + $scope.defaultLang,
					'fieldBis': 'threat theme label1\nthreat theme label2\nthreat theme label3\nthreat theme label4',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				},
				'vulnerability_code': {
					'field': 'vulnerability code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'vulnerability_label': {
					'field': 'vulnerability label' + $scope.defaultLang,
					'fieldBis': 'vulnerability label1\nvulnerability label2\nvulnerability label3\nvulnerability label4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'vulnerability_description': {
					'field': 'vulnerability description1\nvulnerability description2\nvulnerability description3\nvulnerability description4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('IT charter Conditions of use General terms and conditions')
				}
			},
			'Tags': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('Governance')
				}
			},
			'Operational risks': {
				'code': {
					'field': 'code',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('The applicable legal and regulatory requirements are not determined, understood and consistently met')
				},
				'description': {
					'field': 'description1\ndescription2\ndescription3\ndescription4',
					'required': false,
					'type': 'text',
					'example': gettextCatalog.getString('Product Compliance Customer agreement')
				},
				'tag': {
					'field': 'tag label' + $scope.defaultLang,
					'fieldBis': 'tag label1\ntag label2\ntag label3\ntag label4',
					'required': false,
					'type': 'text',
					'example': $scope.actualExternalItems
				}
			},
			'Matches': {
				'control': {
					'field': 'control',
					'required': true,
					'type': 'uuid',
					'example': ''
				},
				'match': {
					'field': 'match',
					'required': true,
					'type': 'uuid',
					'example': ''
				}
			},
			'Assets library': {
				'name': {
					'field': 'name' + $scope.defaultLang,
					'fieldBis': 'name1\nname2\nname3\nname4',
					'required': true,
					'type': 'text',
					'example': 'C16, 123, CAZ, C-12'
				},
				'label': {
					'field': 'label' + $scope.defaultLang,
					'fieldBis': 'label1\nlabel2\nlabel3\nlabel4',
					'required': true,
					'type': 'text',
					'example': gettextCatalog.getString('No IT charter specifying the rules of use')
				},
				'asset_type': {
					'field': 'asset type code',
					'required': true,
					'type': 'text',
					'example': 'Asset type code must exist in the Knowledge Base'
				},
				'scope': {
					'field': 'scope',
					'required': true,
					'type': '1,2',
					'example': '\n1: ' + gettextCatalog.getString('local') + '\n2: ' + gettextCatalog.getString('global')
				},
				'mode': {
					'field': 'mode',
					'required': true,
					'type': '0,1',
					'example': '\n0: ' + gettextCatalog.getString('generic') + '\n1: ' + gettextCatalog.getString('specific')
				},
				'rolfTag': {
					'field': 'operational risk tag',
					'required': false,
					'type': 'text',
					'example': 'Only one operational risk tag can be linked and must exist in the Knowledge Base'
				},
				'category': {
					'field': 'category label' + $scope.defaultLang,
					'fieldBis': 'category label1\ncategory label2\ncategory label3\ncategory label4',
					'required': true,
					'type': 'text',
					'example': $scope.actualExternalItems
				},
			},
		};

		return $scope.OFFICE_MODE == 'FO' ? fo_layout : bo_layout;
	}
}
