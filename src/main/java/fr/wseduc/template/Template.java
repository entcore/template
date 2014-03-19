package fr.wseduc.template;

import fr.wseduc.template.controllers.ActionFilter;
import fr.wseduc.template.controllers.TemplateController;
import fr.wseduc.webutils.Server;
import fr.wseduc.webutils.request.filter.SecurityHandler;

public class Template extends Server {

	@Override
	public void start() {
		super.start();

		TemplateController controller = new TemplateController(vertx, container, rm, securedActions);
		controller.get("", "view");

		SecurityHandler.addFilter(
				new ActionFilter(controller.securedUriBinding(), container.config(), vertx)
		);
	}

}
