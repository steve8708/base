describe 'filters', ->
  filters = Base.filters

  it 'can capitalize a string', ->
    expect(filters.capitalize('hello')).to.equal 'Hello'

  it 'can uncapitalize a string', ->
    expect(filters.uncapitalize('Hello')).to.equal 'hello'

  it 'can uppercase transform a string', ->
    expect(filters.uppercase('hello')).to.equal 'HELLO'

  it 'can lowercase transform a string', ->
    expect(filters.lowercase('Hello')).to.equal 'hello'

  it 'can json stringify an object', ->
    expect(filters.json({})).to.be.a 'string'

  it 'can order an array of objects', ->
    arr = [ id: 1, id: 2 ]
    sorted = filters.orderBy arr, 'id', true
    expect(sorted[0].id).to.equal 2


describe 'view managing', ->
  # TODO

