# TODO:
#   AMD support ( require, define )
#   Unit tests
#   Break into to multiple files


# Setup - - - - - - - - - - - - - - - - - - - - - - - - - -

originalBase = window.Base
currentApp = null
appSurrogate = singletons: {}
window._JST ?= {}
Ractive = window.Ractive or \
  if typeof window.require is 'function' then require 'Ractive'

arr = []
callbackStringSplitter = /\s*[,:()]+\s*/

DOMEventList = 'blur, focus, focusin, focusout, load, resize, scroll,
  unload, click, dblclick, mousedown, mouseup, mousemove, mouseover,
  mouseout, mouseenter, mouseleave, change, select, submit, keydown,
  keypress, keyup, error, touchstart, touchend, touchmove'.split /\s*,\s*/


# IE function.name shim
if not Function::name? and Object.defineProperty?
  Object.defineProperty Function::, 'name',
    get: ->
      funcNameRegex = /function\s+(.{1,})\s*\(/
      results = funcNameRegex.exec @toString()
      if results and results.length > 1 then results[1] else ""

    set: (value) ->


# Base Class - - - - - - - - - - - - - - - - - - - - - - - -

# FIXME: have all other classes call Base.apply() to psuedo-inherit
# from base
class Base
  constructor: ->
    super

Base.noConflict = ->
  window.Base = originalBase
  Base

Base.$ ?= window.$ || window.jQuery || window.Zepto

# Config - - - - - - - - - - - - - - - - - - - - - - - - - -

Base.config =
  debug:
    logModelChanges: false


# View - - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.View extends Backbone.View
  constructor: (@options = {}, attributes) ->
    @name ?= @constructor.name
    @attributes ?= {}
    @attributes['data-view'] ?= dasherize @name.replace /view/i, ''
    @children ?= new Base.List @options.children or []
    @ractive ?= true

    this.parent ?= @options.parent if @options.parent

    @stateOptions = _.defaults @stateOptions or {},
      relations: @relations
      compute: @compute

    @relations ?= {}
    @relations.$state = Base.State
    addState @
    @_bindEvents()

    super

    @_bindAttributes()

    plugins = _.result @, 'plugins'
    for type in ['view', 'all']
      for key, value of Base.plugins[type]
        config = plugins and plugins[key] or Base.defaults[type].plugins[key]
        if config
          value.call @, @, config

    @_bindEventMethods()
    @state.on 'all', (args...) => @trigger args...
    @trigger 'init'

    @$el.data 'view', @
    @_bindEventBubbling()
    @_bindSpecialCallbacks()
    @_bindSpecialEventMethods()

  moduleType: 'view'

  lookup: (keypath) ->
    parent = @
    while parent = parent.parent
      value = parent.get keypath
      return value if value?

  # FIXME: implement by looping up, finding the app for this view, and routing
  # through Base.require
  require: ->

  define: ->

  # FIXME: accept @bindAttributes: '*' to render all non objects into dom
  # FIXME: acces @bindAttributeParirs:
  #   'data-name': 'name', 'data-app-mode': 'mode'
  _bindAttributes: ->
    # FIXME: make plugin
    if @bindAttributes
      for attr in @bindAttributes
        do (attr) =>
          domAttr = dasherize attr
          @$el.attr "data-#{domAttr}", @get attr
          @on "change:#{attr}", (model, value) =>
            @$el.attr "data-#{domAttr}", value

  _bindEventMethods: ->
    for event in DOMEventList
      cb = @["on#{capitalize event}"]
      @$el.on "#{event}.delegateEvents", cb.bind @ if cb

  _getCallback: (str, allowString) ->
    return str if _.isFunction str
    split = _.compact str.split callbackStringSplitter
    return str if not split[1] and allowString
    # FIXME: this may be the correct behavior
    args = ( deserialize value for value in split.slice 1 )
    return @[split[0]].bind @, args...

  _bindEvents: ->
    if @events
      for key, value of @events
        if value and value.split and callbackStringSplitter.test value
          @events[key] = @_getCallback value

    @bind = {} if typeof @bind isnt 'object'

    # Allow event methods for window, document, such as onDocumentKeypress
    for key, value of @
      for item in ['document', 'window']
        prefix = "on#{capitalize item}"
        if key.indexOf(prefix) is 0
          @bind[item] ?= {}
          @bind[item][key.split(prefix)[1].toLowerCase()] = value

    for key, value of @bind
      if typeof value in ['function', 'string']
        @on key, @_getCallback(value).bind @ if value
      else if key in ['document', 'window']
        selector = if key is 'document' then document else window
        $el = $ selector
        for name, callback of value
          $el.on "#{name}.delegateEvents-#{@cid}", \
            @_getCallback(callback).bind @
      else
        recured = (obj) =>
          for eventName, callback of obj
            if typeof callback is 'function'
              @on "#{key}:#{eventName}", @_getCallback(callback).bind @
            else if typeof callback is 'object'
              recurse callback
        for eventName, callback of value
          if callback
            @on "#{key}:#{eventName}", @_getCallback(callback).bind @

  render: (dontRerender) ->
    return if dontRerender and @_hasRendered

    @_hasRendered = true
    @trigger 'before:render'
    @beforeRender() if @beforeRender
    @_initRactive() if @ractive
    @trigger 'render'
    @_bindComponents()
    @afterRender() if @afterRender
    @trigger 'after:render'

  _bindSpecialEventMethods: ->
    @on 'all', (event, args...) =>
      camelized = camelize event
      return if not camelized
      method = @['on' + camelized[0].toUpperCase() + camelized.substring 1]
      if type(args[0]) is 'array' and not args[0].length
        console.log 'special method args', args
      method.apply @, args if method

  # FIXME: maybe add data-action="foo( bar, 'baz', 2, true)"
  # FIXME: add 'foo( bar )', 'foo( "bar", true, 2 )'
  _bindSpecialCallbacks: ->
    for key, value of @events
      if typeof value is 'string'
        split = value.split ':'
        if split[1]
          switch spit[0]
            when 'set'
              @events[key] = => @set split[1].trim(), @get split[2].trim()
            when 'toggle'
              @events[key] = => @toggle split[1]

  _bindComponents: ->
    for key, value of Base.components
      # items = @ractive.fragment.items or []
      @$el.find("x-#{key}, base-#{key}").each (index, el) =>
        $el = $ el
        attrs = {}
        for attr in el.attributes
          attrs[camelize attr.name] = attr.value
        value.call @, $el, @, attrs

  # FIXME: move this to helper fn
  # FIXME: change to 'parseExpression'
  _parseObjectGetter: (str) ->
    # TODO:
    #   foo ( bar )             # => whatever @foo @get bar resolves to
    #   'bar'                   # => 'hi'
    #   list[0].foo === 'hi'    # => true
    str

  _parseTemplate: ->
    # TODO

  _parseDOM: ->
    parse = (el) ->
      attrs = {}
      # FIXME: detect {{yo}} in text / textnodes as well
      # {{#if}} would be good too
      for attr in el.attributes
        name = attr.name
        value = attr.value
        arr = attrs[name] = []
        if /\{\{.*\}\}/.test value
          split = arr.split /\{\{|\}\}/
          for item, index in split
            odd = index % 2
            if odd
              props = _.compact item.split /\s+|[\(\)+=-><%\/&!^\|]+/
              arr.push
                # FIXME: maybe don't create function here in case want
                # to use compiled templates as separate build task
                # thenagain may be good to compile functions on build?
                fn: new Function "return #{item}"
                props: props
            else
              arr.push item

        attrs: attrs
        children: ( parse child for child in el.chidren )

    res = parse @el

  _initRactive: ->
    # FIXME: allow for global configuration of ractive on Base
    if @options and @options.ractive or @ractive
      filters = _.clone Base.filters
      for key, value of filters
        filters[key] = value.bind @ if value and value.bind

      templateName = "src/templates/views/#{dasherize @name}.html"
      template = @template or _.clone(_JST[templateName]) or @$el.html()
      @ractive = new Ractive
        el: @el
        template: template
        data: _.extend @toJSON(), $view: @, $filter: Base.filters, $base: Base

      for key, val of @
        if typeof val is 'function' and key[0] isnt '_'
          do (key, val) =>
            @ractive.on key, (event, argString = '') =>
              return if key is 'set' and not event.original

              argString = '' if typeof argString isnt 'string'
              stringRe = /^(?:'(.*?)'|"(.*?)")$/
              argArray = _.compact argString.split /\s*[:,]+\s*/
              args = argArray.map (arg, index) =>
                arg = arg.trim()

                isString = stringRe.test arg
                return RegExp.$1 or RegExp.$2 if isString

                deserialized = deserialize arg
                return deserialized if typeof deserialized isnt 'string'

                if arg is '.'
                  keypath = event.keyPath
                else if arg and arg[0] is '.'
                  keypath = "#{event.keyPath}#{arg}"
                else
                  keyPath = arg

                @get arg

              args.push event.original
              val.apply @, args

      adaptor = Ractive.adaptors.backboneAssociatedModel
      @ractive.bind adaptor @state
      @ractive.bind adaptor currentApp.state, '$app'

      if currentApp.router
        @ractive.bind adaptor currentApp.router.state, '$router'

      parents = []
      parent = @
      parents.push parent while parent = parent.parent
      for parent in parents
        parentName = uncapitalize parent.name
        @ractive.bind adaptor parent.state, "$parent.#{parentName}"

      # parents = []
      # parentsObj = {}
      # parent = @
      # parents.push parent while parent = parent.parent
      # _.extend parentsObj, parents.reverse()...

      # @on 'all', (event, model, args...) ->
      #   split = event.split ':'
      #   return unless split[0] is 'parent'
      #   unless split[1] in ['change', 'add', 'remove', 'reset'] and split[2]
      #     return
      #   for parent in parents
      #     if parent.state is model
      #   # FIXME: will only work if using deep model for 'parents' property
      #   @ractive.set "$parent.#{split[2]}", @get split[2]


      for key, val of currentApp.singletons
        if val instanceof Base.Model or val instanceof Base.Collection
          @ractive.bind adaptor val, "$#{key}"

  _bindEventBubbling: ->
    @on 'all', (args...) =>
      @broadcast args...
      @emit args...

  trigger: (eventName, args...) ->
    if args[0] not instanceof Base.Event
      args.unshift new Base.Event name: eventName, target: @, currentTarget: @
    else
      args[0].currentTarget = @

    super

  # FIXME: maybe add a similar set method as well?
  get: (path) ->
    return if not path
    subject = @state
    truePath = path
    if path.indexOf('$') is 0
      truePath = path.split('.').slice(1).join('.')
      if path.indexOf('$app.') is 0
        subject = app
      else
        subject = currentApp.singletons[path.split('.')[0].substring 1]

    subject.get truePath

  subView: (args...) ->
    if not args[1]
      if typeof args[0] is 'string'
        return @childView args[0]
      else
        view = args[0]
    else
      view = args[1]
      name = args[0]


    unless view
      console.warn 'No view passed to subView', args, arguments
      return

    if view not instanceof Base.View
      view = new view

    view.__viewName__ = name

    view.parent = @
    @children.push view
    view

  insertView: (selector, view) ->
    if not view
      view = selector
      selector = null

    @subView view

    if selector
      @$(selector).append view.$el
    else
      @$el.append view.$el
    @

  parentView: (arg, findOne) ->
    @parentViews arg, findOne

  findView: (arg) ->
    @findViews arg, true

  childView: (arg) ->
    @childViews arg, true

  destroyView: (arg, all) ->
    child = if all then @findView arg else @childView arg
    child.destroy() if child
    child

  destroyViews: (arg, all) ->
    children = if all then @findViews arg else @childViews arg
    child.destroy() for child in children
    children

  childViews: (arg, findOne) ->
    @findViews arg, findOne, true

  parentViews: (arg, findOne) ->
    res = []
    if not arg
      if findOne then return @parent else res.push @parent
    else
      parent = @
      while parent = parent.parent
        if parent.is and parent.is arg
          if findOne then return parent else res.push parent
    res

  findViews: (arg, findOne, shallow) ->
    views = []
    foundView = undefined

    recurse = (view) ->
      for childView in view.children
        if childView.is(arg)
          views.push childView
          if findOne
            foundView = childView
            break

        recurse childView if childView and not shallow

    recurse @
    if findOne then foundView else views

  is: (arg) ->
    if not arg or arg is @ # or @$el.is arg
      return true

    switch typeof arg
      when 'string'
        strip = (str) -> str.toLowerCase().replace /view$/i, ''
        str = strip arg
        name = @__viewName__
        strip(@name or "") is str or strip(name or '') is str
      when 'function'
        !!arg @
      else
        for key, value of arg
          thisKey = @get key
          if not thisKey?
            thisKey = @[key]
          if value isnt thisKey
            return false
        return true

  destroy: ->
    if @ractive and @ractive.off
      ### Ractive.off is throwing errors ###
      # @ractive.off()
      @ractive.teardown()
      @ractive.unbind()

    Base.$([document, window]).off ".delegateEvents-#{@cid}"
    @state.off()
    @state.stopListening()
    @state.cleanup() if @state.cleanup()
    @trigger 'destroy'
    @cleanup() if @cleanup
    @$el.removeData('view')
    @$el.off()
    @off()
    @undelegateEvents()
    @remove()

    if @parent
      @parent.children.splice @parent.children.indexOf(@), 1

  # FIXME: maybe move this to setHandler instead of using bb events
  request: (eventName, args...) ->
    parent = @
    while parent = parent.parent
      eventObj = parent["onRequest#{capitalize eventName}"] or \
        _.last parent._events["request:#{eventName}"]

      if eventObj
        event = new Base.Event type: 'request', target: @
        callback = eventObj.callback or eventObj
        return callback.call (eventObj.ctx or parent), event, args...

  # FIXME: have a broadcastAll and emitAll config
  emit: (eventName, args...) ->
    parent = @parent
    if parent
      if /^(child:|request:)/.test eventName
        event = args[0]
        event ?= new Base.Event type: eventName, target: @
        if not event.propagationStopped
          event.currentTarget = parent
          # console.log 'trigger args', arguments
          parent.trigger arguments...
      else if not /^(app:|parent:|firstChild:|firstParent:)/.test eventName
        name = uncapitalize @name
        event = new Base.Event name: eventName, target: @, currentTarget: parent
        for newEvent in ["child:#{eventName}", "child:#{name}:#{eventName}"
          "firstChild:#{eventName}", "firstChild:#{name}:#{eventName}"]
          # console.log 'trigger args', [event].concat args
          parent.trigger newEvent, event, args...

  broadcast: (eventName, args...) ->
    if @children
      if /^(parent:|app:)/.test eventName
        event = args[0] or new Base.Event type: eventName, target: @
        if not event.propagationStopped
          event.currentTarget = child
          for child in @children
            return if event.propagationStopped
            # console.log 'trigger args', arguments
            child.trigger arguments...
      else if not /^(child:|request:|firstParent:|firstChild:)/.test eventName
        name = uncapitalize @name
        event = new Base.Event name: eventName, target: @
        for child in @children
          event.currentTarget = child
          for newEvent in ["parent:#{eventName}", "parent:#{name}:#{eventName}"
            "firstParent:#{eventName}", "firstParent:#{name}:#{eventName}"]
            return if event.propagationStopped
            # console.log 'trigger args', [event].concat args
            child.trigger newEvent, event, args...




# App - - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.App extends Base.View
  constructor: (@options) ->
    currentApp = @
    for key, value of appSurrogate
      currentApp[key] ?= value
    appSurrogate = null

    @template ?= _JST["src/templates/app.html"]

    $win = $ window
    $win.on "resize.appResize-#{@cid}", _.debounce =>
      @set
        windowWidth: $win.width(),
        windowHeight: $win.height(),
        documentWidth: document.width,
        documentHeight: document.height
      , 50

    super

  # FIXME: implement based off Base.require
  require: ->

  destroy: ->
    Base.$(window).off "resize.appResize-#{@cid}"
    super

  # FIXME: implement based off Base.define
  define: ->

  init: (options = @options) ->
    @trigger 'init', options

  broadcast: (eventName, args...) ->
    if @children
      if not /^(child:|request:|firstParent:|firstChild:)/.test eventName
        for child in @children
          child.trigger "app:#{eventName}",  args...

  moduleType: 'app'


# Module Loading - - - - - - - - - - - - - - - - - - - - - -

moduleTypes = ['model', 'view', 'singleton', 'collection', 'app',
  'module', 'component', 'service', 'filter']

prepareModule = (module) ->
  if typeof module isnt 'function'
    fn = module.pop()
    fn.dependencies = module
  else
    fn = module
  fn

getModuleArgs = (depStrings) ->
  depStrings.map (item) ->
    split = item.split '.'
    if split[1]
      return Base[split[0]] split[1]
    for type in moduleTypes
      if item.lastIndexOf(capitalize type) + type.length is item.length
        return Base[item] type.substring 0, type.length - item.length - 1

invokeModule = (module) ->
  if typeof module is 'function'
    invokeWithArgs module, getModuleArgs module.dependencies or []

invokeWithArgs = (constructor, args) ->
  Func = -> constructor args...
  Func.prototype = constructor.prototype
  new Func

moduleQueue = []

for subject in [ Base.App.prototype, Base ]
  do (subject) ->
    for type in moduleTypes
      do (type) ->
        # FIXME: add fn.name = name where module names are defined

        subject["#{type}s"] ?= {}
        subject[type] = (name, module) ->
          if typeof name is 'string' and not module
            return subject[type][capitalize name]
          else if name and module
            module = prepareModule module
            module.prototype.name ?= name if module.prototype
            module.name ?= name
            subject[type][capitalize name] = module
          else
            module = name
            module = prepareModule module
            name = module.name or module.prototype.name
            throw new Error 'Modules must have a name'
            subject[type][capitalize module.prototype.name] = module

          if typeof module is 'function'
            module.dependencies ?= Base.utils.getFunctionArgNames module

          if module.dependencies and module.dependencies.length
            moduleQueue.push
              name: name
              dependencies: _.clone module.dependencies
              module: module

          indexesToSplice = []
          for item, index in moduleQueue
            deps = item.dependencies
            if "#{item.name}{capitalize type}" in deps
              index = deps.indexOf "#{item.name}{capitalize type}"
              deps.splice index, 1
              if not deps.length
                indexesToSplice.push index
                invokeModule module

          modifier = 0
          for index in indexesToSplice
            moduleQueue.splice index - modifier++, 1


# Model - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Model extends Backbone.AssociatedModel
  constructor: (defaults = {}, options = {}) ->
    @name ?= @constructor.name

    unless @ instanceof Base.State
      @relations ?= {}
      @relations.$state = Base.State

    @_mapRelations _.extend {}, @relations, options.relations

    super

    for key, value of _.extend options.compute or {}, @compute
      @computeProperty key, value

    addState @

    if Base.config.debug.logModelChanges
      @on 'change', =>
        try
          # FIXME: circular structure error
          console.info JSON.stringify @toJSON(), null, 2
        catch e
          console.info e

  destroy: ->
    @off()
    @stopListening()
    super

  blacklist: []

  # FIXME: do recursive, and auto add
  # FIXME: allow
  #   relations:
  #      foo: Base.Model
  # FIXME: maybe change this to be defaults
  #    each @defaults if __super__ -> backbone relations.push this, default = {}
  _mapRelations: (relations = @relations) ->
    @defaults ?= {}

    if relations and not _.isArray(relations)
      newRelations = []
      for key, value of relations
        isCollection = false
        _super = value
        while _super = _super.__super__
          if _super and _super.initialize is Backbone.Collection::initialize
            isCollection = true

        # @defaults[key] ?= if isCollection then [] else {}

        newRelations.push
          key: key
          type: if isCollection then 'Many' else 'One'
          collectionType: value if isCollection
          relatedModel: if isCollection then value::model else value

      @relations = newRelations

  toJSON: (withBlacklist) ->
    json = Backbone.AssociatedModel::toJSON.call @, withBlacklist
    if withBlacklist then json else _.omit json, @blacklist

  computeProperty: (name, args) ->
    args = _.clone args
    switch type args
      when "object" then obj = args
      when "array"  then obj = fn: args.pop(), triggers: args

    @blacklist.push name

    # FIXME: don't parse all items on every update
    # should save contexts and property getter strings
    callback = =>
      values = obj.triggers.map (trigger) => @get trigger
      result = obj.fn.apply @, values
      @set name, result

    for trigger in obj.triggers
      @on "change:#{trigger}", callback
      split = trigger.split '.'

      # for item, index in split
      #   name = (split.slice 0, split.length - index).join '.'
      #   @on "change:#{name}", callback

    try
      callback()

  toggle: (attr) ->
    @set attr, not @get attr

  moduleType: 'model'


# State - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.State extends Base.Model
  constructor: (attributes, options = {}, context) ->
    @relations ?= {}
    if context and context.relations
      for key, value of context.relations
        @relations[key] = value

    @compute ?= options.compute

    super attributes, options
    @parent = @parents[0] or options.parent or context or attributes.parent
    @name ?= lowercase @constructor.name

    if @parent
      @on 'all', -> (event, args...) =>
        @parent.trigger 'state:' + event, args...


# Object - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Object
  constructor: ->

_.extend Base.Object::, Backbone.Events


# Stated  - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Stated extends Base.Object
  constructor: ->
    @addState @
    super


# Router - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Router extends Backbone.Router
  constructor: ->
    @name ?= @constructor.name
    @stateOptions = _.defaults @stateOptions or {},
      relations: @relations
      compute: @compute

    addState @
    super

    @set 'params', {} if not @get 'params'

    currentApp.router = @
    @on 'route', (router, route, params) =>
      @set 'route', route.join '/'
      @set 'path', route

      queryParams = {}
      split = (location.href.split('?')[1] or '').split /[&=]/
      for item, index in split
        continue if index % 2 or not item
        queryParams[decodeURI item] = decodeURI split[index + 1]

      @set 'params', params
      @set 'queryParams', queryParams

  setParams: (obj, reset) ->
    params = if reset then {} else @get 'params'
    _.extend params, obj
    @set 'params', obj

  relations:
    params: Base.Model

  go: (route) ->
    @navigate route, true

  destroy: ->
    @off()
    @stopListening()

  moduleType: 'router'


# Collection - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Collection extends Backbone.Collection
  constructor: ->
    super
    @name ?= @constructor.name
    addState @

  destroy: ->
    @off()
    @stopListening()

  model: Base.Model

  moduleType: 'collection'


# Singleton - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Singleton extends Base.Model
  constructor: ->
    super

    (currentApp or appSurrogate)[uncapitalize @name] ?= @
    (currentApp or appSurrogate).singletons[uncapitalize @name] = @

    @on 'all', (eventName, args...) =>
      if currentApp
        currentApp.trigger "#{uncapitalize @name}:#{eventName}", args...


# List - - - - - - - - - - - - - - - - - - - - - - - - - - -

# FIXME: this is a bit buggy
class Base.List
  constructor: (items, options = {}) ->
    @reset items, options
    if not options.noState
      addState @
    @initialize arguments... if _.isFunction @initialize

  unshift: (items...) -> @add item, at: 0 for item in items.reverse()
  push: (items...) -> @add item, at: @length for item in items
  shift: -> @remove null, at: 0
  pop: -> @remove null, at: @length - 1
  empty: -> @splice 0, Infinity

  eventNamespace: 'listItem:'
  bubbleEvents: true

  reset: (items, options = {}) ->
    @splice @length, @length
    @push items...
    @trigger 'reset', @, options unless options.silent

  add: (item, options = {}) ->
    at = options.at ?= @length

    # Bubble events like backbone does
    if @bubbleEvents and item and _.isFunction item.on
      @listenTo item, 'all', (eventName, args...) =>
        if @bubbleEvents
          @trigger "#{@eventNamespace}#{@eventName}", args...

    # Allow models of any type (e.g. a model here can be a view!)
    item = new @model item if @model

    @splice at, null, item
    @trigger 'add', item, @, options unless options.silent

  remove: (item, options = {}) ->
    index = options.at or @indexOf item
    item ?= @[index]
    @splice index, 1
    @trigger 'remove', item, @, options unless options.silent
    item
    @stopListening item

_.extend Base.List::, Backbone.Events

for method in ['splice', 'indexOf', 'lastIndexOf', 'join', 'reverse', 'sort',
  'valueOf', 'map', 'forEach', 'every', 'reduce', 'reduceRight', 'filter',
  'some']
  Base.List::[method] = arr[method] unless Base.List::[method]

for method in ['each', 'contains', 'find', 'filter', 'reject', 'contains',
  'max', 'min', 'sortBy', 'groupBy', 'sortedIndex', 'shuffle', 'toArray', 'size'
  'first', 'last', 'initial', 'rest', 'without', 'isEmpty', 'chain', 'where',
  'findWhere', 'clone', 'pluck', 'invoke']
  Base.List::[method] = _[method] unless Base.List::[method]


# Event - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Event
  constructor: (@options) ->
    _.extend @, @options
    @currentTarget ?= @target

  preventDefault: ->
    @defaultPrevented = true

  stopPropagation: ->
    @propagationStopped = true


# Get, set syntax sugar for Base.View and Base.Router - - -

for moduleType in ['View', 'Router']
  for method in ['get', 'set', 'toJSON', 'has', 'unset', 'escape', 'changed',
    'clone', 'keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'clear',
    'toggle']
    do (method) ->
      Base[moduleType]::[method] ?= (args...) ->
        @state[method] args...


# Basic View (for component helpers) - - - - - - - - - - - -

class BasicView extends Base.View
  constructor: (options = {}) ->
    @name ?= options.name or \
      if options.model and options.model.name then options.model.name + ':view'

    view = options.view
    html = options.html
    data = options.data

    @ractive = !!view.ractive

    if options.path
      @relations =
        model: view.get(options.path).model

    @template ?= html
    super

    @set 'model', options.model if options.model
    @set 'html', html if html

    # if @ractive
      @render()
    # else
      # @$el.html html

    # FIXME: this isn't working
    if data
      unless data.toJSON
        @set data
      else
        @set data.toJSON()
        @listenTo data, 'all', (eventName) =>
          split = eventName.split ':'
          eventType = split[0]
          keypath = split[1]

          if eventType is 'change' and keypath
            @set keyPath, data.get keyPath


# Helpers - - - - - - - - - - - - - - - - - - - - - - - - -

type = (obj) ->
  ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()

dasherize = (str) ->
  str
    .replace(/::/g, '/')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/_/g, '-')
    .toLowerCase()

