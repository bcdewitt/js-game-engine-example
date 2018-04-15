(function () {
'use strict';

// TODO: JSDoc

class Collection extends Set {
	map(func) {
		const newSet = new Collection();
		this.forEach(item => newSet.add(func(item)));
		return newSet
	}

	filter(func) {
		const newSet = new Collection();
		this.forEach(item => { if (func(item)) newSet.add(item); });
		return newSet
	}

	reject(func) {
		return this.filter(item => !func(item))
	}

	reduce(func, defaultVal) {
		if (defaultVal === undefined && this.size === 0)
			throw new Error('reduce() cannot be called on an empty set')

		const iterator = this.values();
		let lastVal = defaultVal === undefined ? iterator.next().value : defaultVal;
		for (const item of iterator) {
			lastVal = func(lastVal, item);
		}
		return lastVal
	}

	some(func) {
		for (const item of this) {
			if (func(item)) return true
		}
		return false
	}

	every(func) {
		for (const item of this) {
			if (!func(item)) return false
		}
		return true
	}

	find(func) {
		for (const item of this) {
			if (func(item)) return item
		}
		return undefined
	}

	concat(iterable) {
		const newSet = new Collection(this); // TODO: Change to make sure we can handle subclasses
		for (const item of iterable) {
			newSet.add(item);
		}
		return newSet
	}
}

const _GameEvent = new WeakMap();
let propagatingEvent = null; // Keeps track of the currently propagating event to cancel out duplicate events

/**
 * Class representing an event fired by a game object.
 */
class GameEvent {
	constructor(type, { bubbles } = {}) {
		const _this = {
			target: null,
			currentTarget: null,
			propagateImmediate: true,
			propagate: !!bubbles,
		};
		_GameEvent.set(this, _this);

		this.timestamp = null;
		Object.defineProperty(this, 'type', { value: type, writable: false });
		Object.defineProperty(this, 'bubbles', { value: !!bubbles, writable: false });
		Object.defineProperty(this, 'target', { get() { return _this.target } });
		Object.defineProperty(this, 'currentTarget', { get() { return _this.currentTarget } });
	}

	stopPropagation() {
		_GameEvent.get(this).propagate = false;
	}

	stopImmediatePropagation() {
		const _this = _GameEvent.get(this);
		_this.propagate = false;
		_this.propagateImmediate = false;
	}
}

const _eventTargetMixin = new WeakMap();

/**
 * Event Target mixin
 *
 * This provides properties and methods used for game event handling.
 * It's not meant to be used directly.
 *
 * @mixin eventTargetMixin
 */
const eventTargetMixin = {
	construct() {
		_eventTargetMixin.set(this, {
			listeners: new Map(),
			listenerOptions: new WeakMap(),
			parent: null,
		});
	},

	// TODO: DRY this up
	async dispatchEventAsync(e) {
		// Prevent duplicate events during propagation
		if (propagatingEvent && propagatingEvent.currentTarget === this) return

		const _this = _eventTargetMixin.get(this);
		const _event = _GameEvent.get(e);

		// Modify event's private properties
		if (_event.target === null) {
			_event.timestamp = performance.now();
			_event.target = this;
		}
		_event.currentTarget = this;

		// Loop over listeners (break out when e.stopImmediatePropagation() is called)
		const set = _this.listeners.get(e.type);
		let promises = [];
		if (set) {
			for (const listener of set) {
				const options = _this.listenerOptions.get(listener);
				promises.push(listener.call(this, e));
				if (options && options.once) this.removeEventListener(e.type, listener);
				if (!_event.propagateImmediate) break
			}
		}

		// If this event propagates, dispatch event on parent
		if (_event.propagate && _this.parent) {
			propagatingEvent = e;
			promises.push(_this.parent.dispatchEventAsync(e));
		} else {
			propagatingEvent = null;
		}
		await Promise.all(promises);
	},

	dispatchEvent(e) {
		// Prevent duplicate events during propagation
		if (propagatingEvent && propagatingEvent.currentTarget === this) return

		const _this = _eventTargetMixin.get(this);
		const _event = _GameEvent.get(e);

		// Modify event's private properties
		if (_event.target === null) {
			_event.timestamp = performance.now();
			_event.target = this;
		}
		_event.currentTarget = this;

		// Loop over listeners (break out when e.stopImmediatePropagation() is called)
		const set = _this.listeners.get(e.type);
		if (set) {
			for (const listener of set) {
				const options = _this.listenerOptions.get(listener);
				listener.call(this, e);
				if (options && options.once) this.removeEventListener(e.type, listener);
				if (!_event.propagateImmediate) break
			}
		}

		// If this event propagates, dispatch event on parent
		if (_event.propagate && _this.parent) {
			propagatingEvent = e;
			_this.parent.dispatchEvent(e);
		} else {
			propagatingEvent = null;
		}
		return this
	},

	addEventListener(type, listener, options) {
		const _this = _eventTargetMixin.get(this);
		const set = _this.listeners.has(type) ? _this.listeners.get(type) : new Collection();
		set.add(listener);

		_this.listeners.set(type, set);
		_this.listenerOptions.set(listener, options);
		return this
	},

	removeEventListener(type, listener) {
		const set = _eventTargetMixin.get(this).listeners.get(type);
		if (!set) return
		set.delete(listener);
		return this
	},

	propagateEventsFrom(child) {
		const _child = _eventTargetMixin.get(child);
		if (_child) _child.parent = this;
		return this
	},

	stopPropagatingFrom(child) {
		const _child = _eventTargetMixin.get(child);
		if (_child && _child.parent === this) _child.parent = null;
		return this
	}
};

// TODO: JSDoc

const unindexItem = (map, item) => {
	map.forEach((indexer, key) => {
		map.get(key).delete(item);
	});
};

const _Collection = new WeakMap();
class IndexedCollection extends Collection {
	constructor() {
		super();
		_Collection.set(this, {
			indexed: new Map(),
			indexers: new Map(),
		});
	}

	// subset filter
	setIndex(indexName, indexer) {
		const _this = _Collection.get(this);

		if (_this.indexers.has(indexName)) return

		_this.indexers.set(indexName, indexer);

		const indexedSet = new Collection();
		this.forEach((item) => {
			const val = indexer(item);
			if (val !== undefined) indexedSet.add(val);
		});

		_this.indexed.set(indexName, indexedSet);

		return this
	}

	// get subset
	getIndexed(indexName) {
		return _Collection.get(this).indexed.get(indexName)
	}

	// Can be called from observing logic (like a Proxy)
	// or events (like if a component property changes)
	reindexItem(item) {
		const _this = _Collection.get(this);
		unindexItem(_this.indexed, item); // in case item was already added
		_this.indexers.forEach((indexer, key) => {
			const val = indexer(item);
			if (val !== undefined) _this.indexed.get(key).add(val);
		});
		return this
	}

	add(item) {
		const returnVal = super.add(item);
		this.reindexItem(item);
		return returnVal
	}

	delete(item) {
		const _this = _Collection.get(this);
		unindexItem(_this.indexed, item);
		return super.delete(item)
	}
}

// TODO: JS Doc

const _Factory = new WeakMap();

class Factory {
	constructor() {
		_Factory.set(this, {
			middleware: new Set(),
			constructors: new Map(),
		});
	}

	use(middlewareFunc) {
		_Factory.get(this).middleware.add(middlewareFunc);
		return this
	}

	set(constructName, construct) {
		const constructNames = Array.isArray(constructName) ? constructName : [ constructName ];
		constructNames.forEach((constructName) => {
			_Factory.get(this).constructors.set(constructName, construct);
		});
		return this
	}

	has(constructName) {
		return _Factory.get(this).constructors.has(constructName)
	}

	create(constructName, data) {
		const _this = _Factory.get(this);
		const construct = _this.constructors.get(constructName);
		if (!construct) {
			console.warn(`${constructName} constructor doesn't exist`);
			return
		}
		const middleware = [..._this.middleware];
		data = middleware.reduce((inData, func) => func(constructName, inData), data);
		return construct(constructName, data)
	}
}

// TODO: JS Doc

const _AsyncFactory = new WeakMap();

class AsyncFactory {
	constructor() {
		_AsyncFactory.set(this, {
			middleware: new Set(),
			constructors: new Map(),
		});
	}

	use(middlewareFunc) {
		_AsyncFactory.get(this).middleware.add(middlewareFunc);
		return this
	}

	set(constructName, construct) {
		const constructNames = Array.isArray(constructName) ? constructName : [ constructName ];
		constructNames.forEach((constructName) => {
			_AsyncFactory.get(this).constructors.set(constructName, construct);
		});
		return this
	}

	async create(constructName, data) {
		const _this = _AsyncFactory.get(this);
		const construct = _this.constructors.get(constructName);
		const middleware = [..._this.middleware];

		for (const middlewareFunc of middleware) {
			data = await middlewareFunc(constructName, data);
		}

		return await construct(constructName, data)
	}
}

const ADD_PROPS_METHOD_NAME = 'construct';

// Creates a function that "extracts" an object with only the properties that test true
const createExtractObjFunc = test => obj => {
	const extractedObj = {};
	Object.entries(obj).forEach(([key, val]) => {
		if (test(val, key)) extractedObj[key] = val;
	});
	return extractedObj
};

// Extracts an object with only the non-function properties
const extractConstructor = createExtractObjFunc((val, key) => key === ADD_PROPS_METHOD_NAME);

// Extracts an object with only the function properties (methods)
const extractMethods = createExtractObjFunc((val, key) => key !== ADD_PROPS_METHOD_NAME);

// Creates an extendable class that includes the provided mixins
const createMixinFunc = (Clazz) => (...mixins) => {
	const constructors = mixins.map(mixin => extractConstructor(mixin).construct);
	const methodsMixins = mixins.map(mixin => extractMethods(mixin));

	// Add properties to class constructor
	let Mixable;
	if (Clazz)
		Mixable = class extends Clazz {
			constructor(...args) {
				super(...args);
				constructors.forEach(construct => construct.call(this));
			}
		};
	else
		Mixable = class {
			constructor() {
				constructors.forEach(construct => construct.call(this));
			}
		};

	// Add methods to class prototype
	Object.assign(Mixable.prototype, ...methodsMixins);

	return Mixable
};

const MixedWith = createMixinFunc();

// Creates nested empty arrays
const createArray = (...args) => {
	if (args.length === 0) return []

	const length = args[0];

	const arr = new Array(length);

	let i = length;
	if (args.length > 1) {
		while(i--) arr[length-1 - i] = createArray(...(args.slice(1)));
	}

	return arr
};

class ObservableChangeEvent extends GameEvent {
	constructor(type, { prop, args } = {}) {
		super(type);
		Object.defineProperty(this, 'prop', { value: prop, writable: false });
		Object.defineProperty(this, 'args', { value: args, writable: false });
	}
}

const handledObjs = new WeakMap();

var observableMixin = Object.assign({}, eventTargetMixin, {
	construct() {
		eventTargetMixin.construct.call(this);
	},

	makeObservable(prop) {
		if (!handledObjs.has(this))
			handledObjs.set(this, new Set());
		const handledProps = handledObjs.get(this);

		if (handledProps.has(prop)) return

		let val = this[prop];
		const descriptor = Reflect.getOwnPropertyDescriptor(this, prop);

		// Observe method calls
		if (typeof val === 'function') {
			Reflect.defineProperty(this, prop, Object.assign({
				get() {
					return (...args) => {
						this.dispatchEvent(new ObservableChangeEvent('observableChange', { prop, args }));
						return val.call(this, ...args)
					}
				},
				set(inVal) { val = inVal; }
			}, descriptor));

		// Observe property changes
		} else {
			Reflect.defineProperty(this, prop, Object.assign({
				get() { return val },
				set(inVal) {
					this.dispatchEvent(new ObservableChangeEvent('observableChange', { prop, args: [ inVal ] }));
					val = inVal;
				}
			}, descriptor));
		}
		return this
	},
});

const _Entity = new WeakMap(); // Store private variables here

/** Class that represents an Entity (the "E" in the ECS design pattern). */
class Entity extends MixedWith(observableMixin) {

	/**
	 * Create an Entity.
	 */
	constructor() {
		super();
		_Entity.set(this, {
			components: new Map()
		});
		this.makeObservable('setComponent');
		this.makeObservable('removeComponent');
	}

	/**
	 * Sets a component object for this Entity under the given name.
	 * @param  {string} compName - Name of component.
	 * @param  {Object=} component - Plain-data Object.
	 * @returns {this} - Returns self for method chaining.
	 */
	setComponent(compName, component) {
		component.setParentEntity(this);
		_Entity.get(this).components.set(compName, component);
		return this
	}

	/**
	 * Removes a component object from this Entity under the given name (if it exists).
	 * @param  {string} compName - Name of component.
	 * @returns {this} - Returns self for method chaining.
	 */
	removeComponent(compName) {
		_Entity.get(this).components.delete(compName);
		return this
	}

	/**
	 * Gets the component object for this Entity under the given name.
	 * @param  {string} compName - Name of component.
	 * @returns {Object|null}  Returns the component object under the given name.
	 */
	getComponent(compName) {
		return _Entity.get(this).components.get(compName)
	}

	/**
	 * Check if the given component exists for this Entity.
	 * @param  {string} compName - Name of component.
	 * @returns {boolean}  true if the given component exists for this Entity.
	 */
	hasComponent(compName) {
		return _Entity.get(this).components.has(compName)
	}
}

const getAllObjKeys = (obj) => [... new Set(obj ? Object.keys(obj).concat(
	getAllObjKeys(Object.getPrototypeOf(obj))
) : [])];

const _Component = new WeakMap(); // Store private variables here
const _ProtoChainKeys = new WeakMap(); // Cache object keys from prototype chains

/** Class that represents an Component (the "C" in the ECS design pattern). */
class Component extends MixedWith(observableMixin) {

	/**
	 * Create a Component.
	 * @param {Object} [obj] - Object with properties to assign to this Component
	 */
	constructor(obj) {
		super();
		if (obj) this.decorate(obj);
		_Component.set(this, {
			parentEntity: null
		});
	}

	/**
	 * Decorates an existing object with Component functionality.
	 * @param {Object} [obj] - Object with properties to assign to this Component
	 * @returns {this} - Returns self for method chaining.
	 */
	decorate(obj = {}) {
		const objProto = Reflect.getPrototypeOf(obj);

		let objKeys;
		if (objProto !== Object.prototype) {
			if (!_ProtoChainKeys.has(objProto))
				_ProtoChainKeys.set(objProto, getAllObjKeys(obj));
			objKeys = _ProtoChainKeys.get(objProto);
		} else {
			objKeys = getAllObjKeys(obj);
		}

		objKeys.forEach((key) => {
			Reflect.defineProperty(this, key, {
				enumerable: true,
				get() { return obj[key] },
				set(val) { obj[key] = val; },
			});
		});

		return this
	}

	/**
	 * Gets the Entity to which this Component belongs
	 * @param {Entity} parentEntity - The Entity to which this Component belongs.
	 * @returns {this} - Returns self for method chaining.
	 */
	setParentEntity(parentEntity = null) {
		_Component.get(this).parentEntity = parentEntity;
		return this
	}

	/**
	 * Gets the Entity to which this Component belongs.
	 * @returns {Entity} - Returns the parent Entity.
	 */
	getParentEntity() {
		return _Component.get(this).parentEntity
	}
}

class GameStopEvent extends GameEvent {
	constructor(type) {
		super(type, { bubbles: true });
	}
}

class GameSceneChangeEvent extends GameEvent {
	constructor(type, { sceneName } = {}) {
		super(type, { bubbles: true });
		Object.defineProperty(this, 'sceneName', { value: sceneName, writable: false });
	}
}

class SystemMountedEvent extends GameEvent {
	constructor(type, { entities } = {}) {
		super(type);
		Object.defineProperty(this, 'entities', { value: entities, writable: false });
	}
}

class SystemUpdateEvent extends GameEvent {
	constructor(type, { entities, deltaTime, timestamp } = {}) {
		super(type);
		Object.defineProperty(this, 'entities', { value: entities, writable: false });
		Object.defineProperty(this, 'timestamp', { value: timestamp, writable: false });
		Object.defineProperty(this, 'deltaTime', { value: deltaTime, writable: false });
	}
}

class SystemLoadEvent extends GameEvent {
	constructor(type, { assetFetcher } = {}) {
		super(type);
		Object.defineProperty(this, 'assetFetcher', { value: assetFetcher, writable: false });
	}
}

class SystemLoadedEvent extends GameEvent {
	constructor(type, { assets } = {}) {
		super(type);
		Object.defineProperty(this, 'assets', { value: assets, writable: false });
	}
}

// Creates a function that throws an error when run
const unimplemented = name => () => {
	throw new Error(`${name} not set`)
};

/**
 * Class representing a System.
 * @mixes eventTargetMixin
 */
const _System = new WeakMap();
class System extends MixedWith(eventTargetMixin) {
	constructor() {
		super();
		_System.set(this, {
			getEntitiesFunc: unimplemented('getEntitiesFunc'),
			addEntityFunc: unimplemented('addEntitiesFunc'),
		});
	}

	setGetEntitiesFunc(func) {
		_System.get(this).getEntitiesFunc = func;
		return this
	}

	unsetGetEntitiesFunc() {
		_System.get(this).getEntitiesFunc = unimplemented('getEntitiesFunc');
		return this
	}

	getEntities(indexName) {
		return _System.get(this).getEntitiesFunc(indexName)
	}

	setAddEntityFunc(func) {
		_System.get(this).addEntityFunc = func;
		return this
	}

	unsetAddEntityFunc() {
		_System.get(this).addEntityFunc = unimplemented('addEntityFunc');
		return this
	}

	addEntity(entity) {
		_System.get(this).addEntityFunc(entity);
		return this
	}

	/**
	 * Fires a bubbling "stopGame" event.
	 *
	 * @returns {this} - Returns self for method chaining.
	 */
	stopGame() {
		this.dispatchEvent(new GameStopEvent('stopGame'));
		return this
	}

	/**
	 * Fires a bubbling "changeScene" event.
	 *
	 * @param {string} sceneName - Name of the scene to activate
	 * @returns {this} - Returns self for method chaining.
	 */
	changeScene(sceneName) {
		this.dispatchEvent(new GameSceneChangeEvent('changeScene', { sceneName }));
		return this
	}

	/**
	 * Fires a "load" event.
	 *
	 * @async
	 * @param {AssetFetcher} assetFetcher - AssetFetcher to be used in handlers.
	 * @returns {Promise} - Promise that resolves once the load event handler(s) resolve.
	 */
	load(assetFetcher) {
		return this.dispatchEventAsync(new SystemLoadEvent('load', { assetFetcher }))
	}

	/**
	 * Fires a "loaded" event.
	 *
	 * @param {Map} assets - Assets for the system to use.
	  @returns {Promise} - Promise that resolves once the loaded event handler(s) resolve.
	 */
	loaded(assets) {
		return this.dispatchEventAsync(new SystemLoadedEvent('loaded', { assets }))
	}

	/**
	 * Fires a "mounted" event.
	 *
	 * @param {Collection<Entity>} entities - Entities to attach to the event.
	 * @returns {this} - Returns self for method chaining.
	 */
	mounted(entities) {
		this.dispatchEvent(new SystemMountedEvent('mounted', { entities }));
		return this
	}

	/**
	 * Fires an "update" event.
	 *
	 * @param {Collection<Entity>} entities - Entities to attach to the event.
	 * @param {DOMHighResTimeStamp} deltaTime -
	 *     Time since last update in milliseconds to attach to the event.
	 * @param {DOMHighResTimeStamp} timestamp -
	 *     Current time in milliseconds to attach to the event.
	 * @returns {this} - Returns self for method chaining.
	 */
	update(entities, deltaTime, timestamp) {
		this.dispatchEvent(new SystemUpdateEvent('update', { entities, deltaTime, timestamp }));
		return this
	}
}

class SceneLoadEvent extends GameEvent {
	constructor(type, { assetFetcher } = {}) {
		super(type, { bubbles: true });
		Object.defineProperty(this, 'assetFetcher', { value: assetFetcher, writable: false });
	}
}

class SceneLoadedEvent extends GameEvent {
	constructor(type, { assets } = {}) {
		super(type, { bubbles: true });
		Object.defineProperty(this, 'assets', { value: assets, writable: false });
	}
}

class SceneUpdateEvent extends GameEvent {
	constructor(type, { entities, deltaTime } = {}) {
		super(type, { bubbles: true });
		Object.defineProperty(this, 'entities', { value: entities, writable: false });
		Object.defineProperty(this, 'timestamp', { value: deltaTime, writable: false });
	}
}

const _Scene = new WeakMap();

const MAX_UPDATE_RATE = 60 / 1000;

/**
 * Class representing a Scene.
 * @mixes eventTargetMixin
 */
class Scene extends MixedWith(eventTargetMixin) {

	/**
	 * Create a Scene.
	 */
	constructor() {
		super();
		_Scene.set(this, {
			systems: new Map(),
			entities: new IndexedCollection(),
			lastUpdate: null,
		});
	}

	// --------------------------- Entity Management ----------------------------

	/**
	 * Add an entity.
	 *
	 * @param {Entity} entity - Entity to be added.
	 * @returns {this} - Returns self for method chaining.
	 */
	addEntity(entity) {
		if (entity) _Scene.get(this).entities.add(entity);
		return this
	}

	/**
	 * Add entities.
	 *
	 * @param {Entity[]} entities - Iterable containing Entities to be added.
	 * @returns {this} - Returns self for method chaining.
	 */
	addEntities(entities) {
		const innerEntities = _Scene.get(this).entities;
		entities.forEach(entity => innerEntities.add(entity));
		return this
	}

	/**
	 * Remove an entity.
	 *
	 * @param {Entity} entity - Entity to be removed.
	 * @returns {this} - Returns self for method chaining.
	 */
	removeEntity(entity) {
		_Scene.get(this).entities.delete(entity);
		return this
	}

	/**
	 * Checks if an entity was added.
	 *
	 * @param {Entity} entity - Entity to find.
	 * @returns {boolean} - Returns true if the entity was found, false otherwise.
	 */
	hasEntity(entity) {
		return _Scene.get(this).entities.has(entity)
	}

	/**
	 * Checks if the given entity belongs under the associated index.
	 *
	 * @callback Scene~indexer
	 * @param {Entity} - entity to check
	 * @returns {boolean} - True if this entity belongs under the current index.
	 *     False, otherwise
	 */

	/**
	 * Adds an indexer under the given name. When entities are added, they will
	 * be tested against each indexer. Indexed entities can be accessed via
	 * getEntities(indexName).
	 *
	 * @param {string} indexName - Name of the index to add.
	 * @param {Scene~indexer} indexer - Callback function to determine if an entity
	 *     belongs under this index/subset.
	 * @returns {this} - Returns self for method chaining.
	 */
	setEntityIndexer(indexName, indexer) {
		_Scene.get(this).entities.setIndex(indexName, indexer);
		return this
	}

	/**
	 * Re-runs each indexer on the given entity. Primarily useful if values used
	 * in the indexer calculations will change after the entity is added. One
	 * possible use case would be in a setter.
	 *
	 * @param {Entity} entity - Entity to be removed.
	 * @returns {this} - Returns self for method chaining.
	 */
	reindexEntity(entity) {
		_Scene.get(this).entities.reindexItem(entity);
		return this
	}

	/**
	 * Gets the entities under the given index name. If no index name is provided,
	 * this method will return all added entities.
	 *
	 * @param {string} indexName - Name of the index.
	 * @returns {Set<Entity>|Collection<Entity>} - Set object containing the entities.
	 */
	getEntities(indexName) {
		if (indexName === undefined) return _Scene.get(this).entities
		return _Scene.get(this).entities.getIndexed(indexName)
	}


	// --------------------------- System Management ----------------------------

	/**
	 * Adds a system. NOTE: Systems are updated in the order they are added.
	 *
	 * @param {string} systemName - Name of the system to add.
	 * @param {System} system - System to add.
	 * @returns {this} - Returns self for method chaining.
	 */
	setSystem(systemName, system) {
		const _this = _Scene.get(this);
		this.propagateEventsFrom(system);
		system.setGetEntitiesFunc(indexName => this.getEntities(indexName));
		system.setAddEntityFunc(entity => this.addEntity(entity));
		system.mounted(_this.entities);
		_this.systems.set(systemName, system);
		return this
	}

	/**
	 * Removes a system.
	 *
	 * @param {string} systemName - Name of the system to remove.
	 * @returns {this} - Returns self for method chaining.
	 */
	removeSystem(systemName) {
		const _this = _Scene.get(this);
		const system = _this.systems.get(systemName);
		this.stopPropagatingFrom(system);
		system.unsetGetEntitiesFunc();
		system.unsetAddEntityFunc();
		_this.systems.delete(systemName);
		return this
	}

	/**
	 * Removes a system.
	 *
	 * @param {string} systemName - Name of the system to get.
	 * @returns {System|undefined} - Returns self for method chaining.
	 */
	getSystem(systemName) {
		return _Scene.get(this).systems.get(systemName)
	}

	/**
	 * Checks if a system was added.
	 *
	 * @param {string} systemName - Name of the system to find.
	 * @returns {boolean} - Returns true if the system was found, false otherwise.
	 */
	hasSystem(systemName) {
		return _Scene.get(this).systems.has(systemName)
	}


	// --------------------------------------------------------------------------

	/**
	 * Fires a bubbling "stopGame" event.
	 *
	 * @returns {this} - Returns self for method chaining.
	 */
	stopGame() {
		this.dispatchEvent(new GameStopEvent('stopGame'));
		return this
	}

	/**
	 * Fires a bubbling "changeScene" event.
	 *
	 * @param {string} sceneName - Name of the scene to activate
	 * @returns {this} - Returns self for method chaining.
	 */
	changeScene(sceneName) {
		this.dispatchEvent(new GameSceneChangeEvent('changeScene', { sceneName }));
		return this
	}

	/**
	 * Passes assetFetcher to all systems to load.
	 *
	 * @async
	 * @param {AssetFetcher} assetFetcher - AssetFetcher to be used in handlers.
	 * @returns {Promise} - Promise that resolves once the load/loaded event handler(s) resolve.
	 */
	async load(assetFetcher) {
		const systems = _Scene.get(this).systems;

		// Fire load event for the scene
		await this.dispatchEventAsync(new SceneLoadEvent('load', { assetFetcher }));

		// Fire load events for each system
		systems.forEach(system => system.load(assetFetcher));

		// TODO: Add a "loading" event to be handled like the update event

		// Fetch all assets and pass them back to the systems' loaded method
		const assets = new Map(await assetFetcher.fetchAssets());

		// TODO: Replace this with a keyed collection (Map version of Collection instead of Set)
		const promises = [
			this.dispatchEventAsync(new SceneLoadedEvent('loaded', { assets }))
		];
		systems.forEach(system => promises.push(system.loaded(assets)));

		return Promise.all(promises)
	}

	/**
	 * Calls update() on all systems then fires an "update" event.
	 *
	 * @param {DOMHighResTimeStamp} timestamp - Current time in milliseconds.
	 * @returns {this} - Returns self for method chaining.
	 */
	update(timestamp) {
		const _this = _Scene.get(this);
		const entities = _this.entities;

		if (_this.lastUpdate === null) _this.lastUpdate = timestamp;

		const deltaTime = timestamp - _this.lastUpdate;

		if (deltaTime === 0 || deltaTime >= MAX_UPDATE_RATE) {
			_this.systems.forEach(system => system.update(entities, deltaTime, timestamp));
			this.dispatchEvent(new SceneUpdateEvent('update', { entities, deltaTime, timestamp }));
			_this.lastUpdate = timestamp;
		}

		return this
	}
}

const _Game = new WeakMap();

/**
 * Class representing a Game.
 * @mixes eventTargetMixin
 */
class Game extends MixedWith(eventTargetMixin) {

	/**
	 * Create a Game Engine.
	 */
	constructor() {
		super();
		const _this = {
			activeScene: null,
			scenes: new Map(),
			running: false,
			bubbledEvent: false,
			stopGameEventListener: () => this.stopGame(),
			changeSceneEventListener: event => this.changeScene(event.sceneName),
		};
		_Game.set(this, _this);

		Object.defineProperty(this, 'running', { get() { return _this.running } });

		// Handle events that bubble up to this class
		this.addEventListener('changeScene', _this.changeSceneEventListener);
		this.addEventListener('stopGame', _this.stopGameEventListener);
	}

	// ---------------------------- Scene Management ----------------------------

	/**
	 * Add a scene.
	 *
	 * @param {string} sceneName - Name used to uniquely identify the added scene.
	 * @param {Scene} scene - Scene to add.
	 * @returns {this} - Returns self for method chaining.
	 */
	setScene(sceneName, scene) {
		const _this = _Game.get(this);
		this.propagateEventsFrom(scene);
		_this.scenes.set(sceneName, scene);
		return this
	}

	/**
	 * Remove a scene.
	 *
	 * @param {string} sceneName - Name used to uniquely identify the scene to remove.
	 * @returns {this} - Returns self for method chaining.
	 */
	removeScene(sceneName) {
		_Game.get(this).scenes.delete(sceneName);
		return this
	}

	/**
	 * Checks if a scene was added under the given name.
	 *
	 * @param {string} sceneName - Name used to uniquely identify the scene to find.
	 * @returns {boolean} - Returns true if a scene was found, false otherwise.
	 */
	hasScene(sceneName) {
		return _Game.get(this).scenes.has(sceneName)
	}

	/**
	 * Finds and returns a scene using the given name.
	 *
	 * @param {string} sceneName - Name used to uniquely identify the scene to find.
	 * @returns {Scene|undefined} - Scene found with the given name, if any.
	 */
	getScene(sceneName) {
		if (!sceneName) return _Game.get(this).activeScene
		return _Game.get(this).scenes.get(sceneName)
	}

	/**
	 * Changes the active scene using the given name. Fires a "changeScene" event.
	 *
	 * @param {string} sceneName - Name used to uniquely identify the scene to find.
	 * @returns {this} - Returns self for method chaining.
	 *
	 * @throws - Will throw an error if a scene is not found with the given name.
	 */
	changeScene(sceneName) {
		const _this = _Game.get(this);
		if (!_this.scenes.has(sceneName))
			throw new Error(`Scene "${sceneName}" doesn't exist`)
		_this.activeScene = _this.scenes.get(sceneName);

		// Fires changeScene event
		this.removeEventListener('changeScene', _this.changeSceneEventListener);
		this.dispatchEvent(new GameSceneChangeEvent('changeScene', { sceneName }));
		this.addEventListener('changeScene', _this.changeSceneEventListener);

		return this
	}


	// --------------------------------------------------------------------------

	/**
	 * Passes assetFetcher to active scene and starts loading process.
	 *
	 * @async
	 * @param {AssetFetcher} assetFetcher - AssetFetcher to be used in handlers.
	 * @returns {Promise} - Promise that resolves once the load event handler(s) resolve.
	 */
	async load(assetFetcher) {
		const scene = _Game.get(this).activeScene;
		return await scene.load(assetFetcher)
	}

	/**
	 * Stops the main game loop. Fires a "stopGame" event.
	 *
	 * @returns {this} - Returns self for method chaining.
	 */
	stopGame() {
		const _this = _Game.get(this);
		_this.running = false;
		this.removeEventListener('stopGame', _this.stopGameEventListener);
		this.dispatchEvent(new GameStopEvent('stopGame'));
		this.removeEventListener('stopGame', _this.stopGameEventListener);
		return this
	}

	/**
	 * Starts the main game loop
	 *
	 * @param {string=} sceneName - Name used to uniquely identify the scene to find.
	 * @returns {this} - Returns self for method chaining.
	 *
	 * @throws - Will throw an error if a scene is not found with the given name or,
	 *     if no sceneName is provided and there is no active scene.
	 */
	run(sceneName) {
		const _this = _Game.get(this);
		_this.running = true;

		if (sceneName) this.changeScene(sceneName);
		else if (!_this.activeScene)
			throw new Error('Active scene not set. Use changeScene() method or provide a sceneName to run()')

		const main = (timestamp) => {
			if (!_this.running) return
			_this.activeScene.update(timestamp);
			requestAnimationFrame(main);
		};

		main(performance.now());
		return this
	}
}

class FetchProgressEvent extends GameEvent {
	constructor(type, { progress } = {}) {
		super(type, { bubbles: true });
		Object.defineProperty(this, 'progress', { value: progress, writable: false });
	}
}

const IMAGE_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'gif', 'bmp', 'png', 'tif', 'tiff']);
const AUDIO_EXTENSIONS = Object.freeze(['ogg', 'wav', 'mp3']);
const VIDEO_EXTENSIONS = Object.freeze(['m3u8', 'webm', 'mp4']);

