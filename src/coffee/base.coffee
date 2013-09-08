###
  TODO: AMD support ( require, define )
  Module support ( Base.module('foo', ->) )
###


# Setup - - - - - - - - - - - - - - - - - - - - - - - - - -

originalBase = window.Base
currentApp = null
appSurrogate = {}
window._JST ?= {}

arr = []
callbackStringSplitter = /\s*[,:()]+\s*/

DOMEventList = 'blur, focus, focusin, focusout, load, resize, scroll,
  unload, click, dblclick, mousedown, mouseup, mousemove, mouseover,
  mouseout, mouseenter, mouseleave, change, select, submit, keydown,
  keypress, keyup, error, touchstart, touchend, touchmove'.split /\s*,\s*/

# Base Class - - - - - - - - - - - - - - - - - - - - - - - -

# FIXME: have all other classes call Base.apply() to psuedo-inherit
# from base
class Base
  constructor: ->
    super

_.extend Base::, Backbone.Events

Base.noConflict = ->
  window.Base = originalBase
  Base


# Config - - - - - - - - - - - - - - - - - - - - - - - - - -

Base.config =
  debug:
    logModelChanges: false


# View - - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.View extends Backbone.View
  constructor: (@options = {}, attributes) ->
    @name ?= @constructor.name
    @attributes ?= {}
    @attributes['data-view'] ?= @name.replace(/view/i, '').toLowerCase()
    @children ?= new Base.List @options.children or []

    @stateOptions = _.defaults @stateOptions or {},
      relations: @relations
      compute: @compute

    @relations ?= {}
    @relations.$state = Base.State
    addState @
    @_bindEvents()

    super

    @_bindAttributes()

    for type in ['view', 'all']
      for key, value of Base.plugins[type]
        config = @plugins and @plugins[key] or Base.defaults.view.plugins[key] \
          or Base.defaults.all.plugins[key]
        if config
          value.call @, @, config

    @_bindEventMethods()
    @state.on 'all', (args...) => @trigger.apply @, args
    @trigger 'init'

    @$el.data 'view', @
    @_bindEventBubbling()
    @_bindSpecialCallbacks()
    @_bindSpecialEventMethods()

  moduleType: 'view'

  # FIXME: accept @bindAttributes: '*' to render all non objects into dom
  # FIXME: acces @bindAttributeParirs:
  #   'data-name': 'name', 'data-app-mode': 'mode'
  _bindAttributes: ->
    # FIXME: make plugin
    if @bindAttributes
      for attr in @bindAttributes
        do (attr) =>
          @$el.attr "data-#{attr}", @get attr
          @on "change:#{attr}", (model, value) =>
            @$el.attr "data-#{attr}", value

  _bindEventMethods: ->
    for event in DOMEventList
      cb = @["on#{capitalize event}"]
      if cb
        @$el.on "#{event}.delegateEvents", cb.bind @

  _getCallback: (str, allowString) ->
    return str if _.isFunction str
    split = _.compact str.split callbackStringSplitter
    return str if not split[1] and allowString
    args = ( $.zepto.deserializeValue(value) for value in split.slice 1 )
    return @[split[0]].bind @, args

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

  render: ->
    @trigger 'before:render'
    @beforeRender() if @beforeRender
    @_initRactive() if @ractive
    @trigger 'render'
    @_bindComponents()
    @afterRender() if @afterRender
    @trigger 'after:render'

  _bindSpecialEventMethods: ->
    @on 'all', (event, args...) =>
      camelized = $.camelCase event
      return if not camelized
      method = @['on' + camelized[0].toUpperCase() + camelized.substring 1]
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
      items = @ractive.fragment.items or []
      @$("x-#{key}", items.map (item) -> item.node).each (index, el) =>
        $el = $ el
        attrs = {}
        for attr in el.attributes
          attrs[attr.name] = attr.value

        value.call @, $el, @, attrs

  # FIXME: move this to helper fn
  _parseObjectGetter: (str) ->
    # TODO:
    #   foo ( bar )
    #   'bar'
    #   list[0].foo === 'hi'
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
    if @options.ractive or @ractive
      filters = _.clone Base.filters
      for key, value of filters
        filters[key] = value.bind @ if value and value.bind

      templateName = "src/templates/views/#{$.dasherize @name}.html"
      template = @template or _.clone(_JST[templateName]) or ''
      @ractive = new Ractive
        el: @el
        template: template
        data: _.extend @.toJSON(), $view: @, $filter: Base.filters, $base: Base

      for key, val of @
        if typeof val is 'function' and key[0] isnt '_'
          do (key, val) =>
            @ractive.on key, (event, argString = '') =>
              argString = '' if typeof argString isnt 'string'
              val.apply @, argString.split(':').map (arg, index) =>
                $.zepto.deserializeValue arg.trim()

      adaptor = Ractive.adaptors.backboneAssociatedModel
      @ractive.bind adaptor @state
      @ractive.bind adaptor currentApp.state, '$app'

      for key, val of app.singletons
        if val instanceof Base.Model or val instanceof Base.Collection
          @ractive.bind adaptor val, "$#{key}"

  _bindEventBubbling: ->
    @on 'all', (args...) =>
      @broadcast.apply @, args
      @emit.apply @, args

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
        subject = app.singletons[path.split('.')[0].substring 1]

    subject.get truePath

  subView: (name, view) ->
    if not view
      if typeof name is 'string'
        return @childView name
      else
        view = name
        name = null

    if view not instanceof View
      view = new view(args)

    view.__viewName__ = name

    view.parent = @
    @children.push view

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
    if not arg or arg is @ or @$el.is arg
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

    $([document, window]).off ".delegateEvents-#{@cid}"
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
        _.last child._events["request:#{eventName}"]

      if eventObj
        event = new Base.Event type: 'request', target: @
        response = eventObj.callback.apply eventObj.ctx, [event].concat args
        break

  # FIXME: have a broadcastAll and emitAll config
  emit: (eventName, args...) ->
    parent = @parent
    if parent
      if /^(child:|request:)/.test eventName
        event = args[0]
        event ?= new Base.Event type: eventName, target: @
        if not event.propagationStopped
          event.currentTarget = parent
          parent.trigger.apply parent, arguments
      else if not /^(app:|parent:|firstChild:|firstParent:)/.test eventName
        name = uncapitalize @name
        event = new Base.Event name: eventName, target: @, currentTarget: parent
        for newEvent in ["child:#{eventName}", "child:#{name}:#{eventName}"
          "firstChild:#{eventName}", "firstChild:#{name}:#{eventName}"]
          parent.trigger.apply parent, [newEvent, event].concat args

  broadcast: (eventName, args...) ->
    if @children
      if /^(parent:|app:)/.test eventName
        event = args[0] or new Base.Event type: eventName, target: @
        if not event.propagationStopped
          event.currentTarget = child
          for child in @children
            return if event.propagationStopped
            child.trigger.apply child, arguments
      else if not /^(child:|request:|firstParent:|firstChild:)/.test eventName
        name = uncapitalize @name
        event = new Base.Event name: eventName, target: @
        for child in @children
          event.currentTarget = child
          for newEvent in ["parent:#{eventName}", "parent:#{name}:#{eventName}"
            "firstParent:#{eventName}", "firstParent:#{name}:#{eventName}"]
            return if event.propagationStopped
            child.trigger.apply child, [newEvent, event].concat args


