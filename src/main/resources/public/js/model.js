function Layer(type){
	if(typeof type === 'string'){
		this.media = {
			type: type
		};
		if(type === 'text'){
			this.h = 200;
			this.w = 330;
		}
	}
	else if(typeof type === 'object'){
		this.updateData(type);
	}
}

Layer.prototype.upload = function(type, file){
	this.media.type = type;
	var formData = new FormData();
	formData.append('file', file);

	setTimeout(function(){
		http().postFile('/workspace/document?application=scrapbook&protected=true&name=' + file.name,  formData, {
			requestName: 'scrapbook-' + this.id
		})
			.done(function(e){
				this.updateData({
					media: {
						type: type,
						src: '/workspace/document/' + e._id
					}
				});
			}.bind(this))
	}.bind(this), 20);
};

Layer.prototype.uploadImage = function(image){
	this.upload('image', image);
};

Layer.prototype.uploadAudio = function(file){
	this.upload('audio', file);
};

function Page(data){
	this.makeModels([Layer])
	this.collection(Layer, {
		moveToTop: function(layer){
			layer.z = this.nextLayerIndex();
		},
		nextLayerIndex: function(){
			var layerIndex = 0;
			this.all.forEach(function(item){
				if(item.z > layerIndex){
					layerIndex = item.z + 1;
				}
			});
			return layerIndex;
		},
		addLayer: function(layer){
			layer.id = this.length();
			this.push(layer);
			this.moveToTop(layer);
		}
	});

	if(data && data.layers){
		this.layers.load(data.layers);
	}
}

Page.prototype.toJSON = function(){
	return {
		layers: _.map(this.layers.all, function(layer){
			return {
				x: layer.x,
				y: layer.y,
				w: layer.w,
				h: layer.h,
				media:{
					type: layer.media.type,
					src: layer.media.src
				}
			}
		})
	}
};

function Scrapbook(data){
	this.makeModels([Page]);
	this.collection(Page, {});

	if(data){
		if(!this.pageIndex){
			this.pageIndex = 0;
		}

		http().get('/workspace/document/' + data._id).done(function(content){
			this.updateData({
				icon: content.icon,
				subTitle: content.subTitle,
				title: content.title,
				loaded: true,
				modified: content.modified || this.modified,
				owner: content.owner || this.owner,
				ownerName: content.ownerName || this.ownerName,
				_id: content._id || this._id
			});

			if(content.pages){
				this.pages.load(content.pages);
			}
		}.bind(this))
	}
}

Scrapbook.prototype.getPage = function(pageIndex){
	if(this.pages.all[pageIndex]){
		return this.pages.all[pageIndex];
	}
};

Scrapbook.prototype.newPage = function(){
	var newPage = new Page();
	this.pages.push(newPage);
	return newPage;
};

Scrapbook.prototype.duplicatePage = function(index){
	var newPage = new Page();
	this.pages.all[index].layers.forEach(function(layer){
		newPage.layers.push(new Layer({
			x: layer.x,
			y: layer.y,
			w: layer.w,
			h: layer.h,
			media:{
				type: layer.media.type,
				src: layer.media.src
			}
		}))
	});
	this.pages.push(newPage);
	return newPage;
}

Scrapbook.prototype.removePage = function(pageIndex){
	this.pages.removeAt(pageIndex);
};

Scrapbook.prototype.save = function(){
	//Scrapbook will be saved as blob in workspace
	var content = {
		title: this.title,
		subTitle: this.subTitle,
		icon: this.icon,
		pages: this.pages.all,
		modified: this.modified,
		owner: this.owner,
		ownerName: this.ownerName,
		_id: this._id
	};
	var blob = new Blob([JSON.stringify(content)], { type: 'application/json', icon: content.icon });
	var form = new FormData();
	form.append('blob', blob, content.title + '.json');
	http().putFile('/workspace/document/' + this._id,  form);
	notify.info('scrapbook.saved');
};

Scrapbook.prototype.create = function(){
	//Scrapbook will be saved as blob in workspace
	var content = {
		title: this.title,
		subTitle: this.subTitle,
		icon: this.icon,
		pages: [{ layers:[] }]
	};
	var blob = new Blob([JSON.stringify(content)], { type: 'application/json', icon: content.icon });
	var form = new FormData();
	form.append('blob', blob, content.title + '.json');
	http().postFile('/workspace/document',  form).done(function(e){
		http().put('/workspace/documents/move/' + e._id + '/scrapbooks').done(function(){
			model.myScrapbooks.sync();
		}.bind(this));
	}.bind(this));
};

Scrapbook.prototype.setIcon = function(){
	var form = new FormData();
	form.append('file', this.image[0]);
	http().postFile('/workspace/document?application=scrapbook&protected=true&thumbnail=120x120&thumbnail=20x20', form, { requestName: 'loading-icon' }).done(function(icon){
		this.icon = '/workspace/document/' + icon._id;
		this.trigger('change');
	}.bind(this));
};

Scrapbook.prototype.removeIcon = function(){
	this.icon = undefined;
	this.trigger('change');
};

function Folder(api){
	this.makeModels([Scrapbook]);
	this.updateData(api);
	var folder = this;

	this.collection(Scrapbook, {
		behaviours: 'workspace',
		sync: function(){
			http().get(api.get).done(function(data){
				this.load(_.filter(data, function(doc){
					var ok = doc.metadata['content-type'] === 'application/json';
					if(api.name === 'sharedScrapbooks'){
						return ok && doc.folder !== 'Trash';
					}
					return ok;
				}));
				folder.trigger('change');
			}.bind(this))
		},
		remove: function(){
			this.selection().forEach(function(scrapbook){
				if(api.name === 'trash'){
					http().delete('/workspace/document/' + scrapbook._id);
				}
				else{
					http().put('/workspace/document/trash/' + scrapbook._id);
				}
			});
			this.removeSelection();
		}
	});
}


model.build = function(){
	this.makeModels([Folder]);
	model.me.workflow.load(['workspace', 'scrapbook']);

	this.myScrapbooks = new Folder({
		name: 'myScrapbooks',
		get: '/workspace/documents/scrapbooks?filter=owner'
	});
	this.sharedScrapbooks = new Folder({
		name: 'sharedScrapbooks',
		get: '/workspace/documents?filter=shared'
	});
	this.trash = new Folder({
		name: 'trash',
		get: '/workspace/documents/Trash?filter=owner'
	});

	this.trash.restore = function(){
		this.scrapbooks.selection().forEach(function(scrapbook){
			http().put('/workspace/restore/document/' + scrapbook._id);
		});
		this.scrapbooks.removeSelection();
		model.myScrapbooks.sync();
		model.sharedScrapbooks.sync();
	};

	this.sharedScrapbooks.copyInMyScrapbooks = function(){
		this.scrapbooks.request('post', '/workspace/documents/copy/:_id/scrapbooks', function(){
			model.myScrapbooks.sync();
		}.bind(this));
	};
};