const rejectIfNotOK = response => {
	if(!response.ok) throw new Error('Response not OK')
	return response
};
const fetchOK = (...args) => fetch(...args).then(rejectIfNotOK);
const resolveObj = response => response.json();
const resolveBlob = response => response.blob();
const createBlobResolveFunc = (tagName) => (response) => resolveBlob(response)
	.then((blob) => new Promise((resolve) => {
		const objUrl = URL.createObjectURL(blob);
		const obj = document.createElement(tagName);
		obj.src = objUrl;
		setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
		resolve(obj);
	}));
const resolveImage = createBlobResolveFunc('img');
const resolveAudio = response => response.arrayBuffer();
const resolveVideo = createBlobResolveFunc('video');
const resolveText = response => response.text();

// fetchAsset() - fetches and converts the response into the appropriate type of object
var fetchAsset = (path, callback) => {
	const parts = path.split('.');
	const ext = parts.length !== 0 ? parts[parts.length - 1].toLowerCase() : 'json';

	// Select resolver
	let resolve;
	if (ext === 'json') resolve = resolveObj;
	else if (IMAGE_EXTENSIONS.includes(ext)) resolve = resolveImage;
	else if (AUDIO_EXTENSIONS.includes(ext)) resolve = resolveAudio;
	else if (VIDEO_EXTENSIONS.includes(ext)) resolve = resolveVideo;
	else resolve = resolveText;

	if (callback) {
		const wrappedCallback = val => {
			callback(val);
			return val
		};
		return fetchOK(path).then(resolve).then(wrappedCallback).catch(wrappedCallback)
	}

	return fetchOK(path).then(resolve)
};

