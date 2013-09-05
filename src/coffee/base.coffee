###
  TODO: AMD support (require, define)
###


# Setup - - - - - - - - - - - - - - - - - - - - - - - - - -

originalBase = window.Base

# FIXME:
currentApp = null

arr = []

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
    @attributes['data-pict-view'] ?= @name.replace(/view/i, '').toLowerCase()
    @children ?= []

    super

    stateOptions = _.extend {
      relations: @relations
      compute: @compute
    }, @stateOptions

    @state = new Base.State @defaults or @stateDefaults, stateOptions, @
    @state.on 'all', (args...) => @trigger.apply @, args
    @trigger 'init'

    @$el.data 'view', @
    @_bindEventBubbling()
    @_bindSpecialCallbacks()
    @_bindSpecialEventMethods()

  moduleType: 'view'

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
      camelized = event.replace /:([a-z])/ig, (match, a) -> a.toUpperCase()
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
        attrObjects = []
        for attr in el.attributes
          name = attr.name
          string = attr.value
          if name.indexOf('x-') is 0
            attrs[name.substring 2] = string

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
      template = @template or pict.templates[templateName] or ''
      @ractive = new Ractive
        el: @el
        template: template
        data: _.extend @.toJSON(), $view: @, $filter: Base.filters

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

      for key, val of pict
        if val instanceof Base.Model or val instanceof Base.Collection
          @ractive.bind adaptor val, "$pict.#{key}"

  _bindEventBubbling: ->
    uncap = pict.utils.uncapitalize

    @on 'all', (eventName, args...) =>
      if @parent and eventName.indexOf('broadcast:') isnt 0
        if eventName.indexOf('child:') isnt 0
          # FIXME: maybe call it 'bubble:eventName'
          @parent.trigger.apply @parent, ['child:' + eventName].concat args
          if @name
            @parent.trigger.apply @parent, \
              ['child:' + uncap(name) + ':' + eventName].concat args

        else if eventName.indexOf('request:') is 0
          @parent.trigger.apply @parent, [eventName].concat args

      if @children and not /^(child:|request:)/.test eventName
        for child in @children
          if eventName.indexOf('broadcast:') isnt 0
            child.trigger.apply child, ['broadcast:' + eventName].concat args
            if @name
              child.trigger.apply child, \
                ['broadcast:' + uncap(@name) + ':' + eventName].concat args
          # else
            # child.trigger.apply child, [eventName].concat args

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

  requestResponse: (eventName, args...) ->
    parent = @
    while parent = parent.parent
      event = _.last parent._events["requestResponse:" + eventName]
      if event
        response = event.callback.apply event.ctx, args
        break

  request = (eventName, args...) ->
    @parent.trigger.apply @parent, ["request:" + eventName].concat args

  broadcast: (eventName, args...) ->
    if children
      for child in @children
        child.trigger.apply child, ['broadcast:' + eventName].concat args


for method in ['get', 'set', 'toJSON', 'has', 'unset', 'escape', 'changed',
  'clone', 'keys', 'values', 'pairs', 'invert', 'pick', 'omit', 'clear']
  do (method) ->
    Base.View::[method] ?= (args...) -> @state[method].apply @state, args


# App - - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.App extends Base.View
  constructor: ->
    currentApp = @
    super

  moduleType: 'app'


# Model - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Model extends Backbone.AssociatedModel
  constructor: (defaults = {}, options = {}) ->
    @name ?= @constructor.name

    for key, value of _.extend options.compute or {}, @compute
      @computeProperty key, value

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
  constructor: (attributes, options) ->
    super
    @parent = @parents[0]
    @name ?= @constructor.name

    if @parent
      @on 'all', -> (event, args...) =>
        @parent.trigger.apply @parent, ['state:' + event].concat args


# Router - - - - - - - - - - - - - - - - - - - - - - - - - -

class Base.Router extends Backbone.Router
  constructor: ->
    @name ?= @constructor.name
    addState @
    super

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

    @on 'all', (eventName, args...) =>
      if currentApp
        currentApp.trigger.apply ["#{@name}:#{eventName}"].concat args


# List - - - - - - - - - - - - - - - - - - - - - - - - - - -

# Simple lists enhanced with underscore methods and backbone style events
# (add, remove, reset)
# FIXME: this is a bit buggy
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
_.extend Base::, Backbone.Events


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

capitalize = (string) ->
  string[0].toUpperCase() + string.substring 1

addState = (obj) ->
  if obj not instanceof Base.State
    stateAttributes = obj.state
    obj.blacklist ?= []
    obj.blacklist.push '$state'
    obj.set '$state', stateAttributes unless obj instanceof Base.Collection
    obj.state = obj.get '$state'
    obj.state = new Base.State stateAttributes unless obj.state
    obj.state.on 'all', (eventName, args...) =>
      split = eventName.split ':'
      if split[0] is 'change' and split[1]
        obj.trigger.apply ["change:$state.#{split[1]}"].concat args


# Components - - - - - - - - - - - - - - - - - - - - - - - -

Base.components =
  collection: ($el, view, attrs) ->
    path = attrs.path or attrs.collection
    name = attrs.name
    View = pict.views[ pict.utils.capitalize attrs.view ] or BasicView
    html = $el.html()
    $el.empty()

    insertView = (model) =>
      @insertView $el,
        new View _.extend { data: model, html: html, view: view, \
          name: name, path: path, model: model }, attrs

    @on "reset:#{path}", => child.destroy() for child in @childViews view
    @on "remove:#{path}", (model) => @childView( model: model ).destroy()
    @on "add:#{path}", insertView

    @get(path).each insertView

  view: ($el, view, attrs) ->
    View = pict.views[ pict.utils.capitalize attrs.view ] or BasicView
    name = attrs.name
    # FIXME: reactie templates won't work here beacuse no relations
    data = @get(attrs.data) or view.state

    html = $el.html()
    $el.empty()

    @insertView $el,
      new View _.extend {
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

    # Maybe max x-outlet
    # x-outle="hello"
    ouetlet: (view, config) ->
      # before, after any method?
      @on 'after:render', =>
        @$('[data-outlet]').each (index, el) =>
          $el = $ el
          outletName = $el.attr 'data-outlet'
          @$[outletName] = $el
          $el.on 'blur, focus, focusin, focusout, load, resize, scroll,
            unload, click, dblclick, mousedown, mouseup, mousemove, mouseover,
            mouseout, mouseenter, mouseleave, change, select, submit, keydown,
            keypress, keyup, error, touchstart, touchend, touchmove', (e) =>
            @trigger [ event.type, outletName ].join(':'), e

      @foo ?= ->
      @bar ?= ->

      return {
        foo: ->
        bar: ->
      }

    foobar:
      init: ->
      foo: ->
      bar: ->

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

Base.setup =
  all:
    plugins:
      state: true

  view:
    plugins:
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
