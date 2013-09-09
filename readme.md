# Base.js

A powerful MVC framework for people who want the ultimate elegance, simplicity, and efficiency without compromise.

## Inspiration

Inspired by the JS framework titans, Base is an initiative to consolidate the benefits of them all,
into a flexible, efficiency, and ultra high performance foundation for building
lightning fast yet amazingly powerful HTML5 applications that are as beatiful to code as they are to behold.

## What it has

Base takes the very best of Backbone.js (bulletproof ORM, microscopic footprint, extensible architecture), best of
Ember.js (hierarchical view management, intuitive templating, best in class performance and scalability), best of
Angular.js ('magic' updating templates, dead-simple web components, powerful event propagation and broadcasting),
and assembles it all together under one framework with an ultra efficient, lightweight core, a powerful plugin-based architecture,
and much more!

## What it solves

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

HTML:

    :::html
    <body base-app="myApp">
        <h1>{{user.name}}</h1>
        <div class="controls">
          <button class="grid" x-click="mode = 'grid'"></button>
          <button class="single" x-click="mode = 'single'"></button>
        </div>
        <x-view type="grid" source="picts" mode="{{mode}}">
          <x-view type="pict">
            <img outlet="pict" src="{{url}}" x-click="activePict = pict">
          </x-view>
        </x-view>

        <x-view type="lightbox" visible="{{activePict}}">
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

    :::stylus
    [ data-view = pict ]
        [ data-mode = single ] &
          position relative

## Concepts

### Nested Views
Coming soon…
### Nested Models and Collections
Coming soon…
### View, Model, Collection States
Coming soon…
### Event Bubbling and Broadcasting
Coming soon…
### Dynamic Templates
Coming soon…
### Plugins
Coming soon…

## Templates

### Web Components

  <x-view type="foo"></x-view>
  <x-collection subject="picts" view="pict"></x-collection>

#### Creating Components

  Base.components.view = ($el, attributes) ->
    view = new app.views[attributes.type] _.extend attributes, parent: @
    @insertView view

  Base.componts.collection = ($el, attributes) ->
    View = app.views[attributes.view]
    collection = @get attributes.subject

    @listenTo collection,
      add: (model) => @insertView new View parent: @, model: model
      remove: (model) => @destroyView model: model
      reset: => @destroyViews()


## Core Classes

### Base.App

  # Inherits from and supports full Base.View API
  class App extends Base.App
    constructor: ->
      super

### Base.View

#### Class

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


#### Methods

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

  # emit an event to all parents, seen by parents
  view.emit 'foo', arg1, arg2 as 'child:foo'

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


### Base.Model

#### Class

  # Models are inherited from backbone models
  class Model extends Base.Model
    stateDefaults:
      active: false

    defaults:
      price: 0

    # models support computed properties that auto update on change
    # of other properties
    compute:
      # foo will update on every change of 'price' and/or 'currencyCode'
      priceString: ['price', 'currencyCode', (price, currencyCode) ->
        getCurrencyString(currencyCode) + price
      ]

    # Base models support nested associations
    # For example
    #   @set 'pict', { foo: 'bar' }
    #   @get 'pict'                             # => pictModel object
    #   @get 'pict.foo'                         # => 'bar'
    #   @on  'change:pict.foo', ->              # valid as expected
    #   @on  'change:pict.products[0].foo', ->  # also valid
    # See backbone-associations.js
    #  (https://github.com/dhruvaray/backbone-associations)
    #  for full documentation
    relations:
      pict: PictModel


#### Methods

  model.state                # => sate model (inherited from Base.State)
  model.setState 'foo', bar  # => equivalent of model.state.set 'foo', bar
  model.getState 'foo'       # => 'bar'
  model.toggle 'foo'         # => equivalent of model.set 'foo', !model.get 'foo'
  model.toggleState 'active' # => equivalent of model.state.toggle 'active'

#### HTML

  <!-- Update DOM on model state changes -->
  {{# model.$state.active }}
    <h1>I am active!</h1>
  {{/}}


### Base.Singleton
Documentation coming soon...

### Base.Collection
Documentation coming soon...

### Base.List
An evented array
Documentation coming soon...

### Base.Router
Documentation coming soon...

### Base.State
Documentation coming soon...

### Base.Object
Documentation coming soon...

### Event
Documentation coming soon...

## Configuration
Documentation coming soon...

## Plugins
Documentation coming soon...

## Modules
Documentation coming soon...


Full documentation Documentation coming soon...