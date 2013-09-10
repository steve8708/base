# Base.js
---
## What it is

A powerful MVC framework for people who want the ultimate elegance, simplicity, and efficiency without compromise.

## Inspiration

Inspired by the JS framework titans, Base is an initiative to consolidate the benefits of them all,
into a flexible, efficiency, and ultra high performance foundation for building
lightning fast yet amazingly powerful HTML5 applications that are as beatiful to code as they are to behold.

This framework pulls many ideas from great JS frameworks such as bakcbone.js,
angular.js, ember.js, marionette.js, thorax, chaplin, can.js, polymer,
knockout, spine, sammyjs, react, extjs, and many more

## What's built in

Base takes the very best of Backbone.js (bulletproof ORM, microscopic footprint, extensible architecture), best of
Ember.js (hierarchical view management, intuitive templating, best in class performance and scalability), best of
Angular.js ('magic' updating templates, dead-simple web components, powerful event propagation and broadcasting),
and assembles it all together under one framework with an ultra efficient, lightweight core, a powerful plugin-based architecture,
and much more!

## What it aims to solve

That, and, of course, seeking to resolve the inherent issues and limitations plaguing each framework. Such as
Backbone's lack of support for nested views, models, collections, dynamic templates, and other critical features
supported by larger frameworks,
Ember's bloat (235kb minified - yikes!), overcomplexity, overuse of redundant, unnecessary helper classes
(renderbuffer, defaultresolver, enumerable, etc), and severely limited template binding, and
Angular's performance and scaling issues regarding their use of 'dirty' model checking,
lack of extensibility via diverting the classical inheritance model (i.e. no plugins or subclassing), and lack of robust and restful ORM management.

Hot dayamn.

## What its built on
Built on top of Backbone, jQuery, and Ractive, Base.js is the attempt to have everything
and leave nothing for a brighter world of elegant, scalable, high performance HTML5 apps
that are effortless, intuitive, and even fun to create, debug, test, and maintain.

## Where its at
Base is in alpha. The API is unstable and rapidly improving.

## Where its going
Base is intended to be the foundation for building and extending great apps. Its core
is lightweight and powerful, and it is meant to be infinitely extended and expanded
through the use of plugins, ultimately with the intent to reduce building powerful
apps down to simple configuration.



# Code Example
---

