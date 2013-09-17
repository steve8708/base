/* base.js v0.0.21 */ 

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
  TODO: AMD support ( require, define )
*/


(function() {
  var Base, BasicView, DOMEventList, Ractive, addState, appSurrogate, arr, callbackStringSplitter, camelize, capitalize, className, currentApp, dasherize, deserialize, getModuleArgs, invokeModule, invokeWithArgs, method, module, moduleQueue, moduleType, moduleTypes, originalBase, parseRequirements, prepareModule, subject, uncapitalize, _base, _fn, _fn1, _fn2, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _len7, _m, _n, _o, _p, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  originalBase = window.Base;

  currentApp = null;

  appSurrogate = {
    singletons: {}
  };

  if (window._JST == null) {
    window._JST = {};
  }

  Ractive = window.Ractive || (typeof window.require === 'function' ? require('Ractive') : void 0);

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
      if ((_base = this.attributes)['data-view'] == null) {
        _base['data-view'] = dasherize(this.name.replace(/view/i, ''));
      }
      if (this.children == null) {
        this.children = new Base.List(this.options.children || []);
      }
      if (this.ractive == null) {
        this.ractive = true;
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
      this._bindAttributes();
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

    View.prototype.lookup = function(keypath) {
      var parent, value;
      parent = this;
      while (parent = parent.parent) {
        value = parent.get(keypath);
        if (value != null) {
          return value;
        }
      }
    };

    View.prototype.require = function() {};

    View.prototype.define = function() {};

    View.prototype._bindAttributes = function() {
      var attr, _i, _len, _ref, _results,
        _this = this;
      if (this.bindAttributes) {
        _ref = this.bindAttributes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attr = _ref[_i];
          _results.push((function(attr) {
            var domAttr;
            domAttr = dasherize(attr);
            _this.$el.attr("data-" + domAttr, _this.get(attr));
            return _this.on("change:" + attr, function(model, value) {
              return _this.$el.attr("data-" + domAttr, value);
            });
          })(attr));
        }
        return _results;
      }
    };

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
      if (!split[1] && allowString) {
        return str;
      }
      args = (function() {
        var _i, _len, _ref, _results;
        _ref = split.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          _results.push(deserialize(value));
        }
        return _results;
      })();
      return this[split[0]].bind(this, args);
    };

    View.prototype._bindEvents = function() {
      var $el, callback, eventName, item, key, name, prefix, selector, value, _base, _i, _len, _ref, _ref1, _ref2, _ref3, _results;
      if (this.events) {
        _ref = this.events;
        for (key in _ref) {
          value = _ref[key];
          if (value && value.split && callbackStringSplitter.test(value)) {
            this.events[key] = this._getCallback(value);
          }
        }
      }
      if (typeof this.bind !== 'object') {
        this.bind = {};
      }
      for (key in this) {
        value = this[key];
        _ref1 = ['document', 'window'];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          item = _ref1[_i];
          prefix = "on" + (capitalize(item));
          if (key.indexOf(prefix) === 0) {
            if ((_base = this.bind)[item] == null) {
              _base[item] = {};
            }
            this.bind[item][key.split(prefix)[1].toLowerCase()] = value;
          }
        }
      }
      _ref2 = this.bind;
      _results = [];
      for (key in _ref2) {
        value = _ref2[key];
        if ((_ref3 = typeof value) === 'function' || _ref3 === 'string') {
          if (value) {
            _results.push(this.on(key, this._getCallback(value).bind(this)));
          } else {
            _results.push(void 0);
          }
        } else if (key === 'document' || key === 'window') {
          selector = key === 'document' ? document : window;
          $el = $(selector);
          _results.push((function() {
            var _results1;
            _results1 = [];
            for (name in value) {
              callback = value[name];
              _results1.push($el.on("" + name + ".delegateEvents-" + this.cid, this._getCallback(callback).bind(this)));
            }
            return _results1;
          }).call(this));
        } else {
          _results.push((function() {
            var _results1;
            _results1 = [];
            for (eventName in value) {
              callback = value[eventName];
              if (callback) {
                _results1.push(this.on("" + key + ":" + eventName, this._getCallback(callback).bind(this)));
              } else {
                _results1.push(void 0);
              }
            }
            return _results1;
          }).call(this));
        }
      }
      return _results;
    };

    View.prototype.render = function(dontRerender) {
      if (dontRerender && this._hasRendered) {
        return;
      }
      this._hasRendered = true;
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
        camelized = camelize(event);
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
      var key, value, _ref, _results,
        _this = this;
      _ref = Base.components;
      _results = [];
      for (key in _ref) {
        value = _ref[key];
        _results.push(this.$el.find("x-" + key + ", base-" + key).each(function(index, el) {
          var $el, attr, attrs, _i, _len, _ref1;
          $el = $(el);
          attrs = {};
          _ref1 = el.attributes;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            attr = _ref1[_i];
            attrs[camelize(attr.name)] = attr.value;
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
      var adaptor, filters, key, parent, parentName, parents, template, templateName, val, value, _i, _len, _ref, _results,
        _this = this;
      if (this.options && this.options.ractive || this.ractive) {
        filters = _.clone(Base.filters);
        for (key in filters) {
          value = filters[key];
          if (value && value.bind) {
            filters[key] = value.bind(this);
          }
        }
        templateName = "src/templates/views/" + (dasherize(this.name)) + ".html";
        template = this.template || _.clone(_JST[templateName]) || this.$el.html();
        this.ractive = new Ractive({
          el: this.el,
          template: template,
          data: _.extend(this.toJSON(), {
            $view: this,
            $filter: Base.filters,
            $base: Base
          })
        });
        for (key in this) {
          val = this[key];
          if (typeof val === 'function' && key[0] !== '_') {
            (function(key, val) {
              return _this.ractive.on(key, function(event, argString) {
                var argArray, args, stringRe;
                if (argString == null) {
                  argString = '';
                }
                if (key === 'set' && !event.original) {
                  return;
                }
                if (typeof argString !== 'string') {
                  argString = '';
                }
                stringRe = /^(?:'(.*?)'|"(.*?)")$/;
                argArray = _.compact(argString.split(/\s*[:,]+\s*/));
                args = argArray.map(function(arg, index) {
                  var deserialized, isString, keyPath, keypath;
                  arg = arg.trim();
                  isString = stringRe.test(arg);
                  if (isString) {
                    return RegExp.$1 || RegExp.$2;
                  }
                  deserialized = deserialize(arg);
                  if (typeof deserialized !== 'string') {
                    return deserialized;
                  }
                  if (arg === '.') {
                    keypath = event.keyPath;
                  } else if (arg && arg[0] === '.') {
                    keypath = "" + event.keyPath + arg;
                  } else {
                    keyPath = arg;
                  }
                  return _this.get(arg);
                });
                args.push(event.original);
                return val.apply(_this, args);
              });
            })(key, val);
          }
        }
        adaptor = Ractive.adaptors.backboneAssociatedModel;
        this.ractive.bind(adaptor(this.state));
        this.ractive.bind(adaptor(currentApp.state, '$app'));
        if (currentApp.router) {
          this.ractive.bind(adaptor(currentApp.router.state, '$router'));
        }
        parents = [];
        parent = this;
        while (parent = parent.parent) {
          parents.push(parent);
        }
        for (_i = 0, _len = parents.length; _i < _len; _i++) {
          parent = parents[_i];
          parentName = uncapitalize(parent.name);
          this.ractive.bind(adaptor(parent.state, "$parent." + parentName));
        }
        _ref = currentApp.singletons;
        _results = [];
        for (key in _ref) {
          val = _ref[key];
          if (val instanceof Base.Model || val instanceof Base.Collection) {
            _results.push(this.ractive.bind(adaptor(val, "$" + key)));
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

    View.prototype.get = function(path) {
      var subject, truePath;
      if (!path) {
        return;
      }
      subject = this.state;
      truePath = path;
      if (path.indexOf('$') === 0) {
        truePath = path.split('.').slice(1).join('.');
        if (path.indexOf('$app.') === 0) {
          subject = app;
        } else {
          subject = currentApp.singletons[path.split('.')[0].substring(1)];
        }
      }
      return subject.get(truePath);
    };

    View.prototype.subView = function() {
      var args, name, view;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (!args[1]) {
        if (typeof args[0] === 'string') {
          return this.childView(args[0]);
        } else {
          view = args[0];
        }
      } else {
        view = args[1];
        name = args[0];
      }
      if (!view) {
        console.warn('No view passed to subView', args, arguments);
        return;
      }
      if (!(view instanceof Base.View)) {
        view = new view;
      }
      view.__viewName__ = name;
      view.parent = this;
      this.children.push(view);
      return view;
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
      $([document, window]).off(".delegateEvents-" + this.cid);
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
      var args, event, eventName, eventObj, parent, response, _ref, _results;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      parent = this;
      _results = [];
      while (parent = parent.parent) {
        eventObj = parent["onRequest" + (capitalize(eventName))] || _.last(parent._events["request:" + eventName]);
        if (eventObj) {
          event = new Base.Event({
            type: 'request',
            target: this
          });
          response = (_ref = eventObj.callback).call.apply(_ref, [eventObj.ctx, event].concat(__slice.call(args)));
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
          if (event == null) {
            event = new Base.Event({
              type: eventName,
              target: this
            });
          }
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
            _results.push(parent.trigger.apply(parent, [newEvent, event].concat(__slice.call(args))));
          }
          return _results;
        }
      }
    };

    View.prototype.broadcast = function() {
      var args, child, event, eventName, name, newEvent, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.children) {
        if (/^(parent:|app:)/.test(eventName)) {
          event = args[0] || new Base.Event({
            type: eventName,
            target: this
          });
          if (!event.propagationStopped) {
            event.currentTarget = child;
            _ref = this.children;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              child = _ref[_i];
              if (event.propagationStopped) {
                return;
              }
              child.trigger.apply(child, arguments);
            }
          }
        } else if (!/^(child:|request:|firstParent:|firstChild:)/.test(eventName)) {
          name = uncapitalize(this.name);
          event = new Base.Event({
            name: eventName,
            target: this
          });
          _ref1 = this.children;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            child = _ref1[_j];
            event.currentTarget = child;
            _ref2 = ["parent:" + eventName, "parent:" + name + ":" + eventName, "firstParent:" + eventName, "firstParent:" + name + ":" + eventName];
            for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
              newEvent = _ref2[_k];
              if (event.propagationStopped) {
                return;
              }
              child.trigger.apply(child, [newEvent, event].concat(__slice.call(args)));
            }
          }
        }
      }
    };

    return View;

  })(Backbone.View);

  Base.App = (function(_super) {
    __extends(App, _super);

    function App(options) {
      var $win, key, value,
        _this = this;
      this.options = options;
      currentApp = this;
      for (key in appSurrogate) {
        value = appSurrogate[key];
        currentApp[key] = value;
      }
      appSurrogate = null;
      if (this.template == null) {
        this.template = _JST["src/templates/app.html"];
      }
      $win = $(window);
      $win.on("resize.appResize-" + this.cid, function() {
        return _this.set({
          windowWidth: $win.width(),
          windowHeight: $win.height(),
          documentWidth: document.width,
          documentHeight: document.height
        });
      });
      App.__super__.constructor.apply(this, arguments);
    }

    App.prototype.require = function() {};

    App.prototype.destroy = function() {
      $(window).off("resize.appResize-" + this.cid);
      return App.__super__.destroy.apply(this, arguments);
    };

    App.prototype.define = function() {};

    App.prototype.init = function(options) {
      if (options == null) {
        options = this.options;
      }
      return this.trigger('init', options);
    };

    App.prototype.broadcast = function() {
      var args, child, eventName, _i, _len, _ref, _results;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (this.children) {
        if (!/^(child:|request:|firstParent:|firstChild:)/.test(eventName)) {
          _ref = this.children;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            _results.push(child.trigger.apply(child, ["app:" + eventName].concat(__slice.call(args))));
          }
          return _results;
        }
      }
    };

    App.prototype.moduleType = 'app';

    return App;

  })(Base.View);

  moduleTypes = ['model', 'view', 'singleton', 'collection', 'app', 'module', 'component', 'service', 'filter'];

  prepareModule = function(module) {
    var fn;
    if (typeof module !== 'function') {
      fn = module.pop();
      fn.dependencies = module;
    } else {
      fn = module;
    }
    return fn;
  };

  getModuleArgs = function(depStrings) {
    return depStrings.map(function(item) {
      var split, type, _i, _len;
      split = item.split('.');
      if (split[1]) {
        return Base[split[0]](split[1]);
      }
      for (_i = 0, _len = moduleTypes.length; _i < _len; _i++) {
        type = moduleTypes[_i];
        if (item.lastIndexOf(capitalize(type)) + type.length === item.length) {
          return Base[item](type.substring(0, type.length - item.length - 1));
        }
      }
    });
  };

  invokeModule = function(module) {
    if (typeof module === 'function') {
      return invokeWithArgs(module, getModuleArgs(module.dependencies || []));
    }
  };

  invokeWithArgs = function(constructor, args) {
    var Func;
    Func = function() {
      return constructor.apply(null, args);
    };
    Func.prototype = constructor.prototype;
    return new Func;
  };

  moduleQueue = [];

  _ref = [Base.App.prototype, Base];
  _fn = function(subject) {
    var type, _j, _len1, _results;
    _results = [];
    for (_j = 0, _len1 = moduleTypes.length; _j < _len1; _j++) {
      type = moduleTypes[_j];
      _results.push((function(type) {
        var _name;
        if (subject[_name = "" + type + "s"] == null) {
          subject[_name] = {};
        }
        return subject[type] = function(name, module) {
          var deps, index, indexesToSplice, item, modifier, _base, _k, _l, _len2, _len3, _ref1, _results1;
          if (typeof name === 'string' && !module) {
            return subject[type][capitalize(name)];
          } else if (name && module) {
            module = prepareModule(module);
            if (module.prototype) {
              if ((_base = module.prototype).name == null) {
                _base.name = name;
              }
            }
            if (module.name == null) {
              module.name = name;
            }
            subject[type][capitalize(name)] = module;
          } else {
            module = name;
            module = prepareModule(module);
            name = module.name || module.prototype.name;
            throw new Error('Modules must have a name');
            subject[type][capitalize(module.prototype.name)] = module;
          }
          if (typeof module === 'function') {
            if (module.dependencies == null) {
              module.dependencies = Base.utils.getFunctionArgNames(module);
            }
          }
          if (module.dependencies && module.dependencies.length) {
            moduleQueue.push({
              name: name,
              dependencies: _.clone(module.dependencies),
              module: module
            });
          }
          indexesToSplice = [];
          for (index = _k = 0, _len2 = moduleQueue.length; _k < _len2; index = ++_k) {
            item = moduleQueue[index];
            deps = item.dependencies;
            if (_ref1 = "" + item.name + "{capitalize type}", __indexOf.call(deps, _ref1) >= 0) {
              index = deps.indexOf("" + item.name + "{capitalize type}");
              deps.splice(index, 1);
              if (!deps.length) {
                indexesToSplice.push(index);
                invokeModule(module);
              }
            }
          }
          modifier = 0;
          _results1 = [];
          for (_l = 0, _len3 = indexesToSplice.length; _l < _len3; _l++) {
            index = indexesToSplice[_l];
            _results1.push(moduleQueue.splice(index - modifier++, 1));
          }
          return _results1;
        };
      })(type));
    }
    return _results;
  };
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    subject = _ref[_i];
    _fn(subject);
  }

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
            return console.info(JSON.stringify(_this.toJSON(), null, 2));
          } catch (_error) {
            e = _error;
            return console.info(e);
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
            if (_super && _super.initialize === Backbone.Collection.prototype.initialize) {
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
      this.parent = this.parents[0] || options.parent || context || attributes.parent;
      if (this.name == null) {
        this.name = lowercase(this.constructor.name);
      }
      if (this.parent) {
        this.on('all', function() {
          var _this = this;
          return function() {
            var args, event, _ref2;
            event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
            return (_ref2 = _this.parent).trigger.apply(_ref2, ['state:' + event].concat(__slice.call(args)));
          };
        });
      }
    }

    return State;

  })(Base.Model);

  Base.Object = (function() {
    function Object() {}

    return Object;

  })();

  _.extend(Base.Object.prototype, Backbone.Events);

  Base.Stated = (function(_super) {
    __extends(Stated, _super);

    function Stated() {
      this.addState(this);
      Stated.__super__.constructor.apply(this, arguments);
    }

    return Stated;

  })(Base.Object);

  Base.Router = (function(_super) {
    __extends(Router, _super);

    function Router() {
      var _this = this;
      if (this.name == null) {
        this.name = this.constructor.name;
      }
      this.stateOptions = _.defaults(this.stateOptions || {}, {
        relations: this.relations,
        compute: this.compute
      });
      addState(this);
      Router.__super__.constructor.apply(this, arguments);
      if (!this.get('params')) {
        this.set('params', {});
      }
      currentApp.router = this;
      this.on('route', function(router, route, params) {
        var index, item, queryParams, split, _j, _len1;
        _this.set('route', route.join('/'));
        _this.set('path', route);
        queryParams = {};
        split = (location.href.split('?')[1] || '').split(/[&=]/);
        for (index = _j = 0, _len1 = split.length; _j < _len1; index = ++_j) {
          item = split[index];
          if (index % 2 || !item) {
            continue;
          }
          queryParams[decodeURI(item)] = decodeURI(split[index + 1]);
        }
        _this.set('params', params);
        return _this.set('queryParams', queryParams);
      });
    }

    Router.prototype.setParams = function(obj, reset) {
      var params;
      params = reset ? {} : this.get('params');
      _.extend(params, obj);
      return this.set('params', obj);
    };

    Router.prototype.relations = {
      params: Base.Model
    };

    Router.prototype.go = function(route) {
      return this.navigate(route, true);
    };

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
          return currentApp.trigger.apply(currentApp, ["" + (uncapitalize(_this.name)) + ":" + eventName].concat(__slice.call(args)));
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
      if (!options.noState) {
        addState(this);
      }
      if (_.isFunction(this.initialize)) {
        this.initialize.apply(this, arguments);
      }
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

    List.prototype.eventNamespace = 'listItem:';

    List.prototype.bubbleEvents = true;

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
      var at,
        _this = this;
      if (options == null) {
        options = {};
      }
      at = options.at != null ? options.at : options.at = this.length;
      if (this.bubbleEvents && item && _.isFunction(item.on)) {
        this.listenTo(item, 'all', function() {
          var args, eventName;
          eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          if (_this.bubbleEvents) {
            return _this.trigger.apply(_this, ["" + _this.eventNamespace + _this.eventName].concat(__slice.call(args)));
          }
        });
      }
      if (this.model) {
        item = new this.model(item);
      }
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
      item;
      return this.stopListening(item);
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

  _ref3 = ['View', 'Router'];
  for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
    moduleType = _ref3[_l];
    _ref4 = ['get', 'set', 'toJSON', 'has', 'unset', 'escape', 'changed', 'clone', 'keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'clear', 'toggle'];
    _fn1 = function(method) {
      var _base;
      return (_base = Base[moduleType].prototype)[method] != null ? (_base = Base[moduleType].prototype)[method] : _base[method] = function() {
        var args, _ref5;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref5 = this.state)[method].apply(_ref5, args);
      };
    };
    for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
      method = _ref4[_m];
      _fn1(method);
    }
  }

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
      this.set('html', html(html ? this.render() : void 0));
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

  dasherize = function(str) {
    return str.replace(/::/g, '/').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z\d])([A-Z])/g, '$1_$2').replace(/_/g, '-').toLowerCase();
  };

  camelize = function(str) {
    return str.replace(/[^\d\w]+(.)?/g, function(match, chr) {
      if (chr) {
        return chr.toUpperCase();
      } else {
        return '';
      }
    });
  };

  deserialize = function(value) {
    var e;
    try {
      if (!value) {
        return value;
      } else if (value === 'true') {
        return true;
      } else if (value === 'false') {
        return false;
      } else if (value === 'null') {
        return null;
      } else if (!isNaN) {
        return Number(value);
      } else if (/^[\[\{]/.test(value)) {
        return JSON.parse(value);
      } else {
        return value;
      }
    } catch (_error) {
      e = _error;
      return value;
    }
  };

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
        obj.set('$state', _.defaults(stateAttributes, obj.stateDefaults));
        state = obj.state = obj.get('$state');
      } else {
        stateAttributes = _.defaults(stateAttributes, obj.stateDefaults || obj.defaults);
        state = obj.state = new Base.State(stateAttributes, obj.stateOptions, obj);
        if (state.associations == null) {
          state.associations = [];
        }
        state.associations.push({
          type: 'one',
          key: '$parent',
          relatedModel: Base.State
        });
        if (this.parent && this.parent.state) {
          state.set('$parent', this.parent.state.toJSON());
          this.listenTo(this.parent.state, 'all', function(eventName, args) {
            var split;
            split = eventName.split(':');
            if (split[0] === 'change' && split[1]) {
              return _this.set("$state." + split[1], state.get(split[1]));
            }
          });
        }
      }
      if (obj instanceof Base.View) {
        state.set('$state', state);
      }
      return state.on('all', function() {
        var args, eventName, split;
        eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        split = eventName.split(':');
        if (split[0] === 'change' && split[1]) {
          return obj.trigger.apply(obj, ["change:$state." + split[1]].concat(__slice.call(args)));
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
      var View, collection, html, insertView, name, path,
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
        var newView;
        newView = new View(_.extend({
          data: model,
          html: html,
          view: view,
          parent: _this,
          name: name,
          path: path,
          model: model
        }, attrs));
        if (newView.model == null) {
          newView.model = model;
        }
        newView.set('model', model);
        _this.subView(newView);
        newView.render(true);
        return $el.append(newView.$el);
      };
      this.on("remove:" + path, function(model) {
        return _this.childView({
          model: model
        }).destroy();
      });
      this.on("add:" + path, insertView);
      this.on("reset:" + path, function(models, options) {
        var child, model, _len5, _len6, _n, _o, _ref5, _ref6, _results;
        _ref5 = _this.children;
        for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
          child = _ref5[_n];
          if (_ref6 = child.get('model') || child.model, __indexOf.call(options.previousModels, _ref6) >= 0) {
            child.destroy();
          }
        }
        _results = [];
        for (_o = 0, _len6 = models.length; _o < _len6; _o++) {
          model = models[_o];
          _results.push(insertView(model));
        }
        return _results;
      });
      collection = this.get(path);
      if (collection) {
        return collection.each(insertView);
      }
    },
    view: function($el, view, attrs) {
      var View, data, html, name, newView, viewName;
      viewName = attrs.view || attrs.type;
      View = currentApp.views[capitalize(camelize(viewName))] || BasicView;
      name = attrs.name;
      data = this.get(attrs.data) || view.state;
      html = $el.html();
      $el.empty();
      newView = new View(_.extend({
        html: html,
        view: view,
        name: name,
        data: data
      }, attrs));
      newView.render(true);
      this.subView(newView);
      return $el.append(newView.$el);
    },
    icon: function($el, view, attrs) {},
    "switch": function($el, view, attrs) {},
    log: function($el, view, attrs) {
      var key, out, value;
      out = {};
      for (key in attrs) {
        value = attrs[key];
        out[key] = this.get(value);
      }
      console.info('base-log:', out);
      return $el.remove();
    },
    list: function($el, view) {}
  };

  Base.plugins = {
    view: {
      ractive: function(view, config) {},
      actions: function(view, config) {
        var event, _len5, _n, _results,
          _this = this;
        _results = [];
        for (_n = 0, _len5 = DOMEventList.length; _n < _len5; _n++) {
          event = DOMEventList[_n];
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
      outlets: function(view, config) {
        var boundOutlets,
          _this = this;
        boundOutlets = [];
        return this.on('render', function() {
          var $el, $items, el, eventName, events, key, nodes, outlet, outletEventRe, outletMethodRe, value, _len5, _n, _ref5, _results;
          nodes = (_this.ractive.fragment.items || []).map(function(item) {
            return item.node;
          });
          $items = $('[outlet], [base-outlet]', nodes);
          _results = [];
          for (_n = 0, _len5 = $items.length; _n < _len5; _n++) {
            el = $items[_n];
            $el = $(el);
            outlet = camelize($el.attr('base-outlet') || $el.attr('outlet'));
            if (__indexOf.call(boundOutlets, outlet) < 0) {
              boundOutlets.push(outlet);
              _this.$[outlet] = _this.$("[base-outlet='" + outlet + "'], [outlet='" + outlet + "']");
              events = [];
              outletMethodRe = new RegExp("on(.*)?" + outlet, 'i');
              for (key in _this) {
                value = _this[key];
                if (outletMethodRe.test(key)) {
                  events.push(RegExp.$1.toLowerCase());
                }
              }
              outletEventRe = new RegExp("^([^:]*?):" + outlet, 'i');
              _ref5 = _this._events;
              for (key in _ref5) {
                value = _ref5[key];
                if (outletEventRe.test(key)) {
                  events.push(RegExp.$1.toLowerCase());
                }
              }
              eventName = events.join(' ') + '.delegateEvents';
              _results.push(_this.$el.on(eventName, "[data-outlet=" + outlet + "]", function(e) {
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
    uncapitalize: uncapitalize,
    capitalize: capitalize,
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

  _ref5 = ['Model', 'Router', 'Collection', 'View', 'Stated', 'App', 'List'];
  for (_n = 0, _len5 = _ref5.length; _n < _len5; _n++) {
    className = _ref5[_n];
    _ref6 = ['get', 'set', 'on', 'listenTo', 'off', 'stopListening', 'once', 'listenToOnce', 'trigger', 'clear', 'has', 'invert', 'omit', 'pick', 'sync', 'fetch', 'save', 'changed', 'validate', 'isValid', 'clone', 'hasChanged', 'previous', 'destroy'];
    _fn2 = function(method) {
      return Base[className].prototype['state' + capitalize(method)] = function() {
        var args, _ref7;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        return (_ref7 = this.state)[method].apply(_ref7, args);
      };
    };
    for (_o = 0, _len6 = _ref6.length; _o < _len6; _o++) {
      method = _ref6[_o];
      _fn2(method);
    }
  }

  Base.Controller = Base.View;

  window.Base = Base;

  Base.utils = {
    store: {
      getItem: function(name) {
        return JSON.parse(localStorage.getItem(name));
      },
      setItem: function(name, val) {
        return localStorage.setItem(name, JSON.stringify(val));
      },
      extendItem: function(name, val) {
        return this.lsSetItem(_.extend(this.lsGetItem(name) || {}, val));
      },
      camelize: camelize,
      dasherize: dasherize,
      capitalize: capitalize,
      uncapitalize: uncapitalize,
      deserialize: deserialize
    },
    getFunctionArgNames: function(fn) {
      return fn.toString().match(/\(.*?\)/)[0].replace(/[()\s]/g, '').split(',');
    }
  };

  _ref7 = ['List', 'Object', 'Event'];
  for (_p = 0, _len7 = _ref7.length; _p < _len7; _p++) {
    module = _ref7[_p];
    if ((_base = Base[module].prototype).extend == null) {
      _base.extend = Backbone.Model.prototype.extend;
    }
  }

  Base.define = Base.service;

  Base.require = function(name, appContext) {
    if (appContext == null) {
      appContext = null;
    }
  };

  Base.define = function(name, appContext) {
    if (appContext == null) {
      appContext = null;
    }
  };

  Base._super = function(context, methodName, args) {
    return context.constructor.__super__[methodName].apply(context, args);
  };

  parseRequirements = function(fn) {
    return fn.toString().match(/require\('.*?'\)/g).map(function(item) {
      return item.match(/require\('(.*?)'\)/)[1];
    });
  };

  Base.services.require = function(string) {
    var accessor, camelSplit, moduleName, type, _len8, _q, _ref8;
    camelSplit = string.split(/(?![a-z])(?=[A-Z])/);
    moduleType = _.last(camelSplit).toLowerCase();
    if (__indexOf.call(moduleTypes, moduleType) >= 0) {
      moduleName = string.substring(0, string.length - camelSplit.length);
      accessor = "" + moduleType + "s";
      return currentApp[accessor][moduleName] || Base[accessor][moduleName];
    } else {
      moduleName = string;
      _ref8 = ['app', 'singleton', 'service', 'module', 'object'];
      for (_q = 0, _len8 = _ref8.length; _q < _len8; _q++) {
        type = _ref8[_q];
        module = currentApp[type][moduleName] || Base[type][moduleName];
        if (module) {
          return module;
        }
      }
    }
  };

  if (Base.apps == null) {
    Base.apps = {};
  }

  $(function() {
    return $('[base-app]').each(function(index, el) {
      var App, app, name;
      name = el.getAttribute('base-app');
      App = Base.apps[capitalize(name)];
      app = Base.apps[uncapitalize(name)];
      if (!app || app.el !== el) {
        return new App({
          el: el
        });
      }
    });
  });

}).call(this);
