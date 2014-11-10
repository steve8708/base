![base.js](http://i.imgur.com/wdK1lsu.png)

Maximize code reuse, minimize DOM management, optimize happiness.
All the features you need to build stunning HTML5 web and mobile applications with efficiency and ease.
Lightweight, high performance, incredibly flexible, insanely powerful.

Base.js is a project
designed to combine the very best feautres of [backbone](http://backbonejs.org), [angular](http://angularjs.org), and [ember](http://emberjs.com) with inspiration from [ many other great javascript
MVC frameworks](http://todomvc.com/) into one cohesive, highly performant, maximally flexible and extensible package.

Built with [Backbone](http://backbonejs.org/), [jQuery](http://jquery.com/), and [Ractive](http://www.ractivejs.org/)

# Contents
* [Project Status](#project-status)
* [Simple Example](#simple-example)
* [Core Concepts](#core-concepts)
    * [Live Templates](#live-templates)
    * [Plugins](#plugins)
    * [Web Components](#web-components)
    * [View Nesting and Subview Management](#view-nesting-and-subview-management)
    * [Nested Models and Collections](#nested-models-and-collections)
    * [State Management](#state-management)
    * [Simplified Event Binding](#simplified-event-binding)
    * [Dependency Injection](#dependency-injection)
* [Core Classes](#core-classes)
    * [Base.App](#baseapp)
    * [Base.View](#baseview)
    * [Base.Model](#basemodel)
    * [Base.Singleton](#basesingleton)
    * [Base.Collection](#basecollection)
* [Helper Classes](#helper-classes)
    * [Base.List](#baselist)
    * [Base.Event](#baseevent)
    * [Base.State](#basestate)
    * [Base.Stated](#basestated)
    * [Base.Object](#baseobject)


# Project Status: Deprecated

Sorry to those eager to use this project. I have since been unable to maintain this
project and instead would personally recommend using [angular](http://angularjs.org) instead

# Simple Example

HTML (DOM updates automatically on model changes)

```html
<body base-app="myApp">
  <h1>{{user.name}}</h1>
  <div class="controls">
    <button on-click="set: 'mode', 'grid' " class="grid {{ mode == 'grid' ? 'active' : 'inactive' }}"></button>
    <button on-click="set: 'mode', 'grid' " class="single {{ mode == 'single' ? 'active' : 'inactive' }}"></button>
  </div>
  <base-view type="grid">
    {{#picts}}
      <img outlet="pict" src="{{url}}" on-click="set: 'activePict', 'pict' ">
    {{/picts}}
  </base-view>

  <base-view type="lightbox" visible="{{!!activePict}}" on-click="hide: true ">
    <img src="{{activePict.url}}" outlet="pict">
  </base-view>
</body>
```

JS (in Coffeescript):

```coffeescript
class App extends Base.App
  plugins:
    lazyLoadImages: true
    animateImagesOnLoad:
      type: 'fade'

class Grid extends Base.View
  plugins:
    masonry: true

  defaults:
    mode: 'grid'

class Lightbox extends Base.View
  defaults:
    showLightbox: false

  onChangeShowLightbox: -> @doSomething()
```

CSS (in Stylus):

```css
[ data-view = pict ]
  [ data-mode = single ] &
    position relative
```




# Core Concepts


## Live Templates

All base templates update automatically as your views and models change, no more jquery is needed! No, seriously, stop using .append(), .clone(), .addClass(), .removeClass(), etc. Just like angular, meteor, derby, and the many other fantastic live template libraries, once you use it you will not look back. No more spaghetti code, no more exponentially rising DOM manipulation complexity, no more rerendering entire views just to update one list.

Base live templates are built on top of [Ractive](http://www.ractivejs.org/), check out the [examples](http://www.ractivejs.org/examples/) for amazing examples of using live templates for all kinds of applications and purposes. And see [below](#objects-and-methods) for how Base extends Ractive for additional power and flexibility including app level binding, route binding, singleton binding, and more.

### Tags

```html
{{someGlobalProperty}}

<!-- 'EACH' -->
{{#someArray}}
  {{title}}
  <!-- The dot indicates relative to the array-->
  {{.someArrayProperty}}
  <!-- This renders the array item itself, typically used if the value is a string in an array of strings -->
  {{.}}
{{/someArray}}

<!-- 'IF' -->
{{#someNonArray}}
  <h1> {{someNonArray}} is truthy! </h1>
{{/someNonArray}}

<!-- 'UNLESS' -->
{{^someNonArray}}
  <h1> {{someNonArray}} is falsey! </h1>
{{/someNonArray}}
```

### Expressions

```html
<!-- Expressions -->
{{ name ? name : 'You have no name!' }}

<div class="button {{ active ? 'active' : 'inactive' }}"></div>
<div name="{{name}}"></div>

<!-- Block expressions -->
{{# foo == 'bar' && bar == 'foo' }}
  Foo is bar and bar is foo!
{{/}}

{{^ typeof bar is 'string'}}
  Bar is not a string!
{{/}}
```

### Objects and methods

```html
<!-- Current view methods -->
{{ $view.getProduct( product ) }}

<!-- Filters -->
{{ $filter.capitalize( name ) }}
{{ $filter.orderBy( someArray, 'name' ) }}

<!-- Parent view -->
{{ $parent.foo.bar }}
{{ $parent.$parent.foo.bar }}

<!-- App -->
{{ $app.foo == 'bar' ? foo : bar }}

<!-- Singletons -->
{{# $user.type == 'brand' }}
  You're a brand, here are some brand options!
{{/}}

{{# $user.type == 'publisher' }}
  Hello publisher!
{{/}}

<!-- Routes -->
{{# $router.path[0] == 'share' && $router.params.foo == 'bar' }}
  We're on the shar epage and foo is bar!
{{/}}

{{# $router.route == 'share/photo' }}
  You're sharing a photo!
{{/}}

<!-- Mix and match -->
{{# shareType == 'photo' && $user.type == 'brand' }}
  Something special just for brands shareing photos
{{/}}
```

### Event binding

Base extends [Ractive](ractivejs.org) to allow multiple arguments
with object getters

#### HTML

```html
<button on-click="someButtonWasClicked"></button>
<button on-hover="set: 'foo', bar"></button>
<button on-touchend="activate: foo"></button>
```

#### JS (in coffeescript)

```coffeescript
class View extends Base.View
  someButtonWasClicked: (e) ->
    $clickedButton = $ e.currentTarget

  activate: (name) ->
    name # => 'foo'
```

### Outlets

#### HTML
```html
<button outlet="foo"></button>
```

#### JS (in coffeescript)
```coffeescript
class View extends Base.View
  construcotr: ->
    super
    # First way to bind
    @on 'click:foo', ->

  bind:
    # Second way to bind
    'click:foo', ->

  # Simplest way to bind
  onClickFoo: (e) ->
```




## Plugins

Extend the functionality of any type of module. Configurable at the Base (global) level, app level, and the per module level (also by module type). The ultimate goal is to distill applications development to basic configuration, through the use of building and applying reusable components. This is heavily inspired by [grunt](http://gruntjs.com/).

The ultimate goal here is to maximize code reusability across applications, provide basic utilities that help this process (modeled after the grunt apis). Ultimately this library will be broken down into the Base core and a suite of plugins to assemble the features you want (e.g. ractive templating, state handling, etc). Eventually nearly every feature herein should be moved to a plugin so applications can be assembled with as much or as little as they want/choose, and can swap out any part or piece at any time (e.g. use another template library, use a different state handler, etc)

### Using Plugins

```coffeescript
Base.plugins.view.defaults.lazyLoad = true
App.plugins.defaults.state = true

class View extends Base.View
  plugins:
    ractive: true
    lazyLoadImages: true
    fadeInImages:
      className: 'fade'
      selector: '.lazy-loaded'
```

### Creating Plugins

```coffeescript
# Plugin code runs on initialize, is called in the context of the module
# it is being applied to, and can retutn methods to apply to the module
Base.view.plugin 'ractive', (view, config) ->
  @ractive = new Ractive el: @el, template: @template, data: @toJSON()
  @ractive.bind Ractive.adaptors.backboneAssociatedModel @state
  @on 'render', => @ractive.render()

# Applies to all classes
Base.plugin 'state', (module, config) ->
  @state = new Base.State
  @state.on 'all', (eventName, args…) =>
    @trigger.apply @, ["state:#{eventName}"].concat args

  # You can return methods to apply to the module
  getState: (name) -> @state.get name
  setState: (name, value) -> @state.set name, value

App.view.plugin 'fadeInImages', (view, config) ->
  @on 'render', ->
    # You can use config.className or apply config as a function to set defaults
    config = config className: 'hide', selector: 'img'

    $images = @$ config.selector
    $images.addClass config.className
    $images.on 'load', (e) => $(e.target).removeClass config.className

# Plugins can also apply to specific module types
App.plugin ['view', 'collection', 'model'], 'state', ->

# Plugins can also have dependences
App.view.plugin 'ractive', ['view:state'], ->
```




## Web Components

Web components are custom HTML tags with special behaviors for making application markup dead simple. These can range from basic simplications (e.g. '<base-icon name="foo">' as a simpler form of typing <i class="icon sprite-foo"></i>) to highly dynamic components (e.g. <base-collection> that automatically creates and destroys subviews as a paired collection changes)

### Using Components

```html
<base-view type="foo" foo="bar"></base-view>
<base-collection subject="picts" view="pict"></base-collection>
<base-icon name="foo"></base-icon>
<base-switch name="bar"></base-switch>
```

### Creating Components

``` coffeescript
# add child views with simple markup
Base.component 'view', ($el, attributes) ->
  view = new app.views[attributes.type] _.extend attributes, parent: @
  @insertView view

# For a dynamic list of views that updates when a collection changes
Base.component 'collection', ($el, attributes) ->
  View = app.views[attributes.view]
  collection = @get attributes.subject

  @listenTo collection,
    add: (model) => @insertView new View parent: @, model: model
    remove: (model) => @destroyView model: model
    reset: => @destroyViews()

# For simpler markup of sprited icons generated by grunt-glue
Base.component 'icon', ($el, attributes) ->
  $el.append "<i class='icon sprite-#{attributes.name}'></i>"

# For IOS style switches
Base.component 'switch', ($el, attributes) ->
  $input = $ "<input type='checkbox' type='switch' name='#{attributes.name}>'"
  $input.on 'click', => $el.prop 'checked', $input.prop 'checked'
```





## View Nesting and Subview Management


### Defining Nestings in JS


```coffeescript
class View extends Base.View
  constructor: ->

  render: ->
    super
    @insertView new SomeView
    @insertView '.some-selector', new SomeView

    @subView new SomeView
```

### Defining Nesting in Markup

```html
<!--
    This is equivalent to parnetView.subView new MyViewName foo: 'bar'
-->
<base-view type="MyViewName" foo="bar"></base-view>
```

### Event Bubbling, Emitting, and Broadcasting

```coffeescript
class MyView extends Base.View
  render: ->
    super
    # broadcasts an event to all children
    @broadcast 'rendered'

    # emits an event to all children
    @emit 'rendered'

    # broadcasts and emits an event to all parents and children
    @trigger 'rendered'

  # Runs when any child emits 'rendered'
  onChildRendered: ->
  # Runs when any child named 'myOtherView' emits 'rendered'
  onChildMyOtherViewRendered: ->
  # Runs when any immediate child emits 'rendered'
  onFirstChildRendered: ->
  # Runs when any view (parent or child) nadmed 'myOtherView' rendered
  onMyOtherViewRendered: ->

  onChildChangeActive: ->

class MyOtherView extends Base.View
  render: ->
    super
    @emit 'rendered'

    # These are all valid ways of binding to the same events described above
    @on 'child:rendered', ->
    @on 'firstChild:rendered', ->
    @on 'child:myThirdView:rendered', ->
    @on 'myThirdView:rendered', ->
    @on 'child:change:active', ->


class MyThirdView extends Base.View
  rener: ->
    @emit 'rendered'

  # Runs when any parent broadcasts 'rendered'
  onParentRendered: ->
  # Runs when a parent named 'MyView' broadcasts 'rendered'
  onParentMyViewRendered: ->
  # Runs only when this views first (closest) parent broadcasts 'rendered'
  onFirstParentRende: ->red
```

### Event Object

```coffeescript
# All emitted and broadcasted events inject a first
# argument, a Base.Event (similar to a DOM event object)
# that gives listeners some extra information and actions

class View extends Base.View
  onChildChangeActive: (e) ->
    if e.target.is 'listItem'
      # Stop this event from further propagating (to parents
      # if the event was emitted, to children if the event was
      # broadcasted)
      e.stopPropagation()

      # Sets e.defaultPrevented to true
      e.preventDefault()

    # in this case the currentTarget is this view
    if e.currentTarget is @
      true
```

### Accessing View Nesting and Management

```coffeescript
view.children           # => Base.List (evented array) of children
view.parent             # => view's immediate parent

view.findView 'name'    # => first view named 'name'
view.findViews 'name'   # => array of subviews named 'name'

view.childView 'name'   # => first immediate child named 'name'
view.childViews 'name'  # => array of immediate children with name 'name'

view.parentView 'name'  # => first parent with name 'name'
view.parentViews 'name' # => array of parents with name 'name'

# All view accesors also take objects
view.findViews model: model
view.parentView foo: 'bar', bar: 'foo'

# All view accessors can also take iterators (functions)
view.childView (view) -> view.isActive()
view.parentViews (view) -> view.
```

### Child List

```coffeescript
# Or you can always loop through children yourself
# view.children inherits from Base.List, so it supports
# all native array methods as well as all underscore
# array and collection methods
view.children.map (child) -> child.toJSON()
view.children.reduce (child, lastVal) -> lastValue += 1 if child.isActive()
view.children.isEmpty()
view.children.max (child) -> child.get 'height'
view.children.sortBy (child) -> child.isActive()
view.children.last()
```

### Child List Events

```coffeescript
view.children.on 'add', (childView) ->    #  a new child view as added
view.children.on 'remove', (childView) -> #  a child view was removed
view.childre.non 'reset', ->              # children were reset
```


## Nested Models and Collections

```coffeescript
class PhotoModel extensd Base.Model
  constructor: ->
    super
    # Relations can be added dynamically
    @addRelation 'activeProduct', ProductModel

  # Relations can be configured
  relations:
    productsTagged: ProductsCollection


class Model extends Base.Model
  constructor: ->
    super
    @set 'photos', [ url: 'hi.png' ]
    @get 'photos'              # => Photo list with one photo model in it
    @get 'photos[0]'           # => a Photo model
    @get 'photos[0].url'       # => 'hola.png'
    @set 'photos[0].url, 'foo.com/bar.png

    @get('photos').add url: 'hello.png'
    @get('photos').reset()

    @on 'add:photos', ->         # a photo model was added
    @on 'reset:photos', ->       # the photos collection was reset
    @on 'remove:photos', ->      # a photo was removed

    @on 'change:photos[0]', ->   # this first photo model changed
    @on 'change:photos[*]', ->   # any photo model changed
    @on 'change:photos[0].url', ->
    @on 'change:photos[*].url', ->

    # Infinite nestings are supported
    @get 'photos[0].productsTagged[0].id'
    @set 'photos[0].productsTagged[0].id', newId
    @on 'change:photos[0].productsTagged[0].id', ->


  # Syntax sugar for listening for above events
  onChangePhotosUrl: ->
  onAddPhotos: ->
  onResetPhotos: ->
  onRemovePhotos: ->

  # Defining relations
  relations:
    photos: PhotoList

# Views also support relations
class View extends Base.View
  relations:
    photo: PhotoModel

  onChangePhotoUrl: ->
  onChangePhoto: ->
```




## State Management

Nearly all Base classes support state models (view, router, model, collection, app, etc). This lets you attach properties to models, collections, routers, etc
without clashing with data you want synced with your backend (or other persistence layer such as localStorage)

### State Object

```coffeescript
model.state # => Base.State instance that inherits from Base.Model
model.state.get 'active'

# view getters and setters forward to the view state model
view.get 'active'        # equivalent to view.state.get 'active'
view.set 'active', true  # equivalent to view.state.set 'active', true
view.toJSON()            # equivalent to view.state.toJSON()
view.toggle 'active'     # equivalent to view.state.toggle 'active'
```

### Configuration

```coffeescript
class Collection extends Base.Collection
  # configure state defaults
  # this is valid for all stated classes (e.g. router, model, collection, etc)
  stateDefaults:
      active: false

class View extends Base.View
  # delegates to state.defaults
  defaults:

  # delegates to state.relations
  relations:
      foo: Foo
```


### State Methods
All foolowing methods work for all stated classes (routers, models, views, collections, etc)

```coffeescript
model.setState 'active', true # equivalent to model.state.set 'active', true
model.getState 'active'       # equivalent to model.state.get 'active'
model.toggleState 'active'    # equivalent to model.state.toggle 'active'

# other model methods supported
model.changedState 'active'
model.cloneState()
model.unsetState 'active'
model.clearSate()
```

### State Events

```coffeescript
    class Model extends Base.Model
      constructor: ->
        super
        # all state events bubble to their parent prefixed by 'state:'
        @on 'state:change:active', ->

       onStateChangeActive: ->
```

### State In Templates

```html
<!-- properties in templates are view state properties -->
{{hello}}

<!-- bind to models that are nested in state (using relations) -->
{{model.property}}

<!-- bind to model state -->
{{model.$state.active}}
```



## Simplified Event Binding

Any event on any evented object (model, view, collection, etc) can be subscribed to directly by camelizing the event name.

```coffeescript
class View extends Base.View
  onChange: (stateModel) ->
  # triggers on 'change:active'
  onChangeActive: (stateModel) ->

  # triggers on 'child:change:active'
  onChildChangeActive: (e) ->

  # triggers on 'firstParent:render
  onFirstParentRender: (e) ->

  # Triggers when @$el was clicked
  onClick: (e) ->

  # Triggers when a dom element where outlet="myButton" fired a 'mouseenter' event
  onMouseenterMyButton: (e) ->

class Collection extends Base.Collection
  # triggers on 'add'
  onAdd: (model) ->

  # triggers on 'remove'
  onRemove: (model) ->
```



## Dependency Injection
NOTE: this feature is a work in progress, it is not yet ready for usage in development or production

### Defining a module
Anything can be stored as a module at the app or base level (though the app level is most recommended).

```coffeescript
  Base.app 'Pict', ->
    class Pict extends Base.App
      constructor: ->
        super

  Base.apps.pict is Pict   # => true
  Base.app('pict') is Pict # => true

  app.view 'Photo', ->
    class Photo extends Base.View
      constructor: ->
        super

  app.view('Photo') is Photo # => true
  app.views.Photo is Photo   # => true

  app.model 'MyData' ->
    class MyData extends Base.Model
      constructor: ->
        super

  app.service 'http', ->
    (
      get: (url, callback) ->
        $.get url, callback
    )
```

### Defining Dependencies
Module functions are executed as soon as all dependency requirements are met. At this point the module is set to the value of the function called and any modules whose last remaining dependency is the result of the function just called while also get called.

```coffeescript
# Simplest method. A 'PhotoView' arg looks for app.views.Photo,
# 'httpService' arg looks for app.services.http, etc
app.view 'Foo' (PhotoView, httpService, MyDataModel) ->
  class Foo extends Base.View
    get: (url, callback) ->
      httpService.get url, callback


 # To avoid minification issues, you can instead separately define
 # an array of dependencies
 app.view 'Foo', ['PhotoView', 'httpService'], (Photo, http) ->
   class Foo extends Base.View
     constructor: ->
       super
```

### Require Syntax

```coffeescript
Base.define 'foobar', (require) ->
  # Base can figure out your dependencies. It will first
  # look in the 'app' context for your module, followed by the
  # global (Base) context
  foo = require 'foo'

  bar = app.require 'bar'

  baz = Base.require 'baz'

app.define 'FooView', ->
  class Foo extends

```

# Core Classes

## Base.App

### Class

```coffeescript
# Inherits from and supports full Base.View API (below)
class App extends Base.App
  constructor: ->
    super
    @get('picts').fetch()

  defaults:
    mode: 'grid'

  relations:
    picts: PictsCollection
```


## Base.View

### Class

```coffeescript
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
  onRequestSomeQuestion: ->
```

### Methods

```coffeescript
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

```

## Base.Model

### Class

```coffeescript
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
```


### Methods

```coffeescript
# State Syntax Sugar
model.state                 # => sate model (inherited from Base.State)
model.setState 'foo', bar   # equivalent of model.state.set 'foo', bar
model.getState 'foo'        # => 'bar'
model.toggle 'foo'          # same as model.set 'foo', !model.get 'foo'
model.toggleState 'active'  # equivalent of model.state.toggle 'active'

model.addRelation 'pict', PictModel          # Add a nested model
model.set 'pict', foo: 'bar'                 # Creates a new pict model
model.get 'pict'                             # => pictModel object
model.get 'pict.foo'                         # => 'bar'
model.set 'pict.foo', 'baz'

# Nested Events
model.on  'change:pict.foo', ->              # valid as expected
model.on  'change:pict.products[0].foo', ->  # also valid

# State Events
model.on 'state:change:foo.bar', ->   # same as model.state.on 'change:foo.bar'
```

### HTML

```html
<!-- Update DOM on model state changes -->
{{#model.$state.active }}
  <h1>I am active!</h1>
{{/}}
```




## Base.Singleton

Singletons inherit from Base.Model and are accessible via the app object
and anywhere via templates

JS (in Coffeescript)

```coffeescript
app.singleton ->
  class User extends Base.Singleton
    defaults:
      name: 'You have no name!'

app.mySingleton is MySingleton # => true
```

HTML

```html
<!-- All singletons are accessible in templates prefixed by $ -->
<h1>{{$user.name}}</h1>
```




## Base.Collection

### Class

```coffeescript
# Collections are inherited from backbone collections
class Collection extends Base.Collection
  stateDefaults:
    synced: false
```

### Method

```coffeescript
# State Syntax Sugar
collection.state                   # => sate model (inherited from Base.State)
collection.setState 'synced', true # same as collection.state.set 'foo', bar
collection.getState 'synced'       # => true
collection.toggleState 'synced'    # same as collection.state.toggle 'active'

collection.on 'state:change:synced', -> # same as model.state.on 'change:foo'
```

### HTML

```html
<!-- Update DOM on collection state changes -->
{{#collection.$state.synced }}
  <h1>I've been synced!</h1>
{{/}}
```








# Helper Classes


## Base.List

An evented array, similar to a backbone collection, but can store any type of data. Used internally to store view children (view.children) and listen to events and changes

### Class

```coffeescript
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
```


### Methods

```coffeescript
list = new Base.List
list.on 'add', -> log 'added!'
list.push 'hello!' # triggers the 'add' event

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
```




## Base.Router

### Class

```coffeescript
# Inherits from Backbone.Router
class Router extends Base.Router
  stateDeafults:
    firstRoute: true

  routes:
    '*': (route) -> @setState 'firstRoute', false

  onChangeFirstRoute: (stateModel, value, options) ->
```


### Methods

```coffeescript
# Supports all stated methods
router.setState 'firstRoute', true
router.getState 'firstRoute'
router.toggleState 'firstRoute'
```



## Base.State

Inherits from Base.Model
The state model used by Base classes. Bubbles all events received to parent
as 'state:#{eventName}', so, for example, on its parent you can listen to 'state:change:someAttribute'

State models must be inited with a parent (the owner of the state model in which the state model describes the state of). E.g.

```coffeescript
class MyStatedClass
  constructor: ->
    @state = new State parent: @
    @state.set 'inited', true
    @state.get 'inited'                      # => true
    @listenTo @state, 'change:inited', ->    # valid
    @on 'state:change:inited', ->            # also valid
```




## Base.Stated

Easier wasy of creating a new stated object. Inherits from Base.Object

```coffeescript
class Stated extends Base.Stated
  constructor: ->
    super
    @toggleState 'inited'
    @setState 'active', true
    @getState 'active' # => true

  stateDefaults:
    inited: false
```



## Base.Object

Simple evented object contrsuctor. Supports full Backbone events API 'on', 'off', 'listenTo', etc

```coffeescript
class MyObject extends Base.Object
  constructor: ->
    super
    @on 'foobar', ->
```





## Base.Event

Constructor for base events. Every bubbled and broadcasted view event injects a first argument that is an instanceof Base.Event which supports

```coffeescript
view.on 'child:change:foo', (e) ->
  e.preventDefault()   # sets e.defaultPrevented to true
  e.stopPropagation()  # prevents this event from further propagating
  e.target             # reference to view that first triggered the event
  e.currentTarget      # reference to the current view handling the event
```







# JS vs Coffeescript

Despite the examples herein being in coffeescript, like any other coffeescript library base.js does not require that you write any code in coffeescript. Just use the .extend() method to subclass Base classes

```javascript
var View = Base.View.extend({
  initialize: function () {
    // Do stuff
  },

  someMethod: function () {
    // The JS way of calling super (if you ever find you need it)
    Base.View.prototype.someMethod.apply(this, arguments);

    // Alternatively, you can use Base._super to help out a bit
    return Base._super(this, 'someMethod', arguments);
  }
});
```

