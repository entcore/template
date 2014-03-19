routes.define(function($routeProvider){
	$routeProvider
		.when('/print-scrapbook/:scrapbookId', {
			action: 'printScrapbook'
		})
		.when('/view-scrapbook/:scrapbookId', {
			action: 'viewScrapbook'
		})
		.otherwise({
			action: 'includedView'
		})
});

function MainController($scope, $rootScope, model, date, route){
	$scope.viewsContainers = {};
	route({
		viewScrapbook: function(params){
			model.sharedScrapbooks.sync();
			model.sharedScrapbooks.on('change', function(){
				var scrapbook = model.sharedScrapbooks.scrapbooks.findWhere({ _id: params.scrapbookId });
				if(!scrapbook){
					model.myScrapbooks.sync();
					$rootScope.currentFolder = model.myScrapbooks;
					model.myScrapbooks.on('change', function(){
						scrapbook = model.myScrapbooks.scrapbooks.findWhere({ _id: params.scrapbookId });
						scrapbook.on('change', function(){
							model.myScrapbooks.scrapbooks.current = scrapbook;
							$scope.openView('scrapbook', 'main');
							$scope.$apply('scrapbook');
						});
					});
				}
				else{
					scrapbook.on('change', function(){
						$rootScope.currentFolder = model.sharedScrapbooks;
						model.sharedScrapbooks.scrapbooks.current = scrapbook;
						$scope.openView('scrapbook', 'main');
						$scope.$apply('scrapbook');
					});
				}
			});
		},
		includedView: function(){
			$scope.openView('library', 'main');
		}
	});

	$scope.openView = function(name, view){
		if(name === 'lightbox' && view === ''){
			ui.hideLightbox();
			$scope.viewsContainers.lightbox = 'empty';
			return;
		}
		else if(name === 'lightbox'){
			ui.showLightbox();
		}
		var viewsPath = '/scrapbook/public/template/';
		$scope.viewsContainers[name] = viewsPath + view + '.html';
	};

	$scope.containsView = function(name, view){
		var viewsPath = '/scrapbook/public/template/';
		return $scope.viewsContainers[name] === viewsPath + view + '.html';
	};

	$scope.viewList = function(){
		$scope.openView('library', 'main');
	};

	$scope.longDate = function(dateStr){
		return moment(dateStr.split(' ')[0]).format('DD MMMM YYYY');
	};
}