for method in ['get', 'set', 'toJSON', 'has', 'unset', 'escape', 'changed',
  'clone', 'keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'clear',
  'toggle']
  do (method) ->
    Base.View::[method] ?= (args...) -> @state[method].apply @state, args


# App - - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.App extends Base.View
  constructor: ->
    currentApp = @
    for key, value of appSurrogate
      currentApp[key] = value
    appSurrogate = null

    @template ?= _JST["src/templates/app.html"]

    super

  views: {}
  singletons: {}
  collections: {}
  models: {}

  broadcast: (eventName, args...) ->
    if @children
      if not /^(child:|request:|firstParent:|firstChild:)/.test eventName
        for child in @children
          child.trigger.apply child, ["app:#{eventName}"].concat args

  moduleType: 'app'


# Model - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Model extends Backbone.AssociatedModel
  constructor: (defaults = {}, options = {}) ->
    @name ?= @constructor.name

    for key, value of _.extend options.compute or {}, @compute
      @computeProperty key, value

    unless @ instanceof Base.State
      @relations ?= {}
      @relations.$state = Base.State

    @_mapRelations _.extend {}, @relations, options.relations
    super
    addState @

    if Base.config.debug.logModelChanges
      @on 'change', =>
        try
          # FIXME: circular structure error
          console.log JSON.stringify @toJSON(), null, 2
        catch e
          console.log e

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
          isCollection = true if _super is Backbone.Collection::

        # @defaults[key] ?= if isCollection then [] else {}

        newRelations.push
          key: key
          type: if isCollection then 'Many' else 'One'
          collectionType: value if isCollection
          relatedModel: if isCollection then value::model else value

      @relations = newRelations

  toJSON: (withBlacklist) ->
    json = Backbone.AssociatedModel::toJSON.call @
    if withBlacklist then json else _.omit json, @blacklist

  computeProperty: (name, args) ->
    args = _.clone args
    switch $.type args
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
    @parent = @parents[0] or context
    @name ?= lowercase @constructor.name

    if @parent
      @on 'all', -> (event, args...) =>
        @parent.trigger.apply @parent, ['state:' + event].concat args