const _AssetFetcher = new WeakMap();

/** A class used to fetch assets */
class AssetFetcher extends MixedWith(eventTargetMixin) {
	constructor() {
		super();
		_AssetFetcher.set(this, {
			queuedAssetPaths: new Set()
		});
	}

	/**
	 * Queue an asset to be fetched.
	 *
	 * @param {string} path - File path/url at which the file may be found.
	 * @returns {this} - Returns self for method chaining.
	 */
	queueAsset(path) {
		if (path) _AssetFetcher.get(this).queuedAssetPaths.add(path);
		return this
	}

	/**
	 * Queue assets to be fetched.
	 *
	 * @param {string[]} [paths = []] - File path/url array at which the files may be found.
	 * @returns {this} - Returns self for method chaining.
	 */
	queueAssets(paths = []) {
		paths.forEach(path => this.queueAsset(path));
		return this
	}

	/**
	 * Fetch all queued assets. On each asset fetch, a "fetchProgress" event
	 * will be fired with the current percent complete. (Ex. 0.5 for 50%)
	 *
	 * @returns {Promise<Object[]>} - A promise that resolves when all assets have been fetched.
	 */
	fetchAssets() {
		const paths = [..._AssetFetcher.get(this).queuedAssetPaths];

		let count = 0;
		const dispatchProgressEvent = () => {
			count += 1;
			this.dispatchEvent(new FetchProgressEvent('fetchProgress', { progress: count / paths.length }));
		};
		return Promise.all(
			paths.map(path => fetchAsset(path, dispatchProgressEvent).then(asset => [ path, asset ]))
		)
	}

