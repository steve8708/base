/* base.js v0.0.7 */ 

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
/*
  TODO: AMD support (require, define)
*/


(function() {
  var Base, BasicView, DOMEventList, addState, appSurrogate, arr, callbackStringSplitter, capitalize, className, currentApp, method, originalBase, uncapitalize, _fn, _fn1, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3, _ref4,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  originalBase = window.Base;

  currentApp = null;

  appSurrogate = {};

  arr = [];

  callbackStringSplitter = /\s*[,:()]+\s*/;

  DOMEventList = 'blur, focus, focusin, focusout, load, resize, scroll,\
  unload, click, dblclick, mousedown, mouseup, mousemove, mouseover,\
  mouseout, mouseenter, mouseleave, change, select, submit, keydown,\
  keypress, keyup, error, touchstart, touchend, touchmove'.split(/\s*,\s*/);

  Base = (function() {
    function Base() {
      Base.__super__.constructor.apply(this, arguments);
    }

    return Base;

  })();

  _.extend(Base.prototype, Backbone.Events);

  Base.noConflict = function() {
    window.Base = originalBase;
    return Base;
  };

  Base.config = {
    debug: {
      logModelChanges: false
    }
  };

  Base.View = (function(_super) {
    __extends(View, _super);

    function View(options, attributes) {
      var config, key, type, value, _base, _i, _len, _ref, _ref1,
        _this = this;
      this.options = options != null ? options : {};
      if (this.name == null) {
        this.name = this.constructor.name;
      }
      if (this.attributes == null) {
        this.attributes = {};
      }
      if ((_base = this.attributes)['data-pict-view'] == null) {
        _base['data-pict-view'] = this.name.replace(/view/i, '').toLowerCase();
      }
      if (this.children == null) {
        this.children = new Base.List(this.options.children || []);
      }
      this.stateOptions = _.defaults(this.stateOptions || {}, {
        relations: this.relations,
        compute: this.compute
      });
      if (this.relations == null) {
        this.relations = {};
      }
      this.relations.$state = Base.State;
      addState(this);
      this._bindEvents();
      View.__super__.constructor.apply(this, arguments);
      _ref = ['view', 'all'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        type = _ref[_i];
        _ref1 = Base.plugins[type];
        for (key in _ref1) {
          value = _ref1[key];
          config = this.plugins && this.plugins[key] || Base.defaults.view.plugins[key] || Base.defaults.all.plugins[key];
          if (config) {
            value.call(this, this, config);
          }
        }
      }
      this._bindEventMethods();
      this.state.on('all', function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return _this.trigger.apply(_this, args);
      });
      this.trigger('init');
      this.$el.data('view', this);
      this._bindEventBubbling();
      this._bindSpecialCallbacks();
      this._bindSpecialEventMethods();
    }

    View.prototype.moduleType = 'view';

    View.prototype._bindEventMethods = function() {
      var cb, event, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = DOMEventList.length; _i < _len; _i++) {
        event = DOMEventList[_i];
        cb = this["on" + (capitalize(event))];
        if (cb) {
          _results.push(this.$el.on("" + event + ".delegateEvents", cb.bind(this)));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    View.prototype._getCallback = function(str, allowString) {
      var args, split, value;
      if (_.isFunction(str)) {
        return str;
      }
      split = _.compact(str.split(callbackStringSplitter));
      if (!split[1] && allowStrings) {
        return str;
      }
      args = (function() {
        var _i, _len, _ref, _results;
        _ref = split.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          _results.push($.zepto.deserializeValue(value));
        }
        return _results;
      })();
      return this[split[0]].bind(this, args);
    };

    View.prototype._bindEvents = function() {
      var key, value, _ref, _ref1, _results;
      if (this.events) {
        _ref = this.events;
        for (key in _ref) {
          value = _ref[key];
          if (value && value.split && callbackStringSplitter.test(value)) {
            this.events[key] = this._getCallback(value);
          }
        }
      }
      if (this.bind) {
        _ref1 = this.bind;
        _results = [];
        for (key in _ref1) {
          value = _ref1[key];
          if (value) {
            _results.push(this.on(key, this._getCallback(value)));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    View.prototype.render = function() {
      this.trigger('before:render');
      if (this.beforeRender) {
        this.beforeRender();
      }
      if (this.ractive) {
        this._initRactive();
      }
      this.trigger('render');
      this._bindComponents();
      if (this.afterRender) {
        this.afterRender();
      }
      return this.trigger('after:render');
    };

    View.prototype._bindSpecialEventMethods = function() {
      var _this = this;
      return this.on('all', function() {
        var args, camelized, event, method;
        event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        camelized = event.replace(/:([a-z])/ig, function(match, a) {
          return a.toUpperCase();
        });
        if (!camelized) {
          return;
        }
        method = _this['on' + camelized[0].toUpperCase() + camelized.substring(1)];
        if (method) {
          return method.apply(_this, args);
        }
      });
    };

    View.prototype._bindSpecialCallbacks = function() {
      var key, split, value, _ref, _results,
        _this = this;
      _ref = this.events;
      _results = [];
      for (key in _ref) {
        value = _ref[key];
        if (typeof value === 'string') {
          split = value.split(':');
          if (split[1]) {
            switch (spit[0]) {
              case 'set':
                _results.push(this.events[key] = function() {
                  return _this.set(split[1].trim(), _this.get(split[2].trim()));
                });
                break;
              case 'toggle':
                _results.push(this.events[key] = function() {
                  return _this.toggle(split[1]);
                });
                break;
              default:
                _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    View.prototype._bindComponents = function() {
      var items, key, value, _ref, _results,
        _this = this;
      _ref = Base.components;
      _results = [];
      for (key in _ref) {
        value = _ref[key];
        items = this.ractive.fragment.items || [];
        _results.push(this.$("x-" + key, items.map(function(item) {
          return item.node;
        })).each(function(index, el) {
          var $el, attr, attrs, _i, _len, _ref1;
          $el = $(el);
          attrs = {};
          _ref1 = el.attributes;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            attr = _ref1[_i];
            attrs[attr.name] = attr.value;
          }
          return value.call(_this, $el, _this, attrs);
        }));
      }
      return _results;
    };

    View.prototype._parseObjectGetter = function(str) {
      return str;
    };

    View.prototype._parseTemplate = function() {};

    View.prototype._parseDOM = function() {
      var parse, res;
      parse = function(el) {
        var attr, attrs, child, index, item, name, odd, props, split, value, _i, _j, _len, _len1, _ref, _results;
        attrs = {};
        _ref = el.attributes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attr = _ref[_i];
          name = attr.name;
          value = attr.value;
          arr = attrs[name] = [];
          if (/\{\{.*\}\}/.test(value)) {
            split = arr.split(/\{\{|\}\}/);
            for (index = _j = 0, _len1 = split.length; _j < _len1; index = ++_j) {
              item = split[index];
              odd = index % 2;
              if (odd) {
                props = _.compact(item.split(/\s+|[\(\)+=-><%\/&!^\|]+/));
                arr.push({
                  fn: new Function("return " + item),
                  props: props
                });
              } else {
                arr.push(item);
              }
            }
          }
          _results.push({
            attrs: attrs,
            children: (function() {
              var _k, _len2, _ref1, _results1;
              _ref1 = el.chidren;
              _results1 = [];
              for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                child = _ref1[_k];
                _results1.push(parse(child));
              }
              return _results1;
            })()
          });
        }
        return _results;
      };
      return res = parse(this.el);
    };

    View.prototype._initRactive = function() {
      var adaptor, filters, key, template, templateName, val, value, _ref, _results,
        _this = this;
      if (this.options.ractive || this.ractive) {
        filters = _.clone(Base.filters);
        for (key in filters) {
          value = filters[key];
          if (value && value.bind) {
            filters[key] = value.bind(this);
          }
        }
        templateName = "src/templates/views/" + ($.dasherize(this.name)) + ".html";
        template = this.template || JST[templateName] || '';
        this.ractive = new Ractive({
          el: this.el,
          template: template,
          data: _.extend(this.toJSON(), {
            $view: this,
            $filter: Base.filters
          })
        });
        for (key in this) {
          val = this[key];
          if (typeof val === 'function' && key[0] !== '_') {
            (function(key, val) {
              return _this.ractive.on(key, function(event, argString) {
                if (argString == null) {
                  argString = '';
                }
                if (typeof argString !== 'string') {
                  argString = '';
                }
                return val.apply(_this, argString.split(':').map(function(arg, index) {
                  return $.zepto.deserializeValue(arg.trim());
                }));
              });
            })(key, val);
          }
        }
        adaptor = Ractive.adaptors.backboneAssociatedModel;
        this.ractive.bind(adaptor(this.state));
        this.ractive.bind(adaptor(currentApp.state, '$app'));
        _ref = app.singletons;
        _results = [];
        for (key in _ref) {
          val = _ref[key];
          if (val instanceof Base.Model || val instanceof Base.Collection) {
            _results.push(this.ractive.bind(adaptor(val, "$app." + key)));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    View.prototype._bindEventBubbling = function() {
      var _this = this;
      return this.on('all', function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        _this.broadcast.apply(_this, args);
        return _this.emit.apply(_this, args);
      });
    };

    View.prototype.trigger = function() {
      var args, eventName;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!(args[0] instanceof Base.Event)) {
        args.unshift(new Base.Event({
          name: eventName,
          target: this,
          currentTarget: this
        }));
      } else {
        args[0].currentTarget = this;
      }
      return View.__super__.trigger.apply(this, arguments);
    };

    View.prototype.subView = function(name, view) {
      if (!view) {
        if (typeof name === 'string') {
          return this.childView(name);
        } else {
          view = name;
          name = null;
        }
      }
      if (!(view instanceof View)) {
        view = new view(args);
      }
      view.__viewName__ = name;
      view.parent = this;
      return this.children.push(view);
    };

    View.prototype.insertView = function(selector, view) {
      if (!view) {
        view = selector;
        selector = null;
      }
      this.subView(view);
      if (selector) {
        this.$(selector).append(view.$el);
      } else {
        this.$el.append(view.$el);
      }
      return this;
    };

    View.prototype.parentView = function(arg, findOne) {
      return this.parentViews(arg, findOne);
    };

    View.prototype.findView = function(arg) {
      return this.findViews(arg, true);
    };

    View.prototype.childView = function(arg) {
      return this.childViews(arg, true);
    };

    View.prototype.childViews = function(arg, findOne) {
      return this.findViews(arg, findOne, true);
    };

    View.prototype.parentViews = function(arg, findOne) {
      var parent, res;
      res = [];
      if (!arg) {
        if (findOne) {
          return this.parent;
        } else {
          res.push(this.parent);
        }
      } else {
        parent = this;
        while (parent = parent.parent) {
          if (parent.is && parent.is(arg)) {
            if (findOne) {
              return parent;
            } else {
              res.push(parent);
            }
          }
        }
      }
      return res;
    };

    View.prototype.findViews = function(arg, findOne, shallow) {
      var foundView, recurse, views;
      views = [];
      foundView = void 0;
      recurse = function(view) {
        var childView, _i, _len, _ref, _results;
        _ref = view.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          childView = _ref[_i];
          if (childView.is(arg)) {
            views.push(childView);
            if (findOne) {
              foundView = childView;
              break;
            }
          }
          if (childView && !shallow) {
            _results.push(recurse(childView));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      recurse(this);
      if (findOne) {
        return foundView;
      } else {
        return views;
      }
    };

    View.prototype.is = function(arg) {
      var key, name, str, strip, thisKey, value;
      if (!arg || arg === this || this.$el.is(arg)) {
        return true;
      }
      switch (typeof arg) {
        case 'string':
          strip = function(str) {
            return str.toLowerCase().replace(/view$/i, '');
          };
          str = strip(arg);
          name = this.__viewName__;
          return strip(this.name || "") === str || strip(name || '') === str;
        case 'function':
          return !!arg(this);
        default:
          for (key in arg) {
            value = arg[key];
            thisKey = this.get(key);
            if (thisKey == null) {
              thisKey = this[key];
            }
            if (value !== thisKey) {
              return false;
            }
          }
          return true;
      }
    };

    View.prototype.destroy = function() {
      if (this.ractive && this.ractive.off) {
        /* Ractive.off is throwing errors*/

        this.ractive.teardown();
        this.ractive.unbind();
      }
      this.state.off();
      this.state.stopListening();
      if (this.state.cleanup()) {
        this.state.cleanup();
      }
      this.trigger('destroy');
      if (this.cleanup) {
        this.cleanup();
      }
      this.$el.removeData('view');
      this.$el.off();
      this.off();
      this.undelegateEvents();
      this.remove();
      if (this.parent) {
        return this.parent.children.splice(this.parent.children.indexOf(this), 1);
      }
    };

    View.prototype.request = function() {
      var args, event, eventName, eventObj, parent, response, _results;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      parent = this;
      _results = [];
      while (parent = parent.parent) {
        eventObj = parent["onRequest" + (capitalize(eventName))] || _.last(child._events["request:" + eventName]);
        if (eventObj) {
          event = new Base.Event({
            type: 'request',
            target: this
          });
          response = eventObj.callback.apply(eventObj.ctx, [event].concat(args));
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    View.prototype.emit = function() {
      var args, event, eventName, name, newEvent, parent, _i, _len, _ref, _results;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      parent = this.parent;
      if (parent) {
        if (/^(child:|request:)/.test(eventName)) {
          event = args[0];
          if (!event.propagationStopped) {
            event.currentTarget = parent;
            return parent.trigger.apply(parent, arguments);
          }
        } else if (!/^(app:|parent:|firstChild:|firstParent:)/.test(eventName)) {
          name = uncapitalize(this.name);
          event = new Base.Event({
            name: eventName,
            target: this,
            currentTarget: parent
          });
          _ref = ["child:" + eventName, "child:" + name + ":" + eventName, "firstChild:" + eventName, "firstChild:" + name + ":" + eventName];
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            newEvent = _ref[_i];
            _results.push(parent.trigger.apply(parent, [newEvent, event].concat(args)));
          }
          return _results;
        }
      }
    };

    View.prototype.broadcast = function() {
      var args, child, event, eventName, name, newEvent, _i, _j, _len, _len1, _ref, _ref1;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.children) {
        if (/^(parent:|app:)/.test(eventName)) {
          event = args[0];
          if (!event.propagationStopped) {
            event.currentTarget = child;
            return this.trigger.apply(child, arguments);
          }
        } else if (!/^(child:|request:|firstParent:|firstChild:)/.test(eventName)) {
          name = uncapitalize(this.name);
          event = new Base.Event({
            name: eventName,
            target: this
          });
          _ref = this.children;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            event.currentTarget = child;
            _ref1 = ["parent:" + eventName, "parent:" + name + ":" + eventName, "firstParent:" + eventName, "firstParent:" + name + ":" + eventName];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              newEvent = _ref1[_j];
              if (event.propagationStopped) {
                return;
              }
              child.trigger.apply(child, [newEvent, event].concat(args));
            }
          }
        }
      }
    };

    return View;

  })(Backbone.View);

  _ref = ['get', 'set', 'toJSON', 'has', 'unset', 'escape', 'changed', 'clone', 'keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'clear', 'toggle'];
  _fn = function(method) {
    var _base;
    return (_base = Base.View.prototype)[method] != null ? (_base = Base.View.prototype)[method] : _base[method] = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.state[method].apply(this.state, args);
    };
  };
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    method = _ref[_i];
    _fn(method);
  }

  Base.App = (function(_super) {
    __extends(App, _super);

    function App() {
      var key, value;
      currentApp = this;
      for (key in appSurrogate) {
        value = appSurrogate[key];
        currentApp[key] = value;
      }
      appSurrogate = null;
      if (this.template == null) {
        this.template = JST["src/templates/app.html"];
      }
      App.__super__.constructor.apply(this, arguments);
    }

    App.prototype.views = {};

    App.prototype.singletons = {};

    App.prototype.collections = {};

    App.prototype.models = {};

    App.prototype.broadcast = function() {
      var args, child, eventName, _j, _len1, _ref1, _results;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.children) {
        if (!/^(child:|request:|firstParent:|firstChild:)/.test(eventName)) {
          _ref1 = this.children;
          _results = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            child = _ref1[_j];
            _results.push(child.trigger.apply(child, ["app:" + eventName].concat(args)));
          }
          return _results;
        }
      }
    };

    App.prototype.moduleType = 'app';

    return App;

  })(Base.View);

  Base.Model = (function(_super) {
    __extends(Model, _super);

    function Model(defaults, options) {
      var key, value, _ref1,
        _this = this;
      if (defaults == null) {
        defaults = {};
      }
      if (options == null) {
        options = {};
      }
      if (this.name == null) {
        this.name = this.constructor.name;
      }
      _ref1 = _.extend(options.compute || {}, this.compute);
      for (key in _ref1) {
        value = _ref1[key];
        this.computeProperty(key, value);
      }
      if (!(this instanceof Base.State)) {
        if (this.relations == null) {
          this.relations = {};
        }
        this.relations.$state = Base.State;
      }
      this._mapRelations(_.extend({}, this.relations, options.relations));
      Model.__super__.constructor.apply(this, arguments);
      addState(this);
      if (Base.config.debug.logModelChanges) {
        this.on('change', function() {
          var e;
          try {
            return console.log(JSON.stringify(_this.toJSON(), null, 2));
          } catch (_error) {
            e = _error;
            return console.log(e);
          }
        });
      }
    }

    Model.prototype.destroy = function() {
      this.off();
      this.stopListening();
      return Model.__super__.destroy.apply(this, arguments);
    };

    Model.prototype.blacklist = [];

    Model.prototype._mapRelations = function(relations) {
      var isCollection, key, newRelations, value;
      if (relations == null) {
        relations = this.relations;
      }
      if (this.defaults == null) {
        this.defaults = {};
      }
      if (relations && !_.isArray(relations)) {
        newRelations = [];
        for (key in relations) {
          value = relations[key];
          isCollection = false;
          _super = value;
          while (_super = _super.__super__) {
            if (_super === Backbone.Collection.prototype) {
              isCollection = true;
            }
          }
          newRelations.push({
            key: key,
            type: isCollection ? 'Many' : 'One',
            collectionType: isCollection ? value : void 0,
            relatedModel: isCollection ? value.prototype.model : value
          });
        }
        return this.relations = newRelations;
      }
    };

    Model.prototype.toJSON = function(withBlacklist) {
      var json;
      json = Backbone.AssociatedModel.prototype.toJSON.call(this);
      if (withBlacklist) {
        return json;
      } else {
        return _.omit(json, this.blacklist);
      }
    };

    Model.prototype.computeProperty = function(name, args) {
      var callback, obj, trigger, _j, _len1, _ref1,
        _this = this;
      args = _.clone(args);
      switch ($.type(args)) {
        case "object":
          obj = args;
          break;
        case "array":
          obj = {
            fn: args.pop(),
            triggers: args
          };
      }
      this.blacklist.push(name);
      callback = function() {
        var result, values;
        values = obj.triggers.map(function(trigger) {
          return _this.get(trigger);
        });
        result = obj.fn.apply(_this, values);
        return _this.set(name, result);
      };
      _ref1 = obj.triggers;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        trigger = _ref1[_j];
        this.on("change:" + trigger, callback);
      }
      try {
        return callback();
      } catch (_error) {}
    };

    Model.prototype.toggle = function(attr) {
      return this.set(attr, !this.get(attr));
    };

    Model.prototype.moduleType = 'model';

    return Model;

  })(Backbone.AssociatedModel);

  Base.State = (function(_super) {
    __extends(State, _super);

    function State(attributes, options, context) {
      var key, value, _ref1;
      if (options == null) {
        options = {};
      }
      if (this.relations == null) {
        this.relations = {};
      }
      if (context && context.relations) {
        _ref1 = context.relations;
        for (key in _ref1) {
          value = _ref1[key];
          this.relations[key] = value;
        }
      }
      if (this.compute == null) {
        this.compute = options.compute;
      }
      State.__super__.constructor.call(this, attributes, options);
      this.parent = this.parents[0] || context;
      if (this.name == null) {
        this.name = lowercase(this.constructor.name);
      }
      if (this.parent) {
        this.on('all', function() {
          var _this = this;
          return function() {
            var args, event;
            event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            return _this.parent.trigger.apply(_this.parent, ['state:' + event].concat(args));
          };
        });
      }
    }

    return State;

  })(Base.Model);

  Base.Router = (function(_super) {
    __extends(Router, _super);

    function Router() {
      if (this.name == null) {
        this.name = this.constructor.name;
      }
      addState(this);
      Router.__super__.constructor.apply(this, arguments);
    }

    Router.prototype.destroy = function() {
      this.off();
      return this.stopListening();
    };

    Router.prototype.moduleType = 'router';

    return Router;

  })(Backbone.Router);

  Base.Collection = (function(_super) {
    __extends(Collection, _super);

    function Collection() {
      Collection.__super__.constructor.apply(this, arguments);
      if (this.name == null) {
        this.name = this.constructor.name;
      }
      addState(this);
    }

    Collection.prototype.destroy = function() {
      this.off();
      return this.stopListening();
    };

    Collection.prototype.model = Base.Model;

    Collection.prototype.moduleType = 'collection';

    return Collection;

  })(Backbone.Collection);

  Base.Singleton = (function(_super) {
    __extends(Singleton, _super);

    function Singleton() {
      var _base, _name,
        _this = this;
      Singleton.__super__.constructor.apply(this, arguments);
      if ((_base = currentApp || appSurrogate)[_name = uncapitalize(this.name)] == null) {
        _base[_name] = this;
      }
      (currentApp || appSurrogate).singletons[uncapitalize(this.name)] = this;
      this.on('all', function() {
        var args, eventName;
        eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        if (currentApp) {
          return currentApp.trigger.apply(currentApp, ["" + (uncapitalize(_this.name)) + ":" + eventName].concat(args));
        }
      });
    }

    return Singleton;

  })(Base.Model);

  Base.List = (function() {
    function List(items, options) {
      if (options == null) {
        options = {};
      }
      this.reset(items, options);
    }

    List.prototype.unshift = function() {
      var item, items, _j, _len1, _ref1, _results;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _ref1 = items.reverse();
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        item = _ref1[_j];
        _results.push(this.add(item, {
          at: 0
        }));
      }
      return _results;
    };

    List.prototype.push = function() {
      var item, items, _j, _len1, _results;
      items = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len1 = items.length; _j < _len1; _j++) {
        item = items[_j];
        _results.push(this.add(item, {
          at: this.length
        }));
      }
      return _results;
    };

    List.prototype.shift = function() {
      return this.remove(null, {
        at: 0
      });
    };

    List.prototype.pop = function() {
      return this.remove(null, {
        at: this.length - 1
      });
    };

    List.prototype.reset = function(items, options) {
      if (options == null) {
        options = {};
      }
      this.splice(this.length, this.length);
      this.push.apply(this, items);
      if (!options.silent) {
        return this.trigger('reset', this, options);
      }
    };

    List.prototype.add = function(item, options) {
      var at;
      if (options == null) {
        options = {};
      }
      at = options.at != null ? options.at : options.at = this.length;
      this.splice(at, null, item);
      if (!options.silent) {
        return this.trigger('add', item, this, options);
      }
    };

    List.prototype.remove = function(item, options) {
      var index;
      if (options == null) {
        options = {};
      }
      index = options.at || this.indexOf(item);
      if (item == null) {
        item = this[index];
      }
      this.splice(index, 1);
      if (!options.silent) {
        this.trigger('remove', item, this, options);
      }
      return item;
    };

    return List;

  })();

  _.extend(Base.List.prototype, Backbone.Events);

  _ref1 = ['splice', 'indexOf', 'lastIndexOf', 'join', 'reverse', 'sort', 'valueOf', 'map', 'forEach', 'every', 'reduce', 'reduceRight', 'filter', 'some'];
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    method = _ref1[_j];
    if (!Base.List.prototype[method]) {
      Base.List.prototype[method] = arr[method];
    }
  }

  _ref2 = ['each', 'contains', 'find', 'filter', 'reject', 'contains', 'max', 'min', 'sortBy', 'groupBy', 'sortedIndex', 'shuffle', 'toArray', 'size', 'first', 'last', 'initial', 'rest', 'without', 'isEmpty', 'chain', 'where', 'findWhere', 'clone', 'pluck', 'invoke'];
  for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
    method = _ref2[_k];
    if (!Base.List.prototype[method]) {
      Base.List.prototype[method] = _[method];
    }
  }

  Base.Object = (function() {
    function Object() {}

    return Object;

  })();

  _.extend(Base.Object.prototype, Backbone.Events);

  Base.Event = (function() {
    function Event(options) {
      this.options = options;
      _.extend(this, this.options);
      if (this.currentTarget == null) {
        this.currentTarget = this.target;
      }
    }

    Event.prototype.preventDefault = function() {
      return this.defaultPrevented = true;
    };

    Event.prototype.stopPropagation = function() {
      return this.propagationStopped = true;
    };

    return Event;

  })();

  BasicView = (function(_super) {
    __extends(BasicView, _super);

    function BasicView(options) {
      var data, html, view,
        _this = this;
      if (options == null) {
        options = {};
      }
      if (this.name == null) {
        this.name = options.name || (options.model && options.model.name ? options.model.name + ':view' : void 0);
      }
      view = options.view;
      html = options.html;
      data = options.data;
      this.ractive = !!view.ractive;
      if (options.path) {
        this.relations = {
          model: view.get(options.path).model
        };
      }
      if (this.template == null) {
        this.template = html;
      }
      BasicView.__super__.constructor.apply(this, arguments);
      if (options.model) {
        this.set('model', options.model);
      }
      if (html) {
        this.set('html', html);
      }
      if (this.ractive) {
        this.render();
      } else {
        this.$el.html(html);
      }
      if (data) {
        if (!data.toJSON) {
          this.set(data);
        } else {
          this.set(data.toJSON());
          this.listenTo(data, 'all', function(eventName) {
            var eventType, keypath, split;
            split = eventName.split(':');
            eventType = split[0];
            keypath = split[1];
            if (eventType === 'change' && keypath) {
              return _this.set(keyPath, data.get(keyPath));
            }
          });
        }
      }
    }

    return BasicView;

  })(Base.View);

  capitalize = function(str) {
    if (str) {
      return str[0].toUpperCase() + str.substring(1);
    } else {
      return '';
    }
  };

  addState = function(obj) {
    var state, stateAttributes,
      _this = this;
    if (!(obj instanceof Base.State)) {
      stateAttributes = obj.state || {};
      if (obj.blacklist == null) {
        obj.blacklist = [];
      }
      obj.blacklist.push('$state');
      if (obj instanceof Base.Model) {
        obj.set('$state', stateAttributes);
        state = obj.state = obj.get('$state');
      } else {
        stateAttributes = _.defaults(stateAttributes, obj.defaults);
        state = obj.state = new Base.State(stateAttributes, obj.stateOptions, obj);
      }
      if (obj instanceof Base.View) {
        state.set('$state', state);
      }
      return state.on('all', function() {
        var args, eventName, split;
        eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        split = eventName.split(':');
        if (split[0] === 'change' && split[1]) {
          return obj.trigger.apply(["change:$state." + split[1]].concat(args));
        }
      });
    }
  };

  uncapitalize = function(str) {
    if (str) {
      return str[0].toLowerCase() + str.substring(1);
    } else {
      return '';
    }
  };

  Base.components = {
    collection: function($el, view, attrs) {
      var View, html, insertView, name, path,
        _this = this;
      if (attrs == null) {
        attrs = {};
      }
      path = attrs.path || attrs.collection;
      name = attrs.name;
      View = currentApp.views[capitalize(attrs.view)] || BasicView;
      html = $el.html();
      $el.empty();
      insertView = function(model) {
        return _this.insertView($el, new View(_.extend({
          data: model,
          html: html,
          view: view,
          parent: _this,
          name: name,
          path: path,
          model: model
        }, attrs)));
      };
      this.on("reset:" + path, function() {
        var child, _l, _len3, _ref3, _results;
        _ref3 = _this.childViews(view);
        _results = [];
        for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
          child = _ref3[_l];
          _results.push(child.destroy());
        }
        return _results;
      });
      this.on("remove:" + path, function(model) {
        return _this.childView({
          model: model
        }).destroy();
      });
      this.on("add:" + path, insertView);
      return this.get(path).each(insertView);
    },
    view: function($el, view, attrs) {
      var View, data, html, name;
      View = currentApp.views[capitalize(attrs.view)] || BasicView;
      name = attrs.name;
      data = this.get(attrs.data) || view.state;
      html = $el.html();
      $el.empty();
      return this.insertView($el, new View(_.extend({
        html: html,
        view: view,
        name: name,
        data: data
      }, attrs)));
    },
    log: function($el, view, attrs) {
      var key, out, value;
      out = {};
      for (key in attrs) {
        value = attrs[key];
        out[key] = this.get(value);
      }
      console.log('x-log:', out);
      return $el.remove();
    },
    list: function($el, view) {}
  };

  Base.plugins = {
    view: {
      ractive: function(view, config) {},
      actions: function(view, config) {
        var event, _l, _len3, _results,
          _this = this;
        _results = [];
        for (_l = 0, _len3 = DOMEventList.length; _l < _len3; _l++) {
          event = DOMEventList[_l];
          _results.push((function(event) {
            var callback;
            callback = function(e) {
              var $target, action, cb;
              $target = $(e.currentTarget);
              action = $target.attr("action-" + event) || $target.attr("data-action-" + event);
              cb = _this._getCallback(action);
              return cb.call(_this);
            };
            return _this.$el.on(event, "[data-action-" + event + "], [action-" + event + "]", _.debounce(callback, 1, true));
          })(event));
        }
        return _results;
      },
      outlet: function(view, config) {
        var bound,
          _this = this;
        bound = [];
        return this.on('after:render', function() {
          var $el, el, events, key, outlet, value, _base, _l, _len3, _ref3, _ref4, _results;
          _ref3 = $('[outlet], [data-outlet]', ractive.fragment.items);
          _results = [];
          for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
            el = _ref3[_l];
            $el = $(el);
            outlet = $el.attr('data-outlet') || $el.attr('outlet');
            if (!_.contains(bound, outlet)) {
              bound.push(outlet);
              if ((_base = _this.$)[outlet] == null) {
                _base[outlet] = _this.$("[data-outlet='" + outlet + "'], [outlet='" + outlet + "']");
              }
              events = [];
              for (key in _this) {
                value = _this[key];
                if ((new RegExp("on(.*)?" + outlet, 'i')).test(key)) {
                  events.push(RegExp.$1.toLowerCase());
                }
              }
              _ref4 = _this._events;
              for (key in _ref4) {
                value = _ref4[key];
                if ((new RegExp("^([^:]*?):" + outlet, 'i')).test(key)) {
                  events.push(RegExp.$1.toLowerCase());
                }
              }
              _results.push($el.on(events.join, function(e) {
                return _this.trigger([event.type, outlet].join(':'), e);
              }));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        });
      }
    },
    all: {
      state: function() {}
    }
  };

  Base.filters = {
    uncapitalize: function(str) {
      return str && (str[0].toLowerCase() + str.substring(1)) || '';
    },
    capitalize: function(str) {
      return str && (str[0].toUpperCase() + str.substring(1)) || '';
    },
    uppercase: function(str) {
      return str.toUpperCase();
    },
    lowercase: function(str) {
      return str.toLowerCase();
    },
    json: function(obj) {
      return JSON.stringify(obj, null, 2);
    },
    orderBy: function(arr, property, reverse) {
      arr = arr.sort(function(item) {
        return item[property];
      });
      if (reverse) {
        return arr.reverse();
      } else {
        return arr;
      }
    }
  };

  Base.defaults = {
    all: {
      plugins: {
        state: true
      }
    },
    view: {
      plugins: {
        actions: false,
        outlets: true,
        filters: true,
        ractive: true,
        components: true,
        manage: true,
        eventSugar: true
      }
    },
    model: {
      plugins: {}
    },
    router: {
      plugins: {}
    },
    collection: {
      plugins: {}
    }
  };

  _ref3 = ['Model', 'Router', 'Collection', 'View'];
  for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
    className = _ref3[_l];
    _ref4 = ['get', 'set', 'on', 'listenTo', 'off', 'stopListening', 'once', 'listenToOnce', 'trigger', 'clear', 'has', 'invert', 'omit', 'pick', 'sync', 'fetch', 'save', 'changed', 'validate', 'isValid', 'clone', 'hasChanged', 'previous', 'destroy'];
    _fn1 = function(method) {
      return Base[className].prototype['state' + capitalize(method)] = function() {
        var args;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return this.state[method].apply(this.state, args);
      };
    };
    for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
      method = _ref4[_m];
      _fn1(method);
    }
  }

  Base.Controller = Base.View;

  window.Base = Base;

}).call(this);
