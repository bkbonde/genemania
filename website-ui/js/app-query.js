app.factory('Query',
[ '$$organisms', '$$networks', '$$attributes', '$$version', '$$stats', 'util', '$$genes', 'Query_genes', 'Query_history', 'Query_networks', 'Query_attributes', 'Result', 'io',
function( $$organisms, $$networks, $$attributes, $$version, $$stats, util, $$genes, Query_genes, Query_history, Query_networks, Query_attributes, Result, io ){
  var copy = util.copy;
  var strcmp = util.strcmp;

  // list of query submodules to inject
  var qmods = [ Query_genes, Query_history, Query_networks, Query_attributes ];

  var organisms;
  var networkGroups;
  var attributeGroups;
  var version;
  var lastOrgId;
  var stats;

  window.addEventListener('popstate', function(e){
    var params = e.state;
    var updateUrl = false; // it's already updated by pop

    if( params != null ){
      query.succeed({
        version: version,
        params: params
      }, updateUrl);
    } else {
      query.clearResult();
    }
  });

  // when all resources are pulled in, the query is ready
  Promise.all([

    $$organisms().then(function( orgs ){
      organisms = orgs;
    }),

    $$networks().then(function( nets ){
      networkGroups = nets;
    }),

    $$attributes().then(function( attrs ){
      attributeGroups = attrs;
    }),

    $$version().then(function( v ){
      version = v;
    }),

    $$stats().then(function( s ){
      stats = s;
    }),

    io('organism').read().then(function( org ){
      lastOrgId = org.lastOrgId;
    })

  ]).then(function(){
    // current query (only one at a time)
    q.current = new q();
    qfn.ready = true;

    console.log('Query ready');
    PubSub.publish('query.ready', q.current);
  });

  PubSub.subscribe('ready', function(){
    qfn.appReady = true;
  });

  var Query = window.Query = function( opts ){
    if( !(this instanceof Query) ){
      return new Query( opts );
    }
    opts = opts || {};

    var self = this;

    self.networkSortFactors = config.networks.sorters;
    self.setNetworkOptions = config.networks.setters;
    self.organisms = copy( organisms );
    self.version = copy( version );
    self.stats = copy( stats );

    var params = opts.params;
    var otherQ = opts.copyParamsFrom;

    if( otherQ ){
      params = otherQ.params();
    }

    if( params ){ // set from other query

      self.organism = _.find( self.organisms, function( o ){
        return o.id === params.organismId;
      } );

      self.weighting = config.networks.weightings[ params.weighting ];

    } else { // set defaults
      self.organism = _.find( self.organisms, function( o ){ // default org is human or last used org
        return lastOrgId != null ? o.id === lastOrgId : o.id === 4;
      } ) || self.organisms[0]; // fallback on first org

      self.weighting = config.networks.defaultWeighting;
    }

    if( params ){
      self.maxGenes = +params.maxGenes;
      self.maxAttrs = +params.maxAttrs;
    } else {
      self.maxGenes = config.defaultMaxGenes;
      self.maxAttrs = config.defaultMaxAttrs;
    }

    self.setOrganism( self.organism, false ); // update org related deps

    self.sortNetworksBy('first author', false);

    if( params ){
      if( opts.version && self.version.dbVersion === opts.version.dbVersion ){
        self.toggleNetworksToMatchParams( params );
        self.toggleAttributesToMatchParams( params );
      } else {
        console.log('Unable to set nets and attrs from params, because param dbver `'+ ( opts.version ? opts.version.dbVersion : null) +'` does not match current `'+ self.version.dbVersion +'`');
      }

      self.setGenes( params.genesText );
    }

    if( !qfn.historyInitLoaded ){
      io('queries').read().then(function( qJson ){
        qfn.historyExpanded = qJson && qJson.history && qJson.history.length > 0 && query.result == null;
        qfn.historyInitLoaded = true;

        PubSub.publish('query.historyLoaded');
      });
    }

    if( !qfn.firstQuery ){
      qfn.firstQuery = true;

      self.checkLink();
    }

  };
  var q = Query;
  var qfn = q.prototype;

  qfn.areAdvancedOptionsCustomized = function(){
    return (
      this.maxAttrs !== config.defaultMaxAttrs
      || this.maxGenes !== config.defaultMaxGenes
      || this.weighting.value !== config.networks.defaultWeighting.value
      || this.networks.some(function(net){ return net.defaultSelected !== net.selected; })
    );
  };

  // ref some stuff into query
  qfn.weightings = config.networks.weightings; // flat list of weighting types
  qfn.weightingGroups = config.networks.weightingGroups; // categorised groups of weightings used in ui
  qfn.$$search = $$search;

  //
  // EXPANDING AND COLLAPSING THE QUERY INTERFACE

  qfn.expanded = true;

  qfn.collapse = function(){
    qfn.expanded = false;
  };

  qfn.expand = function(){
    qfn.expanded = true;
  };

  qfn.toggleExpand = function(){
    qfn.expanded = !qfn.expanded;

    var result = this.result;

    if( qfn.expanded && util.sidebarOverlapsSearch() && result && result.networksExpanded ){
      result.collapseNetworks();
    }
  };


  //
  // ORGANISM

  qfn.setOrganism = function( org, pub ){
    var self = this;

    this.organism = org;

    self.networkGroups = copy( networkGroups[ self.organism.id ] );
    self.organism.networkGroups = self.networkGroups;
    self.networkGroupsById = {};

    self.networks = [];
    self.networksById = {};
    for( var i = 0; i < self.networkGroups.length; i++ ){
      var group = self.networkGroups[i];
      var nets = group.interactionNetworks;
      var selCount = 0;
      group.expanded = false;

      self.networkGroupsById[ group.id ] = group;

      if( nets ){ for( var j = 0; j < nets.length; j++ ){
        var net = nets[j];

        self.networks.push( net );
        self.networksById[ net.id ] = net;

        net.group = group;
        net.selected = net.defaultSelected;
        net.expanded = false;

        if( net.selected ){
          selCount++;
        }

      } }

      group.selectedCount = selCount;

      self.updateNetworkGroupSelection( group );

    }

    self.attributeGroups = copy( attributeGroups[ self.organism.id ] );
    self.organism.attributeGroups = self.attributeGroups;
    self.attributeGroupsById = {};

    var selCount = 0;
    for( var i = 0; i < self.attributeGroups.length; i++ ){
      var group = self.attributeGroups[i];

      group.selected = group.defaultSelected;
      group.expanded = false;

      if( group.selected ){
        selCount++;
      }

      self.attributeGroupsById[ group.id ] = group;
    }

    self.selectedAttributeGroupCount = selCount;
    self.attributeGroupsExpanded = false;
    self.updateAttributeGroupsSelection();

    var ioo = io('organism');

    ioo.read().then(function( orgJson ){
      lastOrgId = orgJson.lastOrgId = org.id;

      return ioo.write();
    });

    if( pub === undefined || pub ){
      PubSub.publish('query.setOrganism', self);
    }

    this.validateGenes(); // new org => new genes validation
  };


  //
  // WEIGHTING

  qfn.setWeighting = function( w ){
    this.weighting = w;
  };

  qfn.toggleEditAdvanced = function(){
    this.editingAdvanced = this.editingAdvanced ? false : true;
  };


  //
  // MAX RETURN PARAMS

  // results genes size
  qfn.setMaxGenes = function( max ){
    this.maxGenes = max;
  };

  // results attrs size
  qfn.setMaxAttrs = function( max ){
    this.maxAttrs = max;
  };


  //
  // LINKS
  qfn.checkLink = function(){
    var self = this;
    var pathname = decodeURIComponent( window.location.pathname );
    var hash = decodeURIComponent( window.location.hash );
    var search = decodeURIComponent( window.location.search );

    try {

      if( pathname.match(/link$/) || search !== "" ){
        var vars = {};

        search.substring(1).split('&').forEach(function( nameVal ){
          nameVal = nameVal.split('=');

          vars[ nameVal[0] ] = nameVal[1];
        });

        if( vars.o ){
          var org = self.organisms.filter(function( org ){
            return org.taxonomyId == vars.o;
          })[0];

          if( org ){
            self.setOrganism( org );
          }
        }

        if( vars.g ){
          var genes = vars.g.replace(/\||\/|_/g, '\n');

          self.setGenes( genes );
        }

        if( vars.m ){
          var weighting = self.weightings.filter(function( w ){
            return w.value.toLowerCase() === vars.m;
          })[0];

          if( weighting ){
            self.setWeighting( weighting );
          }
        }

        if( vars.r ){
          self.setMaxGenes( parseInt( vars.r ) );
        }

        PubSub.publish('query.fromLink', self);

        self.search();
      } else if( pathname.match(/\/search\//) || hash.match(/\/search\//) ){
        var rgx = /\/search\/(.+?)\/(.+)/;
        var match = pathname.match(rgx) || hash.match(rgx);

        var orgSpec = match[1];
        var genesSpec = match[2];

        var sanitize = function( str ){ return ('' + str).toLowerCase().replace(/\s/g, '-').replace(/\'/g, ''); };

        var org = self.organisms.filter(function( org ){
          var matches = function( str ){
            var m = sanitize( str );

            return m == orgSpec;
          };

          return matches( org.name ) || matches( org.alias ) || matches( org.description ) || matches( org.taxonomyId );
        })[0];

        if( org ){
          self.setOrganism( org );
        }

        var genes = genesSpec.replace(/\||\/|_/g, '\n');

        if( genes ){
          self.setGenes( genes );
        }

        PubSub.publish('query.fromLink', self);

        self.search();
      }

    } catch( err ){
      // just allow user to revise query
      console.error('The permalink could not be parsed');
      console.error( err );
    }
  };

  qfn.updateLink = function(){
    var customized = this.areAdvancedOptionsCustomized();

    var debugDisableUrlMode = typeof DEBUG_DISABLE_URL_MOD != typeof undefined ? DEBUG_DISABLE_URL_MOD : false;
    var queryHistorySupported = !debugDisableUrlMode && window.history != null && window.history.pushState != null;

    var params = this.params();

    var genes = this.geneNames();

    var geneTitleLimit = 3;

    var title =  [
      genes.slice(0, geneTitleLimit).join(' ') + (genes.length > geneTitleLimit ? '...' : ''),
      this.organism.name,
      'GeneMANIA',
    ].join(' : ');

    var root = tomcatContextPath();
    var org = this.organism.alias.replace(' ', '-').toLowerCase();
    var pre = root + (root ? '' : '/') ;
    var url = pre + 'search/' + org + '/' + genes.join('/');

    if( customized ){
      url = pre;
      title += ' advanced search';
    }

    if( queryHistorySupported ){
      // angular breaks the proper way to do this
      // change to angular to make things work properly marked by NGBROKEN comment
      history.pushState(params, title, url);
    }

    window.document.title = title;
  };

  // inject the individual query submodules
  for( var i = 0; i < qmods.length; i++ ){
    qmods[i]( q );
  }

  return q;

} ]);


app.controller('QueryCtrl',
[ '$scope', 'updateScope', 'Query',
function( $scope, updateScope, Query ){

  // initialise once whole app is ready
  function init(){
    window.query = $scope.query = Query.current;

    // $scope.$apply();
    updateScope();

    responsive.restyle();
  }

  PubSub.subscribe('ready', init);
  PubSub.subscribe('query.searchResult', init);
  PubSub.subscribe('query.succeed', init);

  PubSub.subscribe('query.validateGenes', updateScope);
  PubSub.subscribe('query.validateGenesStart', updateScope);
  PubSub.subscribe('query.validateGenesUiStart', updateScope);
  PubSub.subscribe('query.validateGenesEnd', updateScope);
  PubSub.subscribe('query.describeGeneLine', updateScope);


  PubSub.subscribe('query.setGenesText', _.debounce(function(){
    updateScope();
  }, 50, {
    leading: true
  }));

  PubSub.subscribe('query.setGenesTextFromCode', _.debounce(function(){
    updateScope();
    $scope.query.updateGenesArea();
  }, 50, {
    leading: true
  }));

  PubSub.subscribe('query.expandGenes', _.debounce(function(){
    $scope.query.updateGenesArea();
  }, 50, {
    trailing: true
  }));

  // PubSub.subscribe('query.toggleNetworkGroupExpansion', updateScope);
  // PubSub.subscribe('query.toggleNetworkExpansion', updateScope);
  // PubSub.subscribe('query.toggleNetworkGroupSelection', updateScope);
  // PubSub.subscribe('query.toggleNetworkSelection', updateScope);
  PubSub.subscribe('query.toggleNetworkCheckOptions', updateScope);
  PubSub.subscribe('query.toggleNetworkSortOptions', updateScope);
  PubSub.subscribe('query.sortNetworksBy', updateScope);
  PubSub.subscribe('query.setNetworks', updateScope);
  PubSub.subscribe('query.removeNetwork', updateScope);
  PubSub.subscribe('query.removingNetwork', updateScope);
  PubSub.subscribe('query.addingNetwork', updateScope);
  PubSub.subscribe('query.addNetwork', updateScope);
  PubSub.subscribe('query.clearResult', updateScope);

  PubSub.subscribe('ready', updateScope);

  PubSub.subscribe('result.search', updateScope);
  PubSub.subscribe('result.searched', updateScope);
  PubSub.subscribe('result.cancel', updateScope);
  PubSub.subscribe('$$search.progress', updateScope);

  $scope.respRestyle = function(){ // allow access to resp restyle inside template
    responsive.restyle();
  };

} ]);