camelize = (str) ->
  str
    .replace /[^\d\w]+(.)?/g, (match, chr) ->
      if chr then chr.toUpperCase() else ''

deserialize = (value) ->
  try
    unless value                 then value
    else if value is 'true'      then true
    else if value is 'false'     then false
    else if value is 'null'      then null
    else unless isNaN            then Number value
    else if /^[\[\{]/.test value then JSON.parse value
    else value
  catch e
    value

capitalize = (str) ->
  if str then ( str[0].toUpperCase() + str.substring 1 ) else ''

addState = (obj) ->
  if obj not instanceof Base.State
    stateAttributes = obj.state or {}
    obj.blacklist ?= []
    obj.blacklist.push '$state'

    if obj instanceof Base.Model
      obj.set '$state', _.defaults stateAttributes, obj.stateDefaults
      state = obj.state = obj.get '$state'
    else
      stateAttributes = _.defaults stateAttributes, obj.stateDefaults \
        or obj.defaults

      state = obj.state = new Base.State stateAttributes, obj.stateOptions, obj
      state.associations ?= []
      state.associations.push
        type: 'one'
        key: '$parent'
        relatedModel: Base.State

      # FIXME: this could get really slow with deeply nested views
      # and copying them over
      if @parent and @parent.state
        state.set '$parent', @parent.state
        @listenTo @parent.state, 'all', (eventName, args) =>
          split = eventName.split ':'
          if split[0] is 'change' and split[1]
            @set "$parent.#{split[1]}", @parent.state.get split[1]

    state.set '$state', state if obj instanceof Base.View
    state.on 'all', (eventName, args...) =>
      split = eventName.split ':'
      if split[0] is 'change' and split[1]
        obj.trigger "change:$state.#{split[1]}", args...

uncapitalize = (str) ->
  if str then ( str[0].toLowerCase() + str.substring 1 ) else ''


# Components - - - - - - - - - - - - - - - - - - - - - - - -

Base.components =
  collection: ($el, view, attrs = {}) ->
    path = attrs.path or attrs.collection
    name = attrs.name
    View = currentApp.views[ capitalize attrs.view ] or BasicView
    html = $el.html()
    $el.empty()

    insertView = (model) =>
      newView = new View _.extend { data: model, html: html, view: view, \
          parent: @,  name: name, path: path, model: model }, attrs

      newView.model ?= model
      newView.set 'model', model

      @subView newView
      newView.render true

      collectionViews.push newView

      $el.append newView.$el

    collectionViews = []

    bindCollection = (collection) =>
      return if not collection
      collection.each insertView
      @listenTo collection, 'add', insertView
      @listenTo collection, 'remove', (model) =>
        @childView( (view) => view.model is model ).destroy()

      @listenTo collection, 'reset', (models, options) =>
        view.destroy() for view in collectionViews
        collectionViews = []
        models.each insertView

    collection = @get path
    if collection
      bindCollection collection
    else
      @once "change:#{path}", => bindCollection @get path


  view: ($el, view, attrs) ->
    viewName = attrs.view or attrs.type
    View = currentApp.views[ capitalize camelize viewName ] or BasicView
    name = attrs.name
    # FIXME: reactie templates won't work here beacuse no relations
    data = @get(attrs.data) or view.state

    html = $el.html()
    $el.empty()

    newView = new View _.extend {
      html: html
      view: view
      name: name
      data: data
    }, attrs

    newView.render true
    @subView newView
    $el.append newView.$el

  icon: ($el, view, attrs) ->

  switch: ($el, view, attrs) ->

  log: ($el, view, attrs) ->
    out = {}
    for key, value of attrs
      out[key] = @get value
    console.info 'base-log:', out
    $el.remove()

  list: ($el, view) ->
    # TODO:
    #   Maybe provide a way to add dynamic lists in non-collection lists
    #   <list view="tag"></list>
    #   <list> hi, <view view="tag"></view>, yo yo </list>
    #   Maybe collection subclasses list?


# Plugins - - - - - - - - - - - - - - - - - - - - - - - - -

Base.plugins =
  view:
    ractive: (view, config) ->

    actions: (view, config) ->
      for event in DOMEventList
        do (event) =>
          callback = (e) =>
            $target = $ e.currentTarget
            action = $target.attr("action-#{event}") \
              or $target.attr "data-action-#{event}"

            cb = @_getCallback action
            cb.call @

          @$el.on event, "[data-action-#{event}], [action-#{event}]", \
            _.debounce callback, 1, true

    inherit: (view, config) ->
      return unless @inherit

      for path in @inherit
        do (path) =>
          @set path, @lookup path
          @on "parent:change:#{path}", (event, model, value) => @set path, value

      null

    map: (view, config) ->
      return unless @map

      for key, val of @map
        do (key, val) =>
          @set key, @lookup val
          # FIXME: if key is 'foo.bar' listen for changes on 'foo' too
          @on "parent:change:#{val}", (event, model, value) => @set key, value

      null

    outlets: (view, config) ->
      boundOutlets = []

      # FIXME: this methodology is more efficient than below
      # for key, value of @
      #   return if value.indexOf('on') isnt 0
      #   camelSplit = key.split string.split /(?![a-z])(?=[A-Z])/
      #   eventName = (camelSplit[1] or '').toLowerCase()
      #   return if not eventName
      #   outletName = uncapitalize
      #   if eventName
      #     @$el.on "#{camelSplit}.delegateEvents"

      # FIXME: this may not work
      # FIXME: this may have performance issues
      @on 'render', =>
        # FIXME: maybe don't use ractive nodes
        nodes = ( @ractive.fragment.items or []).map (item) -> item.node
        $items = $ '[outlet], [base-outlet]', nodes

        for el in $items
          $el = $ el
          outlets = camelize $el.attr('base-outlet') or $el.attr 'outlet'
          outletsArr = outlets.split /\s/

          for outlet in outlets
            do (outlet) =>
              unless outlet in boundOutlets
                boundOutlets.push outlet
                @$[outlet] = \
                  @$ "[base-outlet~='#{outlet}'], [outlet~='#{outlet}']"
                events = []

                outletMethodRe = new RegExp "on(.*)?#{outlet}", 'i'
                for key, value of @
                  if outletMethodRe.test key
                    events.push RegExp.$1.toLowerCase()

                # FIXME: this won't work for parents and children listening
                # for 'child:click:foobar' or 'parent:click:foobar'
                # loop through parents = look for child:event:outlet and
                # child:name:event:outlet
                # or onChildClickFoobar: ->
                outletEventRe = new RegExp "^([^:]*?):#{outlet}", 'i'
                for key, value of @_events
                  if outletEventRe.test key
                    events.push RegExp.$1.toLowerCase()

                # parent = @
                # while parent = parent.parent
                #   for key, value of parent._events
                #     for prefix in ['child:', "child:#{uncapitalize @name}"]

                eventName = events.join(' ') + '.delegateEvents'
                @$el.on eventName, "[data-outlet=#{outlet}]", (e) =>
                  @trigger [ event.type, outlet ].join(':'), e

  all:
    state: ->

    localStore: (module, config) ->
      # FIXME: create a localStorage manager so all under one namespace,
      # e.g. 'base' or 'plugins'
      store = Base.utils.store
      name = config.id or @name # Maybe prefix names with module name
      attrs = config.attributes
      omit = config.omit

      getStore = (fullStateStore) =>
        currentStore = store.getItem 'stateStore' or {}
        thisStore = currentStore[name] ?= {}
        if fullStateStore then currentStore else thisStore

      setStore = =>
        currentStore = getStore true
        data = @toJSON()
        if attrs then data = _.pick data, attrs
        if omit  then data = _.omit attrs, data
        _.extend currentStore[name], data
        store.setItem 'stateStore', currentStore

      @set getStore()
      # FIXME: this may have performance issues on some browsers, mauy need to
      # use window unload or an interval instead
      @on 'change', setStore


Base.plugins.all.localStore.clear = \
Base.plugins.all.localStore.clearItem = (id) ->
  store = Base.utils.store
  newStore = if id then store.getItem 'stateStore' or {} else {}
  if id then newStore[id] = {}
  store.setItem 'stateStore', newStore



# Filters - - - - - - - - - - - - - - - - - - - - - - - - -

Base.filters =
  uncapitalize: uncapitalize
  capitalize: capitalize
  uppercase: (str) -> str.toUpperCase()
  lowercase: (str) -> str.toLowerCase()
  json: (obj) -> JSON.stringify obj, null, 2
  orderBy: (arr, property, reverse) ->
    arr = arr.sort (item) -> item[property]
    if reverse then arr.reverse() else arr


# PLugin defaults - - - - - - - - - - - - - - - - - - - - -

Base.defaults =
  all:
    plugins:
      state: true

  view:
    plugins:
      actions: false # FIXME: this is a bit buggy
      outlets: true
      filters: true
      ractive: true
      components: true
      manage: true
      inherit: true
      map: true
      eventSugar: true # onChangeActive: -> 'foobar'

  model:
    plugins: {}

  router:
    plugins: {}

  collection:
    plugins: {}


# Setup - - - - - - - - - - - - - - - - - - - - - - - - - -

for className in ['Model', 'Router', 'Collection', 'View', 'Stated', 'App',
  'List']
  for method in ['get', 'set', 'on', 'listenTo', 'off', 'stopListening', 'once'
    'listenToOnce', 'trigger', 'clear', 'has', 'invert', 'omit', 'pick', 'sync'
    'fetch', 'save', 'changed', 'validate', 'isValid', 'clone', 'hasChanged'
    'previous', 'destroy']
    do (method) ->
      Base[className]::['state' + capitalize method] = (args...) ->
        @state[method] args...


Base.Controller = Base.View
window.Base = Base

Base.utils =
  # FIXME: move to plugin (service?)
  store:
    getItem: (name) -> JSON.parse localStorage.getItem name
    setItem: (name, val) -> localStorage.setItem name, JSON.stringify val
    extendItem: (name, val) -> @lsSetItem _.extend @lsGetItem(name) or {}, val

  camelize: camelize
  dasherize: dasherize
  capitalize: capitalize
  uncapitalize: uncapitalize
  deserialize: deserialize
  types: type

  # get the arg names for a function
  # e.g. function (foo, bar) {} => ['foo', 'bar']
  getFunctionArgNames: (fn) ->
    fn.toString().match(/\(.*?\)/)[0].replace(/[()\s]/g,'').split ','

for module in ['List', 'Object', 'Event']
  Base[module]::extend ?= Backbone.Model::extend

# FIXME: make define pic apart the name
# e.g. define 'PicView' = Base.view 'Pic'
Base.define = Base.service

# FIXME: implement
Base.require = (name, appContext = null) ->

# FIXME: implement
Base.define = (name, appContext = null) ->

Base._super = (context, methodName, args) ->
  context.constructor.__super__[methodName].apply context, args

# Looks through a function for require('foo')
parseRequirements = (fn) ->
  fn
    .toString()
    # FIXME: look for ([a-zA-Z]*?).require\('.*?'\)/g instead
    .match(/require\('.*?'\)/g)
    .map (item) -> item.match(/require\('(.*?)'\)/)[1]

# TODO
# Maybe services don't need a namespace
Base.services.require = (string) ->
  camelSplit = string.split /(?![a-z])(?=[A-Z])/
  moduleType = _.last(camelSplit).toLowerCase()

  if moduleType in moduleTypes
    moduleName = string.substring 0, string.length - camelSplit.length
    accessor = "#{moduleType}s"
    return currentApp[accessor][moduleName] or Base[accessor][moduleName]
  else
    moduleName = string
    for type in ['app', 'singleton', 'service', 'module', 'object']
      module = currentApp[type][moduleName] or Base[type][moduleName]
      return module if module



# Initialize - - - - - - - - - - - - - - - - - - - - - - - -
Base.apps ?= {}

# FIXME: support app prototypes vs active apps
Base.$ ->

  Base.$('[base-app]').each (index, el) ->
    name = el.getAttribute 'base-app'
    App = Base.apps[capitalize name]
    app = Base.apps[uncapitalize name]
    # FIXME: doesn't work for multiple base apps on one page
    if not app or app.el isnt el
      new App el: el