	/**
	 * Fetch an asset, bypassing the queue.
	 *
	 * @param {string} path - File path/url at which the file may be found.
	 * @returns {Promise<*>} - Returns a promise that resolves to the fetched resource.
	 */
	fetch(path) {
		return fetchAsset(path)
	}
}

const defaultData = { tilesets: [], properties: {}, tileWidth: 0, tileHeight: 0 };
class TiledMap {
	constructor() {
		// New object, falling back to defaults
		this.data = Object.assign({}, defaultData);
		this.resources = new Map();
		this.basePath = '';
		this.tileTypes = [];
		this.layers = new Map();
		this.layerCanvases = new Map();
		this.objects = {};
		this.startTime = null;
	}

	get tileWidth() {
		return this.data.tilewidth
	}

	get tileHeight() {
		return this.data.tileheight
	}

	getObjects() {
		return this.objects
	}

	decorate(data) {
		this.data = Object.assign({}, defaultData, data);
		return this
	}

	setBasePath(basePath) {
		this.basePath = basePath;
		return this
	}

	getRootRelativePath(path) {
		return (new URL(path, this.basePath)).href
	}

	getResourcePaths() {
		const { tilesets, properties } = this.data;

		// Get tile image paths
		const paths = tilesets.map(({ image }) => image);

		// Get BGM paths
		if (properties.bgm) paths.push(properties.bgm);

		return this.basePath ?
			paths.map(path => this.getRootRelativePath(path))
			: paths
	}