HTML:

    :::html
    <body base-app="myApp">
      <h1>{{user.name}}</h1>
      <div class="controls">
        <button base-click="set( 'mode', 'grid' )" class="grid {{ mode == 'grid' ? 'active' : 'inactive' }}"></button>
        <button base-click="set( 'mode', 'grid' )" class="single {{ mode == 'single' ? 'active' : 'inactive' }}"></button>
      </div>
      <x-view type="grid">
        {{#picts}}
          <img outlet="pict" src="{{url}}" base-click="set( 'activePict', 'pict' )">
        {{/picts}}
      </x-view>

      <x-view type="lightbox" visible="{{!!activePict}}" base-click="hide( true )">
        <img src="{{activePict.url}}" outlet="pict">
      </x-view>
    </bod>

JS (in Coffeescript):

    :::coffeescript
    class Grid extends Base.View
      plugins:
        masonry: true

      defaults:
        mode: 'grid'

    class Pict extends Base.View
      plugins:
        animateOnLoad: 'fadeIn'

    class Lightbox extends Base.View
      defaults:
        showLightbox: false

      onChangeShowLightbox: -> @doStuff()


CSS (in Stylus):

    :::css
    [ data-view = pict ]
      [ data-mode = single ] &
        position relative


# Concepts
---

## Dynamic Templates
Documentation coming soon…

## Nested Views
Documentation coming soon…
## Nested Models and Collections
Documentation coming soon…
## States
Documentation coming soon…
## Event Bubbling and Broadcasting
Documentation coming soon…
## Dynamic Templates
Documentation coming soon…
## Plugins
Documentation coming soon…

# Templates
---
### Web Components

    :::html
    <x-view type="foo"></x-view>
    <x-collection subject="picts" view="pict"></x-collection>

#### Creating Components

    :::coffeescript
    Base.component 'view', ($el, attributes) ->
      view = new app.views[attributes.type] _.extend attributes, parent: @
      @insertView view

    Base.component 'collection', ($el, attributes) ->
      View = app.views[attributes.view]
      collection = @get attributes.subject

      @listenTo collection,
        add: (model) => @insertView new View parent: @, model: model
        remove: (model) => @destroyView model: model
        reset: => @destroyViews()


# Core Classes
---

## Base.App

### Class

    :::coffeescript
    # Inherits from and supports full Base.View API (below)
    class App extends Base.App
      constructor: ->
        super
        @get('picts').fetch()

      defaults:
        mode: 'grid'

      relations:
        picts: PictsCollection


## Base.View

### Class

    :::coffeescript
    class View extends Base.View
      # View state defaults
      defaults:
        visible: false

       # Model relations
      relations:
        pict: PictModel

      constructor: ->
        super

      # DOM Events can be bound via method syntax sugar
      onClick: ->
      onKeypress: ->
      onWindowResize: ->
      onDocumentKeypress: ->

      # Or using dom element outlet names
      onClickMainImage: ->

      # When parent or child emits or broadcasts an event
      onParentFoo: ->
      onChildFoo: ->

      # When a parent or child with name 'grid' emit or change events
      onParentGridChangeActive: ->
      onChildGridChangeVisible: ->

      # Listen to change event in property visible
      onChangeVisible: ->

      # Listen to a state property of related model pict
      onChangePictStateActive: ->

      # Called after render
      afterRender: ->

      # Actions to run before a view is destroyed
      cleanup: ->

      # Send a response to a child view requesting some information
      onRequestSomeQuestion: (args…) ->
        @


### Methods

    :::coffeescript
    view.subView new View         # add a nested view

    view.insertView '.foo', view  # add a nested view at selector
    view.insertView view          # add a nested view at @$el

    view.findView 'photoGrid'     # find a nested view named 'photoGrid'
    view.findView model: model    # find nested view that matches property keyvals
    view.findView (view) ->       # find view via a function

    view.childView 'foo'          # only search immediate children
    view.is 'foo'                 # view matches a string, object, or function

    view.parent                   # the views parent view
    view.children                 # list of subviews - inherits from Base.List

    view.parentView 'foo'

    view.childViews 'foo'
    view.findViews 'foo'
    view.parentViews 'foo'

    # emit an event to all parents, seen by parents as 'child:foo'
    view.emit 'foo', arg1, arg2

    # broadcast an event to all children, seen as 'parent:foo'
    view.broadcast 'foo', arg1, arg2

    # callback when a parent broadcasts event 'foo'
    view.on 'parent:foo', ->

    # callback when a parent named 'parentViewName' broadcasts event 'foo'
    view.on 'parent:parentViewName:foo', (e, args…) ->

    # callback when a child emits an event 'foo'
    view.on 'child:foo', (e, args…) ->

    # callback when a child emits an event 'foo'
    view.on 'child:childViewName:foo', (e, args…) ->

    # Destroy a view, unbind all listeners, and cleanup
    view.destroy()

    # Request a response from a parent, bubbles up to all parents
    # until one parent has an on 'request:someQuestion' handler or
    # an onRequestSomeQuestion method. The request is sent to the
    # first parent with a handler and then the request stops propagating
    view.request 'someQuestion', (response) ->


## Base.Model

### Class

    :::coffeescript
    # Models are inherited from backbone models
    class Model extends Base.Model
      stateDefaults:
        active: false

      defaults:
        price: 0

      # models support computed properties that auto update on change
      # of other properties
      compute:
        # 'priceString' will update on every change of 'price' and/or 'currencyCode'
        priceString: (price, currencyCode) ->
          getCurrencyString(currencyCode) + price

      # Confogire nested model associations
      relations:
        pict: PictModel


### Methods

    :::coffeescript
    # State Syntax Sugar
    model.state                 # => sate model (inherited from Base.State)
    model.setState 'foo', bar   # equivalent of model.state.set 'foo', bar
    model.getState 'foo'        # => 'bar'
    model.toggle 'foo'          # same as model.set 'foo', !model.get 'foo'
    model.toggleState 'active'  # equivalent of model.state.toggle 'active'

    model.addRelation 'pict', PictModel          # Add a nested model
    model.set 'pict', { foo: 'bar' }             # Creates a new pict model
    model.get 'pict'                             # => pictModel object
    model.get 'pict.foo'                         # => 'bar'
    model.set 'pict.foo', 'baz'

    # Nested Events
    model.on  'change:pict.foo', ->              # valid as expected
    model.on  'change:pict.products[0].foo', ->  # also valid

    # State Events
    model.on 'state:change:foo.bar', ->   # same as model.state.on 'change:foo.bar'

### HTML

    :::html
    <!-- Update DOM on model state changes -->
    {{#model.$state.active }}
      <h1>I am active!</h1>
    {{/}}


## Base.Singleton
Documentation coming soon...

## Base.Collection

### Class

    :::coffeescript
      # Collections are inherited from backbone collections
      class Collection extends Base.Collection
        stateDefaults:
          synced: false

### Method

    :::coffeescript
    # State Syntax Sugar
    collection.state                   # => sate model (inherited from Base.State)
    collection.setState 'synced', true # same as collection.state.set 'foo', bar
    collection.getState 'synced'       # => true
    collection.toggleState 'synced'    # same as collection.state.toggle 'active'

    collection.on 'state:change:synced', -> # same as model.state.on 'change:foo'

### HTML

    :::html
    <!-- Update DOM on collection state changes -->
    {{#collection.$state.synced }}
      <h1>I've been synced!</h1>
    {{/}}

## Base.List
An evented array, similar to a backbone collection, but can store any type of data. Used internally to store view children (view.children) and listen to events and changes

### Class

    :::coffeescript
    class List extends Base.List
      # Any class (constructor) can be a model that new additions
      # passed to the list are constructed by. That or set no model
      # And
      model: Base.View

      stateDefaults:
        active: false

      # Like any class, a list can support custom methods
      getActiveChild: (e) ->
        @find (child) -> child.active

      # And you can override methods as expected
      find: (e) ->
        log 'someone is looking for something!'
        super



### Methods

    :::coffeescript
    list = new Base.List
    list.on 'add', -> log 'added!'
    list.push 'hello!' # => triggers log 'added!'

    # Lists are just typical arrays, you have access to all native
    # array methods ('forEach', 'map', 'indexOf', etc) and all
    # underscore array and collection methods as well ('find', 'contains', etc)
    list[0]                              # => 'hello'
    list.find (item) -> _.isString item  # => 'hello'
    list.contains 'hello'                # => true
    list.isEmpty()                       # => false


    # Event bubbling (similar to backbone collections)
    view = new Base.View
    list.add view
    list.on 'anEvent', (e) -> log 'a child triggered an event!'
    # triggers the above log
    view.trigger 'anEvent'

    # You can create models of any type, just pass any class (constructor)
    # as a list's model property
    list = new Base.List
    list.model = ListItemView
    list.push tagName: 'li'
    list[0]                   # => a new ListItemView with tagName: 'li'

    # Lists also support all state methods
    list.setState 'active', false
    list.getState 'active'
    list.toggleState 'active'
    list.hasState 'active'
    list.state.toJSON()
    list.on 'state:change:active', ->


## Base.Router

### Class

    :::coffeescript
    # Inherits from Backbone.Router
    class Router extends Base.Router
      stateDeafults:
        firstRoute: true

      routes:
        '*': (route) -> @setState 'firstRoute', false

      onChangeFirstRoute: (stateModel, value, options) ->

### Methods

    :::coffeescript
    # Supports all stated methods
    router.setState 'firstRoute', true
    router.getState 'firstRoute'
    router.toggleState 'firstRoute'


## Base.State

Inherits from Base.Model
The state model used by Base classes. Bubbles all events received to parent
as 'state:#{eventName}', so, for example, on its parent you can listen to 'state:change:someAttribute'

State models must be inited with a parent (the owner of the state model in which the state model describes the state of). E.g.

    :::coffeescript
    class MyStatedClass
      constructor: ->
        @state = new State parent: @
        @state.set 'inited', true
        @state.get 'inited' # => true


## Base.Stated

Easier wasy of creating a new stated object. Inherits from Base.Object

    :::coffeescript
    class Stated extends Base.Stated
      constructor: ->
        super
        @toggleState 'inited'
        @setState 'active', true
        @getState 'active' # => true

      stateDefaults:
        inited: false

## Base.Object

Simple evented object contrsuctor. Supports full Backbone events API 'on', 'off', 'listenTo', etc

    :::coffeescript
    class MyObject extends Base.Object
      constructor: ->
        super
        @on 'foobar', ->


## Base.Event

Constructor for base events. Every bubbled and broadcasted view event injects a first argument that is an instanceof Base.Event which supports

    :::coffeescript
    view.on 'child:change:foo', (e) ->
      e.preventDefault()   # sets e.defaultPrevented to true
      e.stopPropagation()  # prevents this event from further propagating
      e.target             # reference to view that first triggered the event
      e.currentTarget      # reference to the current view handling the event

# Configuration
---
Documentation coming soon...

# Plugins
---
Documentation coming soon...

# Modules
---
Documentation coming soon...

