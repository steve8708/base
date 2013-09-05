(function (Ractive) {

  Ractive.adaptors.backboneAssociatedModel = function ( model, path ) {
    var settingModel, settingView, setModel, setView, pathMatcher, pathLength, prefix, modelChangeEventHandler;

    if ( path ) {
      path += '.';
      pathMatcher = new RegExp( '^' + path.replace( /\./g, '\\.' ) );
      pathLength = path.length;
    }

    modelChangeEventHandler = function ( eventName ) {
      var eventNameSplit, eventType, keypath, value;

      eventNameSplit = eventName.split( ':' );
      eventType = eventNameSplit[0];
      keypath = eventNameSplit[1];

      if ( eventType === 'change' && keypath  ) {
        value = model.get( keypath );

        if ( value && value.toJSON ) {
          value = value.toJSON();
        }

        setView( keypath, value );
      }
    };


    return {
      init: function ( view ) {

        // if no path specified...
        if ( !path ) {
          setView = function ( keypath, value ) {
            if ( !settingModel ) {
              settingView = true;
              view.set( keypath, value );
              settingView = false;
            }
          };

          setModel = function ( keypath, value ) {
            if ( !settingView ) {
              settingModel = true;
              model.set( keypath, value );
              settingModel = false;
            }
          };
        }

        else {
          prefix = function ( attrs ) {
            var attr, result;

            result = {};

            for ( attr in attrs ) {
              if ( {}.hasOwnProperty.call( attrs, attr ) ) {
                result[ path + attr ] = attrs[ attr ];
              }
            }

            return result;
          };

          setView = function ( keypath, value ) {
            if ( !settingModel ) {
              settingView = true;
              var changed = {};
              changed[keypath] = value;
              view.set( prefix( model.changed ) );
              settingView = false;
            }
          };

          setModel = function ( keypath, value ) {
            if ( !settingView ) {
              if ( pathMatcher.test( keypath ) ) {
                settingModel = true;
                model.set( keypath.substring( pathLength ), value );
                settingModel = false;
              }
            }
          };
        }

        model.on( 'all', modelChangeEventHandler );
        view.on( 'set', setModel );

        // initialise
        view.set( path ? prefix( model.toJSON() ) : model.toJSON() );
      },

      teardown: function ( view ) {
        model.off( 'all', modelChangeEventHandler );
        view.off( 'set', setModel );
      }
    };
  };
})(window.Ractive || require && require('ractive'));