	getResource(path) {
		path = new URL(path, this.basePath).href;
		return this.resources.get(path)
	}

	setResources(resources) {
		this.resources = new Map(resources);

		// Post-loading setup
		const { data } = this;
		this.initTileTypes(data.tilesets);
		this.initLayers(data.layers);
		this.initLayerCanvases(this.tileWidth, this.tileHeight, this.tileTypes, this.layers);

		return this
	}

	initTileTypes(tilesets) {
		tilesets.forEach((tileset) => {
			const image = this.getResource(tileset.image);
			const yStep = tileset.tileheight + tileset.spacing;
			const xStep = tileset.tilewidth + tileset.spacing;
			const pixelsAcross = tileset.columns * tileset.tilewidth;

			// Each loop, x and y represent the top left corner of each tile in the set
			for(let y = tileset.margin; this.tileTypes.length < tileset.tilecount; y += yStep) {
				for(let x = tileset.margin; x < pixelsAcross; x += xStep) {

					// Create base tile type object
					const obj = { image, x, y, width: tileset.tilewidth, height: tileset.tileheight };

					// Add animation data to the tile type object (if any)
					const extraData = tileset.tiles && tileset.tiles[this.tileTypes.length];
					if(extraData && extraData.animation) {
						let rangeStart = 0;
						let rangeEnd = 0;
						obj.animation = extraData.animation.map((step) => {
							rangeStart = rangeEnd;
							rangeEnd = rangeStart + step.duration;
							return { rangeStart, rangeEnd, tileid: step.tileid }
						});
					}

					// Add tile type to list
					this.tileTypes.push(obj);
				}
			}
		});
	}

	initLayers(layers) {

		// Handle tile layers
		const tileLayers = layers.filter(layer => layer.data && layer.type === 'tilelayer');
		this.layers = new Map(tileLayers.map((layer) => {
			const data = createArray(layer.width, layer.height);
			let idx = 0;

			for(let y = 0, l = layer.height; y < l; y++) {
				for(let x = 0, l2 = layer.width; x < l2; x++) {
					data[x][y] = layer.data[idx++];
				}
			}

			return [ layer.name, { width: layer.width, height: layer.height, data } ]
		}));

		// Handle object layers
		const objectLayers = layers.filter(layer => layer.type === 'objectgroup');
		this.objects = objectLayers.reduce((objects, layer) => {
			layer.objects.forEach((objectData) => {

				// Grab base object properties
				const object = {
					width: objectData.width,
					height: objectData.height,
					x: objectData.x,
					y: objectData.y,
					type: objectData.type || layer.name,
					name: objectData.name
				};

				// Merge properties found in objectData.properties into base object
				Object.assign(object, objectData.properties);
				objects.push(object);
			});
			return objects
		}, []);
	}

	initLayerCanvases(tileWidth, tileHeight, tileTypes, layers) {
		layers = [...layers]; // convert to array
		this.layerCanvases = new Map(
			layers.map(([layerName, layer]) => {
				let canvas = document.createElement('canvas');
				canvas.width = layer.width * tileWidth;
				canvas.height = layer.height * tileHeight;
				let context = canvas.getContext('2d');

				if (layer && layer.data) {
					for (let y = 0, l = layer.height; y < l; y++) {
						for (let x = 0, l2 = layer.width; x < l2; x++) {
							const tileType = tileTypes[layer.data[x][y] - 1];
							const posX = x * tileWidth;
							const posY = y * tileHeight;

							if (tileType && tileType.animation === undefined) {
								context.drawImage(tileType.image,
									tileType.x, tileType.y, tileType.width, tileType.height,
									posX, posY, tileWidth, tileHeight
								);
							}

						}
					}
				}

				return [ layerName, canvas ]
			})
		);
	}

	renderAnimatedTiles(context, layerName, time, tileX1, tileY1, tileX2, tileY2, dX, dY, scaleW, scaleH) {
		const layer = this.layers.get(layerName);

		if (!layer) return

		// Adjust values to ensure we are operating within the layer boundaries
		tileY1 = Math.max(tileY1, 0);
		tileY2 = Math.min(tileY2, layer.height);
		tileX1 = Math.max(tileX1, 0);
		tileX2 = Math.min(tileX2, layer.width);

		// Loop through each tile within the area specified in tileX1, Y1, X2, Y2
		for (let y = tileY1; y < tileY2; y++) {
			for (let x = tileX1; x < tileX2; x++) {
				const tileIdx = layer.data[x][y];
				if (tileIdx === 0) continue

				const posX = (x * this.tileWidth) + dX;
				const posY = (y * this.tileHeight) + dY;

				// If the tile is animated, determine the tile type to be used at this point in time
				let tileType = this.tileTypes[tileIdx - 1];
				if (tileType.animation) {
					const wrappedTime = time % tileType.animation[tileType.animation.length - 1].rangeEnd;
					for (let step of tileType.animation) {
						if (wrappedTime > step.rangeStart && wrappedTime < step.rangeEnd) {
							tileType = this.tileTypes[step.tileid];
							break
						}
					}

					context.drawImage(
						tileType.img,
						tileType.x,
						tileType.y,
						tileType.width,
						tileType.height,
						posX,
						posY,
						this.tileWidth * scaleW,
						this.tileHeight * scaleH
					);

				}
			}
		}

	}

	render(context, layerName, timestamp, sX, sY, sW, sH, dX, dY, dW, dH) {
		// NOTE: May need to use context.getImageData() and .putImageData() for transparency support instead of .drawImage()
		// ...I tried these but they created memory leaks when debugging with Chrome

		this.startTime = this.startTime || timestamp;

		const canvas = this.layerCanvases.get(layerName);

		if (canvas) {

			// Draw static parts of layer
			context.drawImage(canvas, sX, sY, sW, sH, dX, dY, dW, dH);

			// Draw animated parts of layer
			this.renderAnimatedTiles(
				context,
				layerName,
				(timestamp - this.startTime),         // get time since first render (for animation)
				parseInt(sX / this.tileWidth),        // calc x1 in tile units
				parseInt(sY / this.tileHeight),       // calc y1 in tile units
				parseInt(sX + sW) / this.tileWidth,   // calc x2 in tile units
				parseInt(sY + sH) / this.tileHeight,  // calc y2 in tile units
				dX, dY, dW / sW, dH / sH              // destination x, y, scaling-x, scaling-y
			);

		}

	}
}

const keyboardInputs = Symbol();

const wasPressed = Symbol();
const held = Symbol();

class DigitalInput {
	constructor() {
		this[wasPressed] = false;
		this.held = false;
	}

	get held() { return this[held] }
	set held(val) {
		this[held] = val;

		if (val && this[wasPressed]) {
			this[wasPressed] = false;
		}
	}

	get pressed() {
		let held = this.held;
		let pressed = !this[wasPressed] && held;
		this[wasPressed] = held;

		return pressed
	}
}

/* Can probably use something along these lines for analog inputs:
const wasPressed = Symbol()
class AnalogInput {
	constructor() {
		this.value = 0 (may be positive OR negative values)
		this.idleValue = 0
		this.idleThreshold = 20
		this.min = -500
		this.max = 500
		this[wasPressed] = false
	}

	get pressed() {
		let held = this.held
		let pressed = !this[wasPressed] && held
		this[wasPressed] = held

		return pressed
	}

	get held() {
		let idleMin = this.idleValue - this.idleThreshold
		let idleMax = this.idleValue + this.idleThreshold

		return (this.value < idleMin || this.value > idleMax)
	}

	get idle() {
		let idleMin = this.idleValue - this.idleThreshold
		let idleMax = this.idleValue + this.idleThreshold

		return (this.value >= idleMin && this.value <= idleMax)
	}

}
*/

/** Class representing an example input manager. Not intended to be part of final game engine.
 */
class InputManager {
	constructor() {
		this[keyboardInputs] = {
			[32]: new DigitalInput(), // Space Key
			[37]: new DigitalInput(), // Left Arrow
			[39]: new DigitalInput(), // Right Arrow

			[214]: new DigitalInput(), // GamepadLeftThumbstickLeft
			[205]: new DigitalInput(), // GamepadDPadLeft
			[213]: new DigitalInput(), // GamepadLeftThumbstickRight
			[206]: new DigitalInput(), // GamepadDPadRight
			[195]: new DigitalInput()  // A Button
		};

		window.addEventListener('keydown', (event) => {
			let key = this[keyboardInputs][event.keyCode];
			if(key) { key.held = true; }
		}, false);

		window.addEventListener('keyup', (event) => {
			let key = this[keyboardInputs][event.keyCode];
			if(key) { key.held = false; }
		}, false);
	}

	get jumpButton() {
		let key = this[keyboardInputs][195];
		if(key.held) { return key }

		return this[keyboardInputs][32]
	}