# Router - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Router extends Backbone.Router
  constructor: ->
    @name ?= @constructor.name
    addState @
    super

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
        currentApp.trigger.apply currentApp, \
          ["#{uncapitalize @name}:#{eventName}"].concat args


# List - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Simple lists enhanced with underscore methods and backbone style events
# (add, remove, reset)
# FIXME: this is a bit buggy
# FIXME: make @children a Base.List
class Base.List
  constructor: (items, options = {}) ->
    @reset items, options

  unshift: (items...) -> @add item, at: 0 for item in items.reverse()
  push: (items...) -> @add item, at: @length for item in items
  shift: -> @remove null, at: 0
  pop: -> @remove null, at: @length - 1

  reset: (items, options = {}) ->
    @splice @length, @length
    @push.apply @, items
    @trigger 'reset', @, options unless options.silent

  add: (item, options = {}) ->
    at = options.at ?= @length
    @splice at, null, item
    @trigger 'add', item, @, options unless options.silent

  remove: (item, options = {}) ->
    index = options.at or @indexOf item
    item ?= @[index]
    @splice index, 1
    @trigger 'remove', item, @, options unless options.silent
    item

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


# Object - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Object
  constructor: ->

_.extend Base.Object::, Backbone.Events


# Event - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Event
  constructor: (@options) ->
    _.extend @, @options
    @currentTarget ?= @target

  preventDefault: ->
    @defaultPrevented = true

  stopPropagation: ->
    @propagationStopped = true


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

    if @ractive
      @render()
    else
      @$el.html html

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
        state.set '$parent', @parent.state.toJSON()
        @listenTo @parent.state, 'all', (eventName, args) =>
          split = eventName.split ':'
          if split[0] is 'change' and split[1]
            @set "$state.#{split[1]}", state.get split[1]

    state.set '$state', state if obj instanceof Base.View
    state.on 'all', (eventName, args...) =>
      split = eventName.split ':'
      if split[0] is 'change' and split[1]
        obj.trigger.apply ["change:$state.#{split[1]}"].concat args

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
      @insertView $el,
        new View _.extend { data: model, html: html, view: view, \
          parent: @,  name: name, path: path, model: model }, attrs

    @on "reset:#{path}", => child.destroy() for child in @childViews view
    @on "remove:#{path}", (model) => @childView( model: model ).destroy()
    @on "add:#{path}", insertView

    @get(path).each insertView

  view: ($el, view, attrs) ->
    viewName = attrs.view or attrs.type
    View = currentApp.views[ capitalize $.camelCase viewName ] or BasicView
    name = attrs.name
    # FIXME: reactie templates won't work here beacuse no relations
    data = @get(attrs.data) or view.state

    html = $el.html()
    $el.empty()

    @subView new View _.extend {
      el: $el[0]
      html: html
      view: view
      name: name
      data: data
    }, attrs

  log: ($el, view, attrs) ->
    out = {}
    for key, value of attrs
      out[key] = @get value
    console.log 'x-log:', out
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

    outlets: (view, config) ->
      bound = []

      @on 'render', =>
        for el in $ '[outlet], [data-outlet]', @ractive.fragment.items
          $el = $ el
          outlet = $.camelCase $el.attr('data-outlet') or $el.attr 'outlet'
          if not _.contains bound, outlet
            bound.push outlet
            @$[outlet] = @$ "[data-outlet='#{outlet}'], [outlet='#{outlet}']"
            events = []
            for key, value of @
              if ( new RegExp "on(.*)?#{outlet}", 'i' ).test key
                events.push RegExp.$1.toLowerCase()

            for key, value of @_events
              if ( new RegExp "^([^:]*?):#{outlet}", 'i' ).test key
                events.push RegExp.$1.toLowerCase()

            $el.on events.join, (e) =>
              @trigger [ event.type, outlet ].join(':'), e

  all:
    state: ->


# Filters - - - - - - - - - - - - - - - - - - - - - - - - -

Base.filters =
  uncapitalize: (str) -> str and (str[0].toLowerCase() + str.substring 1) or ''
  capitalize: (str) -> str and (str[0].toUpperCase() + str.substring 1) or ''
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
      eventSugar: true # onChangeActive: -> 'foobar'

  model:
    plugins: {}

  router:
    plugins: {}

  collection:
    plugins: {}


# Setup - - - - - - - - - - - - - - - - - - - - - - - - - -

for className in ['Model', 'Router', 'Collection', 'View']
  for method in ['get', 'set', 'on', 'listenTo', 'off', 'stopListening', 'once'
    'listenToOnce', 'trigger', 'clear', 'has', 'invert', 'omit', 'pick', 'sync'
    'fetch', 'save', 'changed', 'validate', 'isValid', 'clone', 'hasChanged'
    'previous', 'destroy']
    do (method) ->
      Base[className]::['state' + capitalize method] = (args...) ->
        @state[method].apply @state, args


Base.Controller = Base.View
window.Base = Base