function FolderController($scope, $rootScope, model, notify){
	if(model.me.workflow.scrapbook.create){
		$scope.scrapbooks = model.myScrapbooks.scrapbooks;
		$rootScope.currentFolder = model.myScrapbooks;
		if(!model.myScrapbooks.scrapbooks.length()){
			model.myScrapbooks.sync();
		}
	}
	else{
		if(model.me.workflow.workspace.documents.list){
			$scope.scrapbooks = model.sharedScrapbooks.scrapbooks;
			$rootScope.currentFolder = model.sharedScrapbooks;

			if(!model.sharedScrapbooks.scrapbooks.length()){
				model.sharedScrapbooks.sync();
			}
		}
	}

	$rootScope.$on('share-updated', function(){
		model.myScrapbooks.sync();
	});

	$scope.scrapbook = {};

	$scope.$parent.openView('table-list', 'list');

	$scope.select = { all: false };
	$scope.switchAll = function(){
		if($scope.select.all){
			$rootScope.currentFolder.scrapbooks.selectAll();
		}
		else{
			$rootScope.currentFolder.scrapbooks.deselectAll();
		}
	};

	model.on('myScrapbooks.scrapbooks.change, trash.scrapbooks.change, sharedScrapbooks.scrapbooks.change', function(){
		$scope.$apply('scrapbooks');
	});

	$scope.newScrapbook = function(){
		$scope.$parent.openView('scrapbook-infos', 'list');
		$scope.scrapbook = new Scrapbook();
		$scope.scrapbook.on('change', function(){
			$scope.$apply('scrapbook');
		})
	};

	$scope.editInfos = function(){
		$scope.$parent.openView('scrapbook-infos', 'list');
		$scope.scrapbook = $rootScope.currentFolder.scrapbooks.selection()[0];
		$scope.scrapbook.on('change', function(){
			$scope.$apply('scrapbook');
		});
	};

	$scope.saveInfos = function(){
		if(!$scope.scrapbook.title){
			notify.error('scrapbook.title.missing');
			return;
		}
		if($scope.scrapbook._id){
			$scope.scrapbook.save();
		}
		else{
			$scope.scrapbook.create();
		}

		$scope.$parent.openView('table-list', 'list');
	};

	$scope.closeInfos = function(){
		$scope.openView('table-list', 'list')
	};

	$scope.setIcon = function(){
		$scope.scrapbook.setIcon();
	};

	$scope.removeIcon = function(){
		$scope.scrapbook.removeIcon();
	};

	$scope.openMyScrapbooks = function(){
		$rootScope.currentFolder = model.myScrapbooks;
		$scope.scrapbooks = model.myScrapbooks.scrapbooks;
		$scope.$parent.openView('table-list', 'list');
	};

	$scope.openTrash = function(){
		$rootScope.currentFolder = model.trash;
		model.trash.sync();
		$scope.scrapbooks = model.trash.scrapbooks;
		$scope.$parent.openView('table-list', 'list');
	};

	$scope.openSharedScrapbooks = function(){
		$rootScope.currentFolder = model.sharedScrapbooks;
		model.sharedScrapbooks.sync();
		$scope.scrapbooks = model.sharedScrapbooks.scrapbooks;
		$scope.$parent.openView('table-list', 'list');
	};

	$scope.removeSelection = function(){
		$rootScope.currentFolder.scrapbooks.remove();
	};

	$scope.copyInMyScrapbooks = function(){
		model.sharedScrapbooks.copyInMyScrapbooks();
	};

	$scope.share = function(){
		$rootScope.shared = $scope.currentFolder.scrapbooks.selection();
		$scope.openView('share', 'lightbox');
	};

	$scope.openScrapbook = function(scrapbook){
		$rootScope.currentFolder.scrapbooks.current = scrapbook;
		$scope.openView('scrapbook', 'main');
	};

	$scope.restore = function(){
		model.trash.restore();
	};
}