	get leftButton() {
		let key = this[keyboardInputs][205];
		if(key.held) { return key }

		key = this[keyboardInputs][214];
		if(key.held) { return key }

		return this[keyboardInputs][37]
	}

	get rightButton() {
		let key = this[keyboardInputs][206];
		if(key.held) { return key }

		key = this[keyboardInputs][213];
		if (key.held) { return key }

		return this[keyboardInputs][39]
	}
}

/**
 * Game module.
 * @module Game
 */

/** Object representing the module namespace. */
const namespace = {
	createCollection(...args) {
		return new Collection(...args)
	},

	createIndexedCollection(...args) {
		return new IndexedCollection(...args)
	},

	createEvent(type, options) {
		return new GameEvent(type, options)
	},

	createFactory() {
		return new Factory()
	},

	createEntity() {
		return new Entity()
	},

	createComponent(dataObj) {
		return new Component(dataObj)
	},

	createSystem() {
		return new System()
	},

	createScene() {
		return new Scene()
	},

	createGame() {
		return new Game()
	},

	createAssetFetcher() {
		return new AssetFetcher()
	},

	createTiledMap() {
		return new TiledMap()
	},

	createInputManager() {
		return new InputManager()
	},

	createEntityFactory() {
		return (new Factory()).use((constructorName, data = {}) =>
			({
				componentFactory: this.createComponentFactory(),
				entity: new Entity(),
				data,
			})
		)
	},

	createComponentFactory() {
		return (new Factory()).use((constructorName, data = {}) =>
			({
				component: new Component(),
				data,
			})
		)
	},

	createSystemFactory() {
		return (new AsyncFactory()).use(async (constructorName, data = {}) =>
			({
				system: new System(),
				data,
			})
		)
	},

	createSceneFactory() {
		return (new AsyncFactory()).use(async (constructorName, data = {}) =>
			({
				entityFactory: this.createEntityFactory(),
				systemFactory: this.createSystemFactory(),
				scene: new Scene(),
				data,
			})
		)
	},
};

const MAX_SPEED_X = 2.2;
const MAX_SPEED_Y = 4.1;
const GRAVITY = 0.3;
const FRICTION = 0.08;

// TODO: Move this to Game?
const indexComponents = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	);

var createPhysicsSystem = async (systemName, { system }) => system
	.addEventListener('mounted', ({ entities }) => {
		indexComponents(entities, ['staticPhysicsBody', 'physicsBody']);
	})

	.addEventListener('update', ({ entities, deltaTime }) => {
		const staticComponents = entities.getIndexed('staticPhysicsBody');
		const nonstaticComponents = entities.getIndexed('physicsBody');

		// For every nonstatic physics body, check for static physics body collision
		for (const c of nonstaticComponents) {
			const state = c.getParentEntity().getComponent('state');
			const wasGrounded = state.grounded;
			state.grounded = false; // Only set to true after a collision is detected

			c.accY = GRAVITY; // Add gravity (limit to 10)

			// Add acceleration to "speed"
			const time = deltaTime / 10;
			if (time !== 0) {
				c.spdX = c.spdX + (c.accX / time);
				c.spdY = c.spdY + (c.accY / time);
			}

			// Limit speed
			c.spdX = c.spdX >= 0 ? Math.min(c.spdX, MAX_SPEED_X) : Math.max(c.spdX, MAX_SPEED_X * -1);
			c.spdY = c.spdY >= 0 ? Math.min(c.spdY, MAX_SPEED_Y) : Math.max(c.spdY, MAX_SPEED_Y * -1);

			// Use speed to change position
			c.x += c.spdX;
			c.y += c.spdY;

			for (const c2 of staticComponents) {
				const halfWidthSum = c.halfWidth + c2.halfWidth;
				const halfHeightSum = c.halfHeight + c2.halfHeight;
				const deltaX = c2.midPointX - c.midPointX;
				const deltaY = c2.midPointY - c.midPointY;
				const absDeltaX = Math.abs(deltaX);
				const absDeltaY = Math.abs(deltaY);

				// Collision Detection
				if (
					(halfWidthSum > absDeltaX) &&
					(halfHeightSum > absDeltaY)
				) {
					let projectionY = halfHeightSum - absDeltaY; // Value used to correct positioning
					let projectionX = halfWidthSum - absDeltaX;  // Value used to correct positioning

					// Use the lesser of the two projection values
					if (projectionY < projectionX) {
						if (deltaY > 0) projectionY *= -1;

						c.y += projectionY; // Apply "projection vector" to rect1
						if (c.spdY > 0 && deltaY > 0) c.spdY = 0;
						if (c.spdY < 0 && deltaY < 0) c.spdY = 0;

						if (projectionY < 0) {
							if (!wasGrounded) { state.groundHit = true; } else { state.groundHit = false; }
							state.grounded = true;
							if (c.spdX > 0) {
								c.spdX = Math.max(c.spdX - (FRICTION / time), 0);
							} else {
								c.spdX = Math.min(c.spdX + (FRICTION / time), 0);
							}
						}
					} else {
						if (deltaX > 0) projectionX *= -1;

						c.x += projectionX; // Apply "projection vector" to rect1
						if (c.spdX > 0 && deltaX > 0) c.spdX = 0;
						if (c.spdX < 0 && deltaX < 0) c.spdX = 0;
					}
				}
			}
		}
	});

// TODO: Move this to Game?
const indexComponents$1 = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	);

var createRenderSystem = async (systemName, { system, tiledMap, entityFactory }) => {
	const canvas = document.getElementById('game');
	const context = canvas && canvas.getContext('2d');

	const frames = [
		{
			img: 'img/monster.png',
			x: 0,
			y: 0,
			width: 14,
			height: 26
		}, {
			img: 'img/tankSheet.png',
			x: 0,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 26,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 52,
			y: 0,
			width: 26,
			height: 18
		}, {
			img: 'img/tankSheet.png',
			x: 78,
			y: 0,
			width: 26,
			height: 18
		}
	];
	let images = {};
	let flippedImages = {};

	context.mozImageSmoothingEnabled = false;
	context.msImageSmoothingEnabled = false;
	context.imageSmoothingEnabled = false;

	return system

		// Queue assets
		.addEventListener('load', async ({ assetFetcher }) => {
			assetFetcher.queueAssets([ 'img/monster.png', 'img/tankSheet.png' ]);
		})

		// Gather downloaded assets
		.addEventListener('loaded', async ({ assets, currentTarget }) => {
			images = {
				'img/monster.png': assets.get('img/monster.png'),
				'img/tankSheet.png': assets.get('img/tankSheet.png'),
			};

			// Images must be flipped and stored in flippedImages under same key
			for (let key in images) {
				let canvas = document.createElement('canvas');
				let ctx = canvas.getContext('2d');
				let image = images[key];

				canvas.width = image.width;
				canvas.height = image.height;

				ctx.scale(-1, 1); // flip
				ctx.drawImage(image, (-1 * canvas.width), 0); // draw flipped

				flippedImages[key] = canvas;
			}

			currentTarget.addEntity(entityFactory.create('Camera', {
				x: 0,
				y: 0,
				width: canvas.width,
				height: canvas.height,
				mapX: 300,
				mapY: 820,
				mapWidth: parseInt(canvas.width / 8),
				mapHeight: parseInt(canvas.height / 8),
				following: null
			}));
			/*
			currentTarget.addEntity('Camera', {
				x: canvas.width / 2,
				y: 0,
				width: canvas.width / 2,
				height: canvas.height,
				mapX: 100,
				mapY: 920,
				mapWidth: canvas.width / 2,
				mapHeight: canvas.height / 2
			})
			*/
		})

		// Set up indexes
		.addEventListener('mounted', ({ entities }) => {
			indexComponents$1(entities, [ 'camera', 'sprite' ]);
			entities.setIndex('player', (entity) => {
				const comp = entity.getComponent('being');
				return comp.type !== 'Player' ? undefined : entity
			});
		})

		// Handle each update
		.addEventListener('update', ({ entities, timestamp }) => {
			context.clearRect(0, 0, canvas.width, canvas.height);

			const [ defaultPlayerEntity ] = entities.getIndexed('player');

			// Get each camera
			const cameraComponents = entities.getIndexed('camera');
			for (const c of cameraComponents) {

				// Set up drawing layers
				const layers = {
					Background: { sprites: [] },
					Platforms:  { sprites: [] },
					Player:     { sprites: [] }
				};

				// Force camera to match followed entity
				if (!c.following) {
					c.following = defaultPlayerEntity;
				}

				if (c.following) {
					const sprite = c.following.getComponent('sprite');
					const frame = frames[sprite.frame];
					c.mapX = sprite.x + (frame.width / 2) - (c.mapWidth / 2);

					const threshold = (c.mapHeight / 4);
					if (sprite.y < c.mapY + threshold) {
						c.mapY = sprite.y - threshold;
					} else if ((sprite.y + sprite.height) > c.mapY + c.mapHeight - threshold) {
						c.mapY = sprite.y + sprite.height - (c.mapHeight - threshold);
					}
				}

				// Get entities with a sprite component and add to the appropriate layer for rendering
				const spriteComponents = entities.getIndexed('sprite');
				for (const sprite of spriteComponents) {
					const frame = frames[sprite.frame];
					const img = !sprite.flipped ? images[frame.img] : flippedImages[frame.img];

					sprite.width = frame.width;
					sprite.height = frame.height;

					const obj = {
						img: img,
						x: sprite.x - c.mapX,
						y: sprite.y - c.mapY,
						width: frame.width,
						height: frame.height,
						sx: frame.x,
						sy: frame.y
					};

					if (
						obj.x + obj.width > 0 && obj.x < c.mapWidth &&
						obj.y + obj.height > 0 && obj.y < c.mapHeight
					) {
						layers[sprite.layer].sprites.push(obj);
					}
				}

				// Draw each map layer (include all sprites for that layer)
				for (const layerKey in layers) {
					const layer = layers[layerKey];

					const mapX = Math.round(c.mapX);
					const mapY = Math.round(c.mapY);
					const mapWidth = parseInt(c.mapWidth);
					const mapHeight = parseInt(c.mapHeight);
					const x = parseInt(c.x);
					const y = parseInt(c.y);
					const width = parseInt(c.width);
					const height = parseInt(c.height);

					tiledMap.render(context, layerKey, timestamp, mapX, mapY, mapWidth, mapHeight, x, y, width, height);

					// Draw each sprite to a temporary canvas
					if (layer.sprites.length > 0) {
						const tempCanvas = document.createElement('canvas');
						tempCanvas.width = mapWidth;
						tempCanvas.height = mapHeight;
						const tempCtx = tempCanvas.getContext('2d');
						for(let sprite of layer.sprites) {
							tempCtx.drawImage(sprite.img, parseInt(sprite.sx), parseInt(sprite.sy), parseInt(sprite.width), parseInt(sprite.height), Math.round(sprite.x), Math.round(sprite.y), parseInt(sprite.width), parseInt(sprite.height));
						}

						// Draw the temporary canvas to the main canvas (position and fit to camera bounds)
						context.drawImage(tempCanvas, 0, 0, mapWidth, mapHeight, x, y, width, height);
					}
				}
			}
		})
};

