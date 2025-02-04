/**
 * This file is part of GeneMANIA.
 * Copyright (C) 2017 University of Toronto.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
 */
package org.genemania.plugin.cytoscape3.task;

import org.cytoscape.work.AbstractTaskFactory;
import org.cytoscape.work.TaskIterator;
import org.genemania.plugin.GeneMania;
import org.genemania.plugin.controllers.RetrieveRelatedGenesController;
import org.genemania.plugin.cytoscape.CytoscapeUtils;
import org.genemania.plugin.cytoscape3.model.OrganismManager;

public class SearchCommandTaskFactory extends AbstractTaskFactory {

	private final GeneMania plugin;
	private final RetrieveRelatedGenesController controller;
	private final OrganismManager organismManager;
	private final CytoscapeUtils cytoscapeUtils;

	public SearchCommandTaskFactory(
			GeneMania plugin,
			RetrieveRelatedGenesController controller,
			OrganismManager organismManager,
			CytoscapeUtils cytoscapeUtils
	) {
		this.plugin = plugin;
		this.controller = controller;
		this.organismManager = organismManager;
		this.cytoscapeUtils = cytoscapeUtils;
	}
	
	@Override
	public TaskIterator createTaskIterator() {
		return new TaskIterator(new SearchCommandTask(plugin, controller, organismManager, cytoscapeUtils));
	}
}
