Wizard.collections.Things = Backbone.Collection.extend({
    model: Wizard.models.Thing,
    initialize: function() {
        this.localStorage = new Store(this.localStoreName);
    }
});