// TimeOffset class
const _time = Symbol('_time');
class TimeOffset {
	constructor(timeStr, millisecondsMode) {
		this[_time] = timeStr;
		this.msMode = millisecondsMode || false;
	}
	valueOf() {
		let val = 0;
		let arr = this[_time].split(':');
		arr.reverse();

		if(arr[3]) { throw Error('Bad TimeOffset string') }
		if(arr[2]) { val += (+arr[2] * 3600000); }
		if(arr[1]) { val += (+arr[1] * 60000); }
		if(arr[0]) { val += (+arr[0] * 1000); }

		if(!this.msMode) return val / 1000

		return val
	}
	toBoolean() {
		return !!this.valueOf()
	}
}

// TODO: Move this to Game?
const indexComponents$2 = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	);

var createSoundSystem = async (systemName, { system, tiledMap }) => {
	const context = new AudioContext();
	const tracks = {};
	const bgmLoopTarget = new TimeOffset(tiledMap.bgmLoopTarget);
	let bgmPlay = !!tiledMap.bgm;

	const playSound = (src, startAt, loopAt, callback) => {
		const sound = tracks[src];
		const source = context.createBufferSource();

		source.buffer = sound;
		if (callback) source.onended = callback;
		let gainNode = context.createGain();
		gainNode.gain.value = 1;

		source.connect(gainNode);
		gainNode.connect(context.destination);

		if (loopAt) {
			source.loopStart = loopAt % sound.duration;
			source.loopEnd = sound.duration;
			source.loop = !!loopAt;
		}

		source.start(context.currentTime + 0.05, startAt || 0); // first param is "time before playing" (in seconds)

		return {
			gainNode: gainNode
		}
	};

	return system

		.addEventListener('load', async ({ assetFetcher }) => {
			assetFetcher.queueAsset('sfx/sfx1.wav');
		})

		.addEventListener('loaded', async ({ assets }) => {
			const asset = assets.get('sfx/sfx1.wav');
			tracks['sfx/sfx1.wav'] = await context.decodeAudioData(asset);
		})

		.addEventListener('mounted', ({ entities }) => {
			indexComponents$2(entities, ['camera', 'sound']);
		})

		.addEventListener('update', ({ entities }) => {

			// Start the background music
			if (bgmPlay) {
				bgmPlay = false;
				playSound('bgm', 0, bgmLoopTarget);
			}

			const soundComponents = entities.getIndexed('sound');
			for (const c of soundComponents) {
				const soundEntity = c.getParentEntity();
				const state = soundEntity.getComponent('state');

				// Sound conditions
				if (soundEntity.hasComponent('being')) {
					const type = soundEntity.getComponent('being').type;
					if (type === 'Player' && state.groundHit) {
						c.src = 'sfx/sfx1.wav';
						c.play = true;
					}
				}

				// Determine distance from soundEntity to cameraCenter
				let distanceToCamCenter = 0;
				let radius = 0;
				const cameraComponents = entities.getIndexed('camera');
				for (const cam of cameraComponents) {
					const a = (c.x - cam.mapCenterX);
					const b = (c.y - cam.mapCenterY);
					const currentDist = Math.sqrt((a*a) + (b*b));
					const currentRad = Math.min(cam.mapHalfWidth, cam.mapHalfHeight);

					distanceToCamCenter = !distanceToCamCenter ?
						currentDist :
						Math.min(distanceToCamCenter, currentDist);

					radius = !radius ?
						currentRad :
						Math.min(radius, currentRad);
				}

				// Play
				if (c.play && c.src) {
					c.gainNode = playSound(c.src, 0, 0).gainNode;
					c.play = false;
				}

				// Adjust the sound gain depending on the volume setting and the sound distance...
				if (c.gainNode) {
					if (distanceToCamCenter <= radius) {
						c.gainNode.gain.value = c.volume;
					} else if (distanceToCamCenter - radius >= radius * 2) {
						c.gainNode.gain.value = 0;
					} else {
						const calc = ((distanceToCamCenter - radius) / (radius * 2)) * c.volume;
						c.gainNode.gain.value = calc;
					}
				}

			}
		})
};

// TODO: Move this to Game?
const indexComponents$3 = (entities, compNames = []) =>
	compNames.forEach(compName =>
		entities.setIndex(compName, entity => entity.getComponent(compName))
	);

var createSpawnSystem = async (systemName, { system, entityFactory }) => system
	.addEventListener('mounted', ({ entities }) => {
		indexComponents$3(entities, ['spawner', 'spawned']);
	})
	.addEventListener('update', ({ entities, currentTarget }) => {

		// Get all "spawner" components
		const spawnerComponents = entities.getIndexed('spawner');

		// Get all "spawned" components
		const spawnedComponents = entities.getIndexed('spawned');

		// Filter down to only the spawners that are ready to spawn (have no entities left)
		const readySpawnerComponents = spawnerComponents.reject(spawnerComponent =>
			spawnedComponents.some(spawnedComponent =>
				spawnedComponent.spawnerSource === spawnerComponent.name
			)
		);

		// Create a new spawned entity for each "ready" spawner
		readySpawnerComponents.forEach(spawnerComp =>
			currentTarget.addEntity(entityFactory.create(spawnerComp.entityType, {
				x: spawnerComp.x,
				y: spawnerComp.y,
				width: 0,
				height: 0,
				spawnerSource: spawnerComp.name
			}))
		);
	});

var createUpdateSystem = async (systemName, { system, inputManager }) => system
	.addEventListener('mounted', ({ entities }) => {
		entities.setIndex('player', (entity) => {
			const comp = entity.getComponent('being');
			return comp && comp.type === 'Player' ? entity : undefined
		});
	})

	.addEventListener('update', ({ entities }) => {
		entities.getIndexed('player').forEach((playerEntity) => {
			const c = playerEntity.getComponent('physicsBody');
			const state = playerEntity.getComponent('state');
			const sprite = playerEntity.getComponent('sprite');

			if (inputManager.leftButton.held) {
				c.accX = -0.2;
				state.state = 'driving';
				sprite.flipped = true;
			} else if (inputManager.rightButton.held) {
				c.accX = 0.2;
				state.state = 'driving';
				sprite.flipped = false;
			} else {
				c.accX = 0;
				if (c.spdX === 0) state.state = 'idle';
			}

			if (state.state === 'driving') {
				sprite.frame = (parseInt(c.x / 6) % 4) + 1;
			}

			if (inputManager.jumpButton.pressed && state.grounded) { c.spdY = -100; }
		});
	});

var buildSystemFactory = (systemFactory) => systemFactory
	.set('physics', createPhysicsSystem)
	.set('render', createRenderSystem)
	.set('sound', createSoundSystem)
	.set('spawn', createSpawnSystem)
	.set('update', createUpdateSystem);

var createCamera = (componentType, { component, data } = {}) =>
	component.decorate({
		x: data.x,
		y: data.y,
		width: data.width,
		height: data.height,
		mapX: data.mapX,
		mapY: data.mapY,
		mapWidth: data.mapWidth,
		mapHeight: data.mapHeight,
		get mapHalfWidth() { return this.mapWidth / 2 },
		get mapHalfHeight() { return this.mapHeight / 2 },
		get mapCenterX() { return this.mapX + this.mapHalfWidth },
		get mapCenterY() { return this.mapY + this.mapHalfHeight },
		following: data.following
	});

