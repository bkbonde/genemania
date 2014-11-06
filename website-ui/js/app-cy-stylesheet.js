app.factory('cyStylesheet', 
[ 
function(){

  return window.cyStylesheet = function( cy ){

    var getScore = function(n){ return n.data('score'); };
    var nqNodes = cy.$('node[!query]');
    var minScore = 0; //nqNodes.min(getScore).value;
    var maxScore = nqNodes.max(getScore).value;

    return [
      {
        selector: 'core',
        css: {
          'selection-box-color': '#AAD8FF',
          'selection-box-border-color': '#8BB0D0',
          'selection-box-opacity': 0.5
        }
      },

      {
        selector: 'node',
        css: {
          'width': 'mapData(score, '+ minScore +', '+ maxScore +', 20, 60)',
          'height': 'mapData(score, '+ minScore +', '+ maxScore +', 20, 60)',
          'content': 'data(name)',
          'font-size': 8,
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': '#888',
          'text-outline-color': '#888',
          'text-outline-width': 2,
          'color': '#fff',
          'overlay-padding': 6,
          'z-index': 10
        }
      },

      {
        selector: 'node[?attr]',
        css: {
          'shape': 'rectangle',
          'background-color': '#aaa',
          'text-outline-color': '#aaa',
          'width': 16,
          'height': 16,
          'font-size': 6,
          'z-index': 1
        }
      },

      {
        selector: 'node[?query]',
        css: {
          'background-clip': 'none',
          'background-fit': 'contain',
          'background-image': './img/spiral-white-10pct.svg', // TODO embed & compress whitespace
          //'background-image': 'data:image/png;base64,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'
        }
      },

      {
        selector: 'node:selected',
        css: {
          'border-width': 6,
          'border-color': '#AAD8FF',
          'border-opacity': 0.5,
          'background-color': '#77828C',
          'text-outline-color': '#77828C'
        }
      },

      {
        selector: 'edge',
        css: {
          'curve-style': 'haystack',
          'opacity': 0.333,
          'line-color': '#bbb',
          'width': 'mapData(weight, 0, 1, 1, 8)',
          'overlay-padding': 3
        }
      },

      {
        selector: 'edge[group="coexp"]',
        css: {
          'line-color': '#d0b7d5'
        }
      },

      {
        selector: 'edge[group="coloc"]',
        css: {
          'line-color': '#a0b3dc'
        }
      },

      {
        selector: 'edge[group="gi"]',
        css: {
          'line-color': '#90e190'
        }
      },

      {
        selector: 'edge[group="path"]',
        css: {
          'line-color': '#9bd8de'
        }
      },

      {
        selector: 'edge[group="pi"]',
        css: {
          'line-color': '#eaa2a2'
        }
      },

      {
        selector: 'edge[group="predict"]',
        css: {
          'line-color': '#f6c384'
        }
      },

      {
        selector: 'edge[group="spd"]',
        css: {
          'line-color': '#dad4a2'
        }
      },

      {
        selector: 'edge[group="spd_attr"]',
        css: {
          'line-color': '#D0D0D0'
        }
      },

      {
        selector: 'edge[group="reg"]',
        css: {
          'line-color': '#D0D0D0'
        }
      },

      {
        selector: 'edge[group="reg_attr"]',
        css: {
          'line-color': '#D0D0D0'
        }
      },

      {
        selector: 'edge[group="user"]',
        css: {
          'line-color': '#f0ec86'
        }
      }
    ];

  };

}]);
