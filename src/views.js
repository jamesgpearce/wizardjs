Wizard.views.Base = Backbone.View.extend({
    addChildElement: function (element) {
        this.el.appendChild(element);
        return element;
    },
    addChildView: function (view) {
        view.parentView = this;
        if (!this.childViews) {
            this.childViews = [];
        }
        this.childViews.push(view);
        this.addChildElement(view.render().el);
        return view;
    },
    removeChildViews: function () {
        if (this.childViews) {
            _.each(this.childViews, function (childView) {
                childView.remove();
            });
            this.childViews = [];
        }
    },
    remove: function () {
        this.el.parentNode.removeChild(this.el);
    },
    layoutChildViews: function () {
        this.addChildElement(Fox.makeLayout.apply(Fox, arguments));
    }
});

Wizard.views.ThingFormField = Wizard.views.Base.extend({
    events: {
        "input input": "change"
    },
    initialize: function (options) {
        this.key = options.key;
        this.el.className = this.model.constructor.modelName + "Form" + this.key;
        this.model.bind('change:' + this.key, this.render, this);
    },
    change: function () {
        var update = {};
        update[this.key] = this.el.children[0].value;
        this.model.set(update);
    },
    render: function () {
        if(!this.input) {
            this.el.innerHTML = this.key + ": ";
            this.input = document.createElement('input');
            this.input.setAttribute('type', 'text');
            this.el.appendChild(this.input);
        }
        this.input.setAttribute('value', this.model.get(this.key));
        return this;
    }
});

Wizard.views.ThingForm = Wizard.views.Base.extend({
    initialize: function () {
        this.el.className = this.model.constructor.modelName + 'Form';
        this.model.bind('destroy', this.remove, this);
    },
    render: function () {
        this.removeChildViews();
        _.each(this.model.attributes, function (value, key) {
            this.addChildView(new Wizard.views.ThingFormField({
                model: this.model,
                key: key
            }));
        }, this);
        return this;
    }
});

Wizard.views.AddThing = Wizard.views.Base.extend({
    events: {
        click: "add"
    },
    initialize: function () {
        this.el.className = 'Add' + this.collection.model.modelName + ' Add';
    },
    add: function () {
        this.collection.add();
    },
    render: function () {
        this.el.innerHTML = "Add";
        return this;
    }
});

Wizard.views.ThingItem = Wizard.views.Base.extend({
    events: {
        click: "itemFocus"
    },
    initialize: function () {
        this.el.className = this.model.constructor.modelName + 'Item Item';
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
    },
    render: function () {
        this.el.innerHTML = this.model.get('name');
        return this;
    },
    itemFocus: function () {
        if (!this.selected) {
            this.trigger('itemFocus', this);
        }
    },
    select: function () {
        if (!this.selected) {
            this.el.className += ' selected ';
            this.selected = true;
        }
    },
    deselect: function () {
        if (this.selected) {
            this.el.className = this.el.className.replace(' selected ', '');
            this.selected = false;
        }
    }
});

Wizard.views.ThingsList = Wizard.views.Base.extend({
    initialize: function () {
        this.el.className = this.collection.model.modelName + 'sList List';
        this.collection.bind('add', this.addThingItem, this);
    },
    render: function () {
        this.addChildView(new Wizard.views.AddThing({collection:this.collection}));
        _.each(this.collection, this.addThingItem, this);
        return this;
    },
    addThingItem: function (thing) {
        var thingItem = new Wizard.views.ThingItem({model: thing});
        this.addChildView(thingItem);
        thingItem.bind('itemFocus', this.itemFocus, this);
        return thingItem;
    },
    itemFocus: function (item) {
        this.trigger('itemFocus', this, item);
    },
    select: function (item) {
        item.select();
        this.selected = true;
    },
    deselect: function () {
        if (this.selected) {
            _.each(this.childViews, function (childView) {
                if (childView.deselect) {
                    childView.deselect();
                }
            });
            this.selected = false;
        }
    }
});

Wizard.views.ThingsLists = Wizard.views.Base.extend({
    initialize: function () {
        this.el.className = 'ThingsLists';
        for (var pack in Wizard.packs) {
            pack = Wizard.packs[pack];
            _.extend(pack, {
                models: {},
                collections: {},
                views: {}
            });
            for (var thingName in pack.things) {
                var thingNamePlural = thingName + 's';
                var Thing = pack.models[thingName] = Wizard.models.Thing.extend(
                    pack.things[thingName],
                    {modelName: thingName}
                );
                var Things = pack.collections[thingNamePlural] = Wizard.collections.Things.extend({
                    model: Thing
                });
                var things = pack.collections[thingNamePlural.toLowerCase()] = new Things(
                    [], {localStoreName: thingNamePlural.toLowerCase()}
                );
                pack.views[thingNamePlural.toLowerCase()] = this.addThingsList(things);
            }
        }
    },
    addThingsList: function (things) {
        var thingsList = new Wizard.views.ThingsList({collection: things});
        this.addChildView(thingsList);
        thingsList.bind('itemFocus', this.itemFocus, this);
        return thingsList;
    },
    itemFocus: function (list, item) {
        _.each(this.childViews, function (childView) {
            childView.deselect();
        });
        list.select(item);
        this.trigger('itemFocus', this, list, item);
    }
});

Wizard.views.Main = Wizard.views.Base.extend({
    className: 'Main',
    //todo tabs
    addThingForm: function (thing) {
        var thingForm = new Wizard.views.ThingForm({model: thing});
        this.addChildView(thingForm);
        return thingForm;
    },
    removeThingForm: function () {
        this.removeChildViews();
    }
});

Wizard.views.Toolbar = Wizard.views.Base.extend({
    className: 'Toolbar',
    initialize: function () {
        this.el.innerHTML = "A toolbar";
    }
});


Wizard.views.App = Wizard.views.Base.extend({
    initialize: function () {
        this.el = document.body;
        this.toolbar = Wizard.views.toolbar = new Wizard.views.Toolbar();
        this.thingsLists = Wizard.views.thingsLists = new Wizard.views.ThingsLists();
        this.main = Wizard.views.main = new Wizard.views.Main();
        this.layoutChildViews([
            "+-------------+",
            "|a            |",
            "+----+--------+",
            "|b   |c       |",
            "|    |        |",
            "|    |        |",
            "+----+--------+"
        ], {
            map: {
                a: this.toolbar,
                b: this.thingsLists,
                c: this.main
            }
        });
        this.thingsLists.bind('itemFocus', this.itemFocus, this);

    },
    itemFocus: function (lists, list, item) {
        this.main.removeThingForm();
        this.main.addThingForm(item.model);
    }
});

window.addEventListener('load', function () {
    Wizard.views.app = new Wizard.views.App;
}, false);