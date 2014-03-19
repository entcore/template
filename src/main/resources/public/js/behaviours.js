var scrapbookBehaviours = {
	workflow: {
		view: 'fr.wseduc.scrapbook.controllers.ScrapBookController|view',
		print: 'fr.wseduc.scrapbook.controllers.ScrapBookController|print',
		create: 'fr.wseduc.scrapbook.controllers.ScrapBookController|create'
	}
}

Behaviours.register('scrapbook', {
	workflow: function(){
		var workflow = { };
		var documentsWorkflow = scrapbookBehaviours.workflow;
		for(var prop in documentsWorkflow){
			if(model.me.hasWorkflow(documentsWorkflow[prop])){
				workflow[prop] = true;
				if(prop === 'create'){
					workflow[prop] = workflow[prop] && model.me.hasWorkflow('org.entcore.workspace.service.WorkspaceService|addDocument');
				}
			}
		}

		return workflow;
	}
});