function ScrapbookController($scope, $rootScope, route, model){
	route({
		printScrapbook: function(params){
			$scope.scrapbook = new Scrapbook({ _id: params.scrapbookId });
			$scope.scrapbook.on('pages.change', function(){
				$scope.$apply('pages');
				setTimeout(function(){
					if(window.noPrint){
						return;
					}
					window.noPrint = true;
					window.print();
				}, 300);
			});

		},
		includedView: function(){

		}
	});

	if($rootScope.currentFolder){
		$scope.scrapbook = $rootScope.currentFolder.scrapbooks.current;
		var page = $scope.scrapbook.getPage($scope.scrapbook.pageIndex);
		$scope.layers = page.layers;

		$scope.scrapbook.on('change', function(){
			$scope.$apply('layers');
		});

		$scope.$parent.openView('viewer', 'scrapbook');
	}

	$scope.saveScrapbook = function(){
		$scope.scrapbook.save();
	};

	$scope.createOrGetNextPage = function(){
		$scope.scrapbook.pageIndex++;
		var page = $scope.scrapbook.getPage($scope.scrapbook.pageIndex) || $scope.scrapbook.newPage();
		$scope.layers = page.layers;
	};

	$scope.newPage = function(){
		$scope.scrapbook.newPage();
		$scope.goToIndex($scope.scrapbook.pages.length() - 1);
	};

	$scope.duplicatePage = function(){
		$scope.scrapbook.duplicatePage($scope.scrapbook.pageIndex);
		$scope.goToIndex($scope.scrapbook.pages.length() - 1);
	};

	$scope.removePage = function(){
		$scope.openView('confirm-remove', 'lightbox');
		$rootScope.confirm = function(){
			$scope.scrapbook.removePage($scope.scrapbook.pageIndex);
			$scope.previousPage();
			$scope.openView('', 'lightbox');
		}
	};

	$scope.previousPage = function(){
		if($scope.scrapbook.pageIndex > 0){
			$scope.scrapbook.pageIndex--;
			$scope.layers = $scope.scrapbook.getPage($scope.scrapbook.pageIndex).layers;
		}
	};

	$scope.nextPage = function(){
		if($scope.scrapbook.pages.length() - 1 > $scope.scrapbook.pageIndex){
			$scope.scrapbook.pageIndex++;
			$scope.layers = $scope.scrapbook.getPage($scope.scrapbook.pageIndex).layers;
		}
	};

	$scope.goToIndex = function(index){
		if(index !== undefined){
			$scope.scrapbook.pageIndex = index;
		}
		if($scope.scrapbook.pageIndex < 0){
			$scope.scrapbook.pageIndex = 0;
		}
		if($scope.scrapbook.pageIndex >= $scope.scrapbook.pages.length()){
			$scope.scrapbook.pageIndex = $scope.scrapbook.pages.length() - 1;
		}
		$scope.scrapbook.pageIndex = parseInt($scope.scrapbook.pageIndex) || 0;
		$scope.layers = $scope.scrapbook.getPage($scope.scrapbook.pageIndex).layers;
	};

	if($rootScope.pageIndex !== undefined){
		$scope.scrapbook.pageIndex = $scope.$parent.pageIndex;
		$scope.goToIndex();
	}

	$scope.moveToTop = function(layer){
		$scope.layers.moveToTop(layer);
	};

	$scope.removeLayer = function(layer){
		$scope.layers.remove(layer);
	};

	$scope.addTextLayer = function(){
		var layer = new Layer('text');
		$scope.layers.addLayer(layer);
	};

	$scope.media = {};
	$scope.addImageLayer = function(){
		var image = $scope.media.images[0];
		var layer = new Layer('image');
		$scope.layers.addLayer(layer);
		layer.uploadImage(image);

		layer.on('change', function(){
			if(!$scope.$$phase){
				$scope.$apply('layers');
			}
		});
	};

	$scope.openVideoDialog = function(){
		$scope.openView('video-layer', 'lightbox');
		$rootScope.confirm = function(videoSource){
			$scope.openView('', 'lightbox');
			var layer = new Layer('video');
			layer.media.src = videoSource;
			$scope.layers.addLayer(layer);
		}
	};

	$scope.addAudioLayer = function(){
		var music = $scope.media.musics[0];
		var layer = new Layer('audio');
		$scope.layers.addLayer(layer);
		layer.uploadAudio(music);

		layer.on('change', function(){
			if(!$scope.$$phase){
				$scope.$apply('layers');
			}
		});
	};

	$scope.editScrapbook = function(){
		if($scope.scrapbook.pageIndex === 0){
			$scope.createOrGetNextPage();
		}
		$rootScope.pageIndex = $scope.scrapbook.pageIndex;
		$scope.$parent.openView('editor', 'scrapbook');
	};

	$scope.viewScrapbook = function(){
		$rootScope.pageIndex = $scope.scrapbook.pageIndex;
		$scope.saveScrapbook();
		$scope.$parent.openView('viewer', 'scrapbook');
	};

	$scope.editInfos = function(){
		$scope.openView('scrapbook-infos', 'scrapbook');
	};

	$scope.saveInfos = function(){
		if(!$scope.scrapbook.title){
			notify.error('scrapbook.title.missing');
			return;
		}
		$scope.saveScrapbook();
		$scope.openView('viewer', 'scrapbook');
	};

	$scope.setIcon = function(){
		$scope.scrapbook.setIcon();
	};

	$scope.removeIcon = function(){
		$scope.scrapbook.removeIcon();
	};

	$scope.closeInfos = function(){
		$scope.openView('viewer', 'scrapbook');
	};
}