var createStaticPhysicsBody = (componentType, { component, data: {
	x,
	y,
	width,
	height
} } = {}) =>
	component.decorate({
		x: x,
		y: y,
		width: width,
		height: height,
		halfWidth: width / 2,
		halfHeight: height / 2,
		midPointX: x + (width / 2),
		midPointY: y + (height / 2)
	});

var createSpawner = (componentType, { component, data: { type = 'Monster', name, x, y } } = {}) =>
	component.decorate({ entityType: type, name, x, y, });

var createSpawned = (componentType, { component, data: { spawnerSource } } = {}) =>
	component.decorate({ spawnerSource });

const _x = Symbol('_x');
const _y = Symbol('_y');
const _width = Symbol('_width');
const _height = Symbol('_height');

var createSprite = (componentType, { component, data: {
	x = 0,
	y = 0,
	width = 0,
	height = 0,
	frame,
	layer
} } = { data: {} }) => {
	const obj = {
		get x() {
			return this[_x]
		},
		set x(val) {
			this[_x] = val;
			this.midPointX = val + this.halfWidth;
		},

		get y() {
			return this[_y]
		},
		set y(val) {
			this[_y] = val;
			this.midPointY = val + this.halfHeight;
		},

		get width() {
			return this[_width]
		},
		set width(val) {
			this[_width] = val;
			this.halfWidth = val / 2;
			this.midPointX = this.x + this.halfWidth;
		},

		get height() {
			return this[_height]
		},
		set height(val) {
			this[_height] = val;
			this.halfHeight = val / 2;
			this.midPointY = this.y + this.halfHeight;
		}
	};
	obj.x = x;
	obj.y = y;
	obj.width = width;
	obj.height = height;
	
	Object.assign(obj, {
		frame,
		layer,
		flipped: false,
	});
	return component.decorate(obj)
};

const _entity = Symbol('_x');
const _spriteComp = Symbol('_x');

var createSpritePhysics = (componentType, { component, data: { entity } } = {}) =>
	component.decorate({
		[_entity]: entity,
		accX: 0,
		accY: 0,
		spdX: 0,
		spdY: 0,
		get [_spriteComp]() { return this[_entity].getComponent('sprite') },
		get x() { return this[_spriteComp].x },
		set x(val) { this[_spriteComp].x = val; },
		get y() { return this[_spriteComp].y },
		set y(val) { this[_spriteComp].y = val; },
		get width() { return this[_spriteComp].width },
		set width(val) { this[_spriteComp].width = val; },
		get height() { return this[_spriteComp].height },
		set height(val) { this[_spriteComp].height = val; },
		get midPointX() { return this[_spriteComp].midPointX },
		set midPointX(val) { this[_spriteComp].midPointX = val; },
		get midPointY() { return this[_spriteComp].midPointY },
		set midPointY(val) { this[_spriteComp].midPointY = val; },
		get halfWidth() { return this[_spriteComp].halfWidth },
		set halfWidth(val) { this[_spriteComp].halfWidth = val; },
		get halfHeight() { return this[_spriteComp].halfHeight },
		set halfHeight(val) { this[_spriteComp].halfHeight = val; }
	});

const _entity$1 = Symbol('_entity');
const _spriteComp$1 = Symbol('_spriteComp');
const _x$1 = Symbol('_x');
const _y$1 = Symbol('_y');
const _followSprite = Symbol('_followSprite');
const gainNodeMap = new WeakMap();

var createSpriteSound = (componentType, { component, data } = {}) =>
	component.decorate({
		[_entity$1]: data.entity,
		src: data.src,
		play: false,
		volume: 1,
		[_followSprite]: true,
		get [_spriteComp$1]() { return this[_entity$1].getComponent('sprite') },
		get followSprite() { return this[_followSprite] },
		set followSprite(val) {
			if(this[_followSprite] && !val) {
				this.x = this[_spriteComp$1].midPointX;
				this.y = this[_spriteComp$1].midPointY;
			}
			this[_followSprite] = val;
		},
		get x() { return this.followSprite ? this[_spriteComp$1].midPointX : this[_x$1] },
		set x(val) { this[_x$1] = val; },
		get y() { return this.followSprite ? this[_spriteComp$1].midPointY : this[_y$1] },
		set y(val) { this[_y$1] = val; },
		set gainNode(val) {
			gainNodeMap.set(this, val);
		},
		get gainNode() {
			return gainNodeMap.get(this)
		}
	});

var createBeing = (componentType, { component, data: { type } } = {}) =>
	component.decorate({ type });

const _state = Symbol('_state');

var createState = (componentType, { component, data: { initialState } } = {}) =>
	component.decorate({
		[_state]: initialState,
		lastState: null,
		lastUpdate: null,
		grounded: false,
		groundHit: false,
		get state() {
			return this[_state]
		},
		set state(val) {
			this.lastState = this[_state];
			this[_state] = val;
			this.lastUpdate = window.performance.now();
		}
	});

var buildComponentFactory = (componentFactory) => componentFactory
	.set('camera', createCamera)
	.set('staticPhysicsBody', createStaticPhysicsBody)
	.set('spawner', createSpawner)
	.set('spawned', createSpawned)
	.set('sprite', createSprite)
	.set('spritePhysics', createSpritePhysics)
	.set('spriteSound', createSpriteSound)
	.set('being', createBeing)
	.set('state', createState);

var createCamera$1 = (entityType, { componentFactory, entity, data } = {}) =>
	entity.setComponent('camera', componentFactory.create('camera', data));

var createCollision = (entityType, { componentFactory, entity, data } = {}) =>
	entity.setComponent('staticPhysicsBody', componentFactory.create('staticPhysicsBody', data));

var createPlayerSpawner = (entityType, { entity, componentFactory, data }) => {
	data.type = 'Player';
	return entity.setComponent('spawner', componentFactory.create('spawner', data))
};

var createEntitySpawner = (entityType, { entity, componentFactory, data }) => {
	data.type = 'Monster';
	return entity.setComponent('spawner', componentFactory.create('spawner', data))
};

var createPlayerOrMonster = (entityType, { entity, componentFactory, data: { spawnerSource, x, y, width, height } } = {}) =>
	entity
		.setComponent('spawned', componentFactory.create('spawned', { spawnerSource }))
		.setComponent('state', componentFactory.create('state', { initialState: 'idle' }))
		.setComponent('being', componentFactory.create('being', { type: entityType }))
		.setComponent('sprite', componentFactory.create('sprite', {
			x, y, width, height,
			frame: (entityType === 'Player' ? 1 : 0),
			layer: (entityType === 'Player' ? 'Player' : 'Platforms'),
		}))
		.setComponent('physicsBody', componentFactory.create('spritePhysics', { entity }))
		.setComponent('sound', componentFactory.create('spriteSound', { src: null, entity }));

var buildEntityFactory = (entityFactory) => entityFactory
	.use((entityName, obj) => {
		buildComponentFactory(obj.componentFactory);
		return obj
	})
	.set('Camera', createCamera$1)
	.set('Collision', createCollision)
	.set('PlayerSpawner', createPlayerSpawner)
	.set('EntitySpawner', createEntitySpawner)
	.set('Player', createPlayerOrMonster)
	.set('Monster', createPlayerOrMonster);

var createLevel1 = async (sceneName, { scene, systemFactory, entityFactory, tiledMap }) => scene
	.setSystem('spawn', await systemFactory.create('spawn'))
	.setSystem('update', await systemFactory.create('update'))
	.setSystem('physics', await systemFactory.create('physics'))
	.setSystem('render', await systemFactory.create('render'))
	.setSystem('sound', await systemFactory.create('sound'))

	.addEventListener('load', async ({ assetFetcher }) => {

		// Load the necessary resources for the TiledMap instance
		assetFetcher.queueAssets(tiledMap.getResourcePaths());

	})
	.addEventListener('loaded', async ({ currentTarget, assets }) => {

		// Add the resources to the TiledMap instance
		tiledMap.setResources(assets);

		// Filter out the objects that we don't have a constructor for
		const tiledObjects = tiledMap.getObjects().filter(
			object => entityFactory.has(object.type)
		);

		// Add entities from tiledMap instance
		currentTarget.addEntities(tiledObjects.map(
			object => entityFactory.create(object.type, object)
		));
	});

const assetFetcher = namespace.createAssetFetcher();

var createSceneFactory = () => namespace.createSceneFactory()
	.use(async (sceneName, sceneData) => {
		const tiledData = await assetFetcher.fetch(`json/${sceneName}.json`);

		// Create TiledMap instance
		const tiledMap = namespace.createTiledMap()
			.setBasePath((new URL('/', window.location.href)).href)
			.decorate(tiledData);

		buildEntityFactory(sceneData.entityFactory);

		sceneData.systemFactory.use(async (systemName, systemData) => {
			systemData.inputManager = namespace.createInputManager();
			systemData.tiledMap = tiledMap;
			systemData.entityFactory = sceneData.entityFactory;
			return systemData
		});

		buildSystemFactory(sceneData.systemFactory);

		sceneData.tiledMap = tiledMap;

		return sceneData
	})
	.set('level-1', createLevel1);

const sceneFactory = createSceneFactory();(async () => {
	const game = namespace.createGame()
		.setScene('level-1', await sceneFactory.create('level-1'))
		.changeScene('level-1');
	
	await game.load(namespace.createAssetFetcher());
	game.run();
})();

window.game = game